import UserManager from "../../../../../e7/user-manager.js";
import { Tables, CardContent } from "../../../../../populate_content.js";
import { CM } from "../../../../../content-manager.js";
import { RegExps } from "../../../../../e7/regex.js";
import { addStatsListeners } from "./stats-listeners.js";
import { HOME_PAGE_STATES } from "../../../../orchestration/page-state-manager.js";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references.js";
import { CONTEXT } from "../../../home-page-context.js";

async function populateContent() {
	const user = await UserManager.getUser();

	if (!user) {
		console.log("Skipping populate tables: user not found");
		return;
	}

	console.log("POPULATING DATA PROCESS INITIATED");

	try {
		console.log("Getting Season Details");
		const seasonDetails = await CM.SeasonManager.getSeasonDetails();
		console.log("Got season details:", seasonDetails, typeof seasonDetails);

		console.log("Getting Stats");
		const stats = await CM.ClientCache.getStats();

		//console.log("GOT STATS: ", JSON.stringify(stats));

		console.time("populateTables");
		console.log("POPULATING TABLES, CARD CONTENT, AND PLOTS");
		Tables.populateSeasonDetailsTable("SeasonDetails", seasonDetails);
		Tables.populateHeroStatsTable(
			"PlayerTable",
			stats.playerHeroStats
		);
		Tables.populateHeroStatsTable(
			"OpponentTable",
			stats.enemyHeroStats
		);
		Tables.populatePlayerFirstPickTable(
			"FirstPickStats",
			stats.firstPickStats
		);
		Tables.populatePlayerPrebansTable(
			"PrebanStats",
			stats.prebanStats
		);
		Tables.populateServerStatsTable(
			"server-stats",
			stats.serverStats
		);
		if (DOC_ELEMENTS.HOME_PAGE.BATTLE_FILTER_TOGGLE.checked) {
			console.log("POPULATING AS FILTERED BATTLES TABLE");
			Tables.populateFullBattlesTable(
				"BattlesTable",
				Object.values(stats.filteredBattlesObj),
				user
			);
		} else {
			console.log("POPULATING AS FULL BATTLES TABLE");
			Tables.populateFullBattlesTable(
				"BattlesTable",
				stats.battles,
				user
			);
		}
		CardContent.populateGeneralStats(stats.generalStats);
		await CardContent.populateRankPlot(stats);
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

	const appliedFilter = await CM.ClientCache.getFilterStr();

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
	editor.refresh();
}

async function runLogic(stateDispatcher) {
	const autoZoomCheckbox = DOC_ELEMENTS.HOME_PAGE.AUTO_ZOOM_FLAG;
	const checked = await CM.ClientCache.getFlag("autoZoom");
	autoZoomCheckbox.checked = checked;
	const stats = await CM.ClientCache.getStats();

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

async function initialize(stateDispatcher) {
	const editor = await addCodeMirror();
	await addStatsListeners(editor, stateDispatcher);
}

let StatsView = {
	preFirstRenderLogic: preFirstRenderLogic,
	postFirstRenderLogic: postFirstRenderLogic,
	runLogic: runLogic,
	initialize: initialize,
	populateContent: populateContent,
};

export { StatsView };
