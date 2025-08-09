import ClientCache from "../../../../../cache-manager.js";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references.js";
import { addSelectDataListeners } from "./select-data-listeners.js";

async function runLogic() {
	const autoQueryFlag = document.getElementById("auto-query-flag");
	autoQueryFlag.checked = await ClientCache.getFlag("autoQuery");

	const idSearchFlag = DOC_ELEMENTS.HOME_PAGE.ID_SEARCH_FLAG;
	idSearchFlag.checked = await ClientCache.getFlag("idSearch");
}

function initialize(stateDispatcher) {
	addSelectDataListeners(stateDispatcher);
}

let SelectDataView = {
	runLogic: runLogic,
	initialize: initialize,
};

export { SelectDataView };
