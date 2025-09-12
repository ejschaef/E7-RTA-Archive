import ClientCache from "../../../../../cache-manager.ts";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references.ts";
import { addSelectDataListeners } from "./select-data-listeners.js";
import { HOME_PAGE_FNS } from "../../../../orchestration/page-state-manager.ts";
import { HOME_PAGE_STATES } from "../../../../page-utilities/page-state-references.ts";

async function runLogic() {
	const autoQueryFlag = document.getElementById("auto-query-flag");
	autoQueryFlag.checked = await ClientCache.get(
		ClientCache.Keys.AUTO_QUERY_FLAG
	);

	const idSearchFlag = DOC_ELEMENTS.HOME_PAGE.ID_SEARCH_FLAG;
	idSearchFlag.checked = await ClientCache.get(ClientCache.Keys.ID_SEARCH_FLAG);
}

async function initialize(stateDispatcher) {
	addSelectDataListeners(stateDispatcher);
}

async function handleDispatch(stateDispatcher) {
	await HOME_PAGE_FNS.homePageSetView(HOME_PAGE_STATES.SELECT_DATA);
	await runLogic(stateDispatcher);
}

let SelectDataView = {
	runLogic: runLogic,
	initialize: initialize,
	triggerState: HOME_PAGE_STATES.SELECT_DATA,
	handleDispatch: handleDispatch,
};

export { SelectDataView };
