import {
	PageUtils,
	RegExps,
	Tables,
	CardContent,
	ContentManager,
	SavedFilters,
} from "../../exports.js";
import { CONTEXT } from "../page-utilities/context-references.js";
import {
	HOME_PAGE_STATES,
} from "../page-utilities/page-state-manager.js";

async function populateContent() {
	const user = await ContentManager.UserManager.getUser();

	if (!user) {
		console.log("Skipping populate tables: user not found");
		return;
	};

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
		const battleTable = Tables.functions.populateFullBattlesTable(
			"BattlesTable",
			stats.battles,
			user
		);
		CardContent.functions.populateGeneralStats(stats.generalStats);
		CardContent.functions.populateRankPlot(stats.plotContent);
		console.log("FINISHED POPULATING");
		console.timeEnd("populateTables");

		console.log("Setting listener for filter-battle-table checkbox");
		const filterBattleTableCheckbox = document.getElementById(
			"filter-battle-table"
		);
		filterBattleTableCheckbox.addEventListener("click", async () => {
			if (!filterBattleTableCheckbox.checked) {
				Tables.functions.replaceDatatableData(battleTable, stats.battles);
			} else {
				Tables.functions.replaceDatatableData(
					battleTable,
					stats.filteredBattles
				);
			}
		});

	} catch (err) {
		console.error("Error loading data:", err);
	}
}

function addAutoZoomListener() {
	const autoZoomCheckbox = document.getElementById("auto-zoom-flag");
	autoZoomCheckbox.addEventListener("click", async () => {
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


function addFilterButtonListeners(editor, stateDispatcher, context) {
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
				const autoZoomCheckbox = document.getElementById("auto-zoom-flag");
				context[CONTEXT.KEYS.AUTO_ZOOM] = autoZoomCheckbox.checked;
				context[CONTEXT.KEYS.QUERY] = false;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA, context);
			}
		} else if (action === "check") {
			console.log("Checking Str", syntaxStr);
			await PageUtils.validateFilterSyntax(syntaxStr);
		} else if (action === "clear") {
			editor.setValue("");
			console.log("Found applied filter", appliedFilter, "when clearing");
			if (appliedFilter) {
				console.log("Found filter str", appliedFilter);
				await ContentManager.ClientCache.setFilterStr("");
				context[CONTEXT.KEYS.AUTO_ZOOM] = autoZoomCheckbox.checked;
				context[CONTEXT.KEYS.QUERY] = false;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA, context);
			}
		}
	});
}

async function addCodeMirror(stateDispatcher, context) {
	const autoZoomCheckbox = document.getElementById("auto-zoom-flag");
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

	context[CONTEXT.KEYS.EDITOR_INITIALIZED] = true;

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
	addFilterButtonListeners(editor, stateDispatcher, context);
}

async function initializeStatsLogic() {
	await populateContent();
	addAutoZoomListener();
}

async function runStatsLogic(stateDispatcher, context) {
	const autoZoomCheckbox = document.getElementById("auto-zoom-flag");
	autoZoomCheckbox.checked = await ContentManager.ClientCache.getFlag(
		"autoZoom"
	);

	const user = await ContentManager.UserManager.getUser();

	if (!user) {
		context[CONTEXT.KEYS.ERROR_MSG] =
			"User not found; Must either query a valid user or upload battles to view hero stats";
		console.error(context[CONTEXT.KEYS.ERROR_MSG]);
		stateDispatcher(HOME_PAGE_STATES.SELECT_DATA, context);
	} else {
		console.log("User found:", user);
	}

	await populateContent();

	const filterMSG = document.getElementById("filterMSG");

	if (context[CONTEXT.KEYS.ERROR_MSG]) {
		filterMSG.textContent = context[CONTEXT.KEYS.ERROR_MSG];
		filterMSG.classList.remove("text-safe");
		filterMSG.classList.add("text-danger");
		context[CONTEXT.KEYS.ERROR_MSG] = null;
	}
}

export { initializeStatsLogic, addCodeMirror, runStatsLogic };
