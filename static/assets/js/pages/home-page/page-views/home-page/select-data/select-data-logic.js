import ClientCache from "../../../../../cache-manager.ts";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references.ts";
import { addSelectDataListeners } from "./select-data-listeners.js";

async function runLogic() {
	const autoQueryFlag = document.getElementById("auto-query-flag");
	autoQueryFlag.checked = await ClientCache.get(
		ClientCache.Keys.AUTO_QUERY_FLAG
	);

	const idSearchFlag = DOC_ELEMENTS.HOME_PAGE.ID_SEARCH_FLAG;
	idSearchFlag.checked = await ClientCache.get(ClientCache.Keys.ID_SEARCH_FLAG);
}

function initialize(stateDispatcher) {
	addSelectDataListeners(stateDispatcher);
}

let SelectDataView = {
	runLogic: runLogic,
	initialize: initialize,
};

export { SelectDataView };
