import {
	PageUtils,
	RegExps,
	Tables,
	CardContent,
	ContentManager,
	SavedFilters,
} from "../../exports.js";
import { CONTEXT } from "../page-utilities/home-page-context.js";
import { HOME_PAGE_STATES } from "../page-utilities/page-state-manager.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.js";

async function populateContent() {
	const user = await ContentManager.UserManager.getUser();

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
			Tables.functions.populateFullBattlesTable("BattlesTable", Object.values(stats.filteredBattlesObj), user);
		} else {
			console.log("POPULATING AS FULL BATTLES TABLE");
			Tables.functions.populateFullBattlesTable("BattlesTable", stats.battles, user);
		}
		CardContent.functions.populateGeneralStats(stats.generalStats);
		await CardContent.functions.populateRankPlot(stats);
		console.log("FINISHED POPULATING");
		console.timeEnd("populateTables");
	} catch (err) {
		console.error("Error loading data:", err);
	}
}

function addAutoZoomListener() {
	const autoZoomCheckbox = DOC_ELEMENTS.HOME_PAGE.AUTO_ZOOM_FLAG;
	autoZoomCheckbox.addEventListener("click", async () => {
		console.log("Toggling Auto Zoom: ", autoZoomCheckbox.checked);
		await ContentManager.ClientCache.setFlag(
			"autoZoom",
			autoZoomCheckbox.checked
		);
	});
}

function addPremadeFilterButtonListener(editor) {
	// Logic for adding premade filters to filter pane
	document
		.getElementById("premade-filters")
		.addEventListener("click", function (event) {
			console.log("Attempting to add a premade filter");
			event.preventDefault();
			const target = event.target.closest(".dropdown-item");
			if (!target) return;
			const filterName = target.textContent.trim();
			console.log("Target found:", filterName);
			const currStr = editor.getValue();
			const newStr = SavedFilters.extendFilters(currStr, filterName);
			editor.setValue(newStr);
		});
}

function addFilterButtonListeners(editor, stateDispatcher) {
	// Logic for submit buttons on filter pane
	const filterForm = document.getElementById("filterForm");
	filterForm.addEventListener("submit", async function (event) {
		event.preventDefault(); // Prevent actual form submission to server

		// Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
		document.getElementById("codeArea").value = editor.getValue();

		console.log("Processing Filter Action");

		const clickedButton = event.submitter;
		const action = clickedButton?.value;
		const syntaxStr = editor.getValue();
		const appliedFilter = await ContentManager.ClientCache.getFilterStr();

		if (action === "apply") {
			const validFilter = await PageUtils.validateFilterSyntax(syntaxStr);
			if (validFilter) {
				await ContentManager.ClientCache.setFilterStr(syntaxStr);
				CONTEXT.AUTO_QUERY = false;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
				return;
			}
		} else if (action === "check") {
			console.log("Checking Str", syntaxStr);
			await PageUtils.validateFilterSyntax(syntaxStr);
		} else if (action === "clear") {
			editor.setValue("");
			console.log("Found applied filter [", appliedFilter, "] when clearing");
			if (appliedFilter) {
				console.log("Found filter str", appliedFilter);
				await ContentManager.ClientCache.setFilterStr("");
				CONTEXT.AUTO_QUERY = false;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
				return;
			}
		}
	});
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

	addPremadeFilterButtonListener(editor);
	addFilterButtonListeners(editor, stateDispatcher);
}

function addBattleTableFilterToggleListener() {
	console.log("Setting listener for filter-battle-table checkbox");
	const filterBattleTableCheckbox = DOC_ELEMENTS.HOME_PAGE.BATTLE_FILTER_TOGGLE;
	filterBattleTableCheckbox.addEventListener("click", async () => {
		const stats = await ContentManager.ClientCache.getStats();
		if (!filterBattleTableCheckbox.checked) {
			Tables.functions.replaceBattleData(stats.battles);
		} else {
			Tables.functions.replaceBattleData(Object.values(stats.filteredBattlesObj));
		}
	});
}

async function postFirstRenderLogic(stateDispatcher) {
	await addCodeMirror(stateDispatcher);
	addBattleTableFilterToggleListener();
}

async function preFirstRenderLogic(stateDispatcher) {
	await populateContent();
}

async function initializeStatsLogic() {
	addAutoZoomListener();
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

	const user = await ContentManager.UserManager.getUser();

	if (!user) {
		console.log("User not found sending to select data quitely");
		stateDispatcher(HOME_PAGE_STATES.SELECT_DATA); // switch view with no error; should only happen if user is reloading and state cache did not expire while user info did
		return;
	} else {
		console.log("User found:", user);
	}

	const filterMSG = DOC_ELEMENTS.HOME_PAGE.FILTER_MSG;

	filterMSG.textContent = "";

	if (CONTEXT.ERROR_MSG) {
		console.log(`Setting Error Message: ${CONTEXT.ERROR_MSG}`);	
		PageUtils.setTextRed(filterMSG, CONTEXT.popKey(CONTEXT.KEYS.ERROR_MSG));
	}

	DOC_ELEMENTS.HOME_PAGE.CSV_FILE.value = "";
	DOC_ELEMENTS.HOME_PAGE.USER_QUERY_FORM_NAME.value = "";
}

let StatsViewFns = { 
	initializeStatsLogic, 
	postFirstRenderLogic, 
	runStatsLogic, 
	populateContent, 
	preFirstRenderLogic,
};

export { StatsViewFns };
