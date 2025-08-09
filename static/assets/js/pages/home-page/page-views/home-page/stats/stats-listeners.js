import SavedFilters from "../../../../../e7/saved-filters.js";
import PageUtils from "../../../../page-utilities/page-utils.js";
import { Tables } from "../../../../../populate_content.js";
import { CONTEXT } from "../../../home-page-context.js";
import { HOME_PAGE_STATES } from "../../../../orchestration/page-state-manager.js";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references.js";
import { CM } from "../../../../../content-manager.js";

function addBattleTableFilterToggleListener() {
	console.log("Setting listener for filter-battle-table checkbox");
	const filterBattleTableCheckbox = DOC_ELEMENTS.HOME_PAGE.BATTLE_FILTER_TOGGLE;
	filterBattleTableCheckbox.addEventListener("click", async () => {
		const stats = await CM.ClientCache.getStats();
		if (!filterBattleTableCheckbox.checked) {
			Tables.replaceBattleData(stats.battles);
		} else {
			Tables.replaceBattleData(
				Object.values(stats.filteredBattlesObj)
			);
		}
	});
}

function addAutoZoomListener() {
	const autoZoomCheckbox = DOC_ELEMENTS.HOME_PAGE.AUTO_ZOOM_FLAG;
	autoZoomCheckbox.addEventListener("click", async () => {
		console.log("Toggling Auto Zoom: ", autoZoomCheckbox.checked);
		await CM.ClientCache.setFlag(
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
		const appliedFilter = await CM.ClientCache.getFilterStr();

		if (action === "apply") {
			const validFilter = await PageUtils.validateFilterSyntax(syntaxStr);
			if (validFilter) {
				await CM.ClientCache.setFilterStr(syntaxStr);
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
				await CM.ClientCache.setFilterStr("");
				CONTEXT.AUTO_QUERY = false;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
				return;
			}
		}
	});
}

function addPublicStatsListeners() {
	addAutoZoomListener();
	addBattleTableFilterToggleListener();
}

function addPrivateStatsListeners(editor, stateDispatcher) {
	addPremadeFilterButtonListener(editor);
	addFilterButtonListeners(editor, stateDispatcher);
}

function addStatsListeners(editor, stateDispatcher) {
	addAutoZoomListener();
	addBattleTableFilterToggleListener();
	addPremadeFilterButtonListener(editor);
	addFilterButtonListeners(editor, stateDispatcher);
}

export { addStatsListeners };
