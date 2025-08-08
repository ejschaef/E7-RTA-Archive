import ClientCache from "../../../../cache-manager.js";
import DOC_ELEMENTS from "../../../page-utilities/doc-element-references.js";

async function runSelectDataLogic() {
	const autoQueryFlag = document.getElementById("auto-query-flag");
	autoQueryFlag.checked = await ClientCache.getFlag("autoQuery");

	const idSearchFlag = DOC_ELEMENTS.HOME_PAGE.ID_SEARCH_FLAG;
	idSearchFlag.checked = await ClientCache.getFlag("idSearch");
}

export { runSelectDataLogic };
