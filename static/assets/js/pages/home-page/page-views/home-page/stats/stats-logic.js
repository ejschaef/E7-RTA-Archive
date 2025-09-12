import UserManager from "../../../../../e7/user-manager.ts";
import ClientCache from "../../../../../cache-manager.ts";
import { Tables, CardContent } from "../../../../../populate-content.js";
import { ContentManager } from "../../../../../content-manager.ts";
import { RegExps } from "../../../../../e7/regex.ts";
import {
	addPlotlyLineAndMarkWidthListener,
	addStatsListeners,
} from "./stats-listeners.js";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references.ts";
import { CONTEXT } from "../../../home-page-context.ts";
import { Safe } from "../../../../../html-safe.ts";
import {
	getZoom,
	generateRankPlot,
	getSizes,
} from "../../../../../e7/plots.ts";
import { getScrollbarWidth } from "../../../../html-constructor/html-constructor.ts";
import { HOME_PAGE_STATES } from "../../../../page-utilities/page-state-references.ts";
import { HOME_PAGE_FNS } from "../../../../orchestration/page-state-manager.ts";

export function resizeRankPlot() {
	if (!CONTEXT.STATS_PRE_RENDER_COMPLETED) return;
	CONTEXT.IGNORE_RELAYOUT = true;
	setTimeout(() => {
		Plotly.Plots.resize(document.getElementById("rank-plot"));
	}, 20);
}

const filtersAreRelevant = (stats) => {
	return (
		stats.areFiltersApplied &&
		stats.battles.length > Object.values(stats.filteredBattlesObj).length
	);
};

async function populatePlot(stats) {
	const container = Safe.unwrapHtmlElt("rank-plot-container");
	const user = await UserManager.getUser();
	const autoZoom = await ClientCache.get(ClientCache.Keys.AUTO_ZOOM_FLAG);

	const plotDiv = generateRankPlot(
		container,
		stats.battles,
		user,
		stats.numFilters > 0 ? stats.filteredBattlesObj : null
	);

	addPlotlyLineAndMarkWidthListener(plotDiv);
	if (autoZoom && filtersAreRelevant(stats)) {
		// compute the needed zoom level
		const zoom = getZoom(stats.battles, stats.filteredBattlesObj);
		console.log("Zooming to:", zoom);

		const newSizes = getSizes(zoom.endX - zoom.startX);

		const relayoutConfig = {
			"xaxis.range": [zoom.startX, zoom.endX],
			"yaxis.range": [zoom.startY, zoom.endY],
		};

		const markerConfig = {
			"marker.size": [newSizes.markerSize],
			"line.width": [newSizes.lineWidth],
		};
		CONTEXT.IGNORE_RELAYOUT = true;
		Plotly.restyle(plotDiv, markerConfig);
		Plotly.relayout(plotDiv, relayoutConfig);
	}
}

async function populateContent() {
	const user = await UserManager.getUser();

	if (!user) {
		console.log("Skipping populate tables: user not found");
		return;
	}

	console.log("POPULATING DATA PROCESS INITIATED");

	try {
		console.log("Getting Season Details");
		const seasonDetails = await ContentManager.SeasonManager.getSeasonDetails();
		console.log("Got season details:", seasonDetails, typeof seasonDetails);

		console.log("Getting Stats");
		const stats = await ContentManager.ClientCache.getStats();

		//console.log("GOT STATS: ", JSON.stringify(stats));

		console.time("populateTables");
		console.log("POPULATING TABLES, CARD CONTENT, AND PLOTS");
		Tables.populateSeasonDetailsTable("season-details-tbl", seasonDetails);
		Tables.populateHeroStatsTable("player-tbl", stats.playerHeroStats);
		console.log("Populating opponent table");
		Tables.populateHeroStatsTable("opponent-tbl", stats.enemyHeroStats);
		console.log("Populating first pick table");
		Tables.populatePlayerFirstPickTable(
			"first-pick-stats-tbl",
			stats.firstPickStats
		);
		Tables.populatePlayerPrebansTable("preban-stats-tbl", stats.prebanStats);
		Tables.populateServerStatsTable(
			"performance-stats-tbl",
			stats.performanceStats
		);
		if (DOC_ELEMENTS.HOME_PAGE.BATTLE_FILTER_TOGGLE.checked) {
			console.log("POPULATING AS FILTERED BATTLES TABLE");
			Tables.populateFullBattlesTable(
				"battles-tbl",
				Object.values(stats.filteredBattlesObj),
				user
			);
		} else {
			console.log("POPULATING AS FULL BATTLES TABLE");
			Tables.populateFullBattlesTable("battles-tbl", stats.battles, user);
		}
		CardContent.populateGeneralStats(stats.generalStats);
		await populatePlot(stats);
		console.log("FINISHED POPULATING");
		console.timeEnd("populateTables");
	} catch (err) {
		console.error("Error loading data:", err);
	}
}

async function addCodeMirror() {
	CodeMirror.defineMode("filterSyntax", function () {
		return {
			token: function (stream, state) {
				return RegExps.tokenMatch(stream);
			},
		};
	});

	const textarea = document.getElementById("codeArea");

	let editor = CodeMirror.fromTextArea(textarea, {
		mode: "filterSyntax",
		lineNumbers: true,
		theme: "default",
	});

	editor.setSize(null, 185);

	const appliedFilter = await ContentManager.ClientCache.getFilterStr();

	if (appliedFilter) {
		editor.setValue(appliedFilter);
	}

	// Optional: sync changes back to textarea if needed
	editor.on("change", () => {
		editor.save(); // Updates the hidden textarea for form submit
	});

	// Show the editor after it's initialized
	textarea.classList.remove("codemirror-hidden");
	CONTEXT.CODE_MIRROR_EDITOR = editor;
	return editor;
}

async function preFirstRenderLogic() {
	await populateContent();
}

async function postFirstRenderLogic() {
	const editor = CONTEXT.CODE_MIRROR_EDITOR;
	if (!editor) {
		console.error("Editor not found in CONTEXT");
		return;
	}
	console.log("Refreshing editor");
	editor.refresh();
}

async function runLogic(stateDispatcher) {
	const autoZoomCheckbox = DOC_ELEMENTS.HOME_PAGE.AUTO_ZOOM_FLAG;
	const checked = await ContentManager.ClientCache.get(
		ContentManager.ClientCache.Keys.AUTO_ZOOM_FLAG
	);
	autoZoomCheckbox.checked = checked;
	const stats = await ContentManager.ClientCache.getStats();

	const filterBattleTableCheckbox = DOC_ELEMENTS.HOME_PAGE.BATTLE_FILTER_TOGGLE;
	if (filterBattleTableCheckbox.checked) {
		Tables.replaceBattleData(Object.values(stats.filteredBattlesObj));
	}

	const user = await UserManager.getUser();

	if (!user) {
		console.log("User not found sending to select data quitely");
		stateDispatcher(HOME_PAGE_STATES.SELECT_DATA); // switch view with no error; should only happen if user is reloading and state cache did not expire while user info did
		return;
	} else {
		console.log("User found:", user);
	}

	DOC_ELEMENTS.HOME_PAGE.CSV_FILE.value = "";
	DOC_ELEMENTS.HOME_PAGE.USER_QUERY_FORM_NAME.value = "";
}

function addScrollTableOffsets() {
	const tables = [
		DOC_ELEMENTS.HOME_PAGE.FIRST_PICK_STATS_TBL,
		DOC_ELEMENTS.HOME_PAGE.PREBAN_STATS_TBL,
		DOC_ELEMENTS.HOME_PAGE.SEASON_DETAILS_TBL,
	];
	const scrollWidth = getScrollbarWidth();
	for (let tbl of tables) {
		const thead = tbl.querySelector("thead");
		if (!thead) {
			continue;
		}
		thead.style.setProperty("padding-right", `${scrollWidth}px`);
	}
}

async function initialize(stateDispatcher) {
	addScrollTableOffsets();
	const editor = await addCodeMirror();
	await addStatsListeners(editor, stateDispatcher);
}

async function handleDispatch(stateDispatcher) {
	if (!CONTEXT.STATS_PRE_RENDER_COMPLETED) {
		if (!CONTEXT.IS_FIRST_RENDER) {
			await HOME_PAGE_FNS.homePageSetView(HOME_PAGE_STATES.LOAD_DATA); // show loading screen while populating content
		}
		console.log("Running stats pre render logic");
		await preFirstRenderLogic(stateDispatcher); // if stats page is accessed from outside home page, must populate content, otherwise load data logic will
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
		console.log("Completed stats pre render logic");
	}
	await runLogic(stateDispatcher);
	await HOME_PAGE_FNS.homePageSetView(HOME_PAGE_STATES.SHOW_STATS);
	if (!CONTEXT.STATS_POST_RENDER_COMPLETED) {
		console.log("Running stats post render logic");
		await postFirstRenderLogic(); // will resize code mirror appropriately
		CONTEXT.STATS_POST_RENDER_COMPLETED = true;
		console.log("Completed stats post render logic");
	}
	resizeRankPlot();
}

let StatsView = {
	preFirstRenderLogic: preFirstRenderLogic,
	postFirstRenderLogic: postFirstRenderLogic,
	runLogic: runLogic,
	initialize: initialize,
	populateContent: populateContent,
	triggerState: HOME_PAGE_STATES.SHOW_STATS,
	handleDispatch: handleDispatch,
};

export { StatsView };
