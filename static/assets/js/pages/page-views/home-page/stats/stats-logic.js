import UserManager from "../../../../e7/user-manager.js";
import {
	RegExps,
	Tables,
	CardContent,
	ContentManager,
} from "../../../../exports.js";
import { addPrivateStatsListeners } from "./stats-listeners.js";
import { HOME_PAGE_STATES } from "../../../orchestration/page-state-manager.js";
import DOC_ELEMENTS from "../../../page-utilities/doc-element-references.js";

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
		Tables.functions.populateSeasonDetailsTable("SeasonDetails", seasonDetails);
		Tables.functions.populateHeroStatsTable(
			"PlayerTable",
			stats.playerHeroStats
		);
		Tables.functions.populateHeroStatsTable(
			"OpponentTable",
			stats.enemyHeroStats
		);
		Tables.functions.populatePlayerFirstPickTable(
			"FirstPickStats",
			stats.firstPickStats
		);
		Tables.functions.populatePlayerPrebansTable(
			"PrebanStats",
			stats.prebanStats
		);
		Tables.functions.populateServerStatsTable(
			"server-stats",
			stats.serverStats
		);
		if (DOC_ELEMENTS.HOME_PAGE.BATTLE_FILTER_TOGGLE.checked) {
			console.log("POPULATING AS FILTERED BATTLES TABLE");
			Tables.functions.populateFullBattlesTable(
				"BattlesTable",
				Object.values(stats.filteredBattlesObj),
				user
			);
		} else {
			console.log("POPULATING AS FULL BATTLES TABLE");
			Tables.functions.populateFullBattlesTable(
				"BattlesTable",
				stats.battles,
				user
			);
		}
		CardContent.functions.populateGeneralStats(stats.generalStats);
		await CardContent.functions.populateRankPlot(stats);
		console.log("FINISHED POPULATING");
		console.timeEnd("populateTables");
	} catch (err) {
		console.error("Error loading data:", err);
	}
}

async function addCodeMirror(stateDispatcher) {
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
	return editor;
}

async function postFirstRenderLogic(stateDispatcher) {
	const editor = await addCodeMirror(stateDispatcher);
	addPrivateStatsListeners(editor, stateDispatcher);
}

async function preFirstRenderLogic() {
	await populateContent();
}

async function runStatsLogic(stateDispatcher) {
	const autoZoomCheckbox = DOC_ELEMENTS.HOME_PAGE.AUTO_ZOOM_FLAG;
	const checked = await ContentManager.ClientCache.getFlag("autoZoom");
	autoZoomCheckbox.checked = checked;
	const stats = await ContentManager.ClientCache.getStats();

	const filterBattleTableCheckbox = DOC_ELEMENTS.HOME_PAGE.BATTLE_FILTER_TOGGLE;
	if (filterBattleTableCheckbox.checked) {
		Tables.functions.replaceBattleData(Object.values(stats.filteredBattlesObj));
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

let StatsViewFns = {
	postFirstRenderLogic,
	runStatsLogic,
	populateContent,
	preFirstRenderLogic,
};

export { StatsViewFns };
