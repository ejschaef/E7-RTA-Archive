import ClientCache from "../../cache-manager.js";
import DOC_ELEMENTS from "./doc-element-references.js";
import PageUtils from "./page-utils.js";
import { HOME_PAGE_STATES } from "./page-state-references.js";


const VALIDATION_SET = new Set(Object.values(HOME_PAGE_STATES));

function validateState(state) {
	if (!VALIDATION_SET.has(state)) {
		console.error(`Invalid page state: ${state}`);
		return false;
	}
	return true;
}

function getContentBody(state) {
	switch (state) {
		case HOME_PAGE_STATES.SELECT_DATA:
			return DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_BODY;
		case HOME_PAGE_STATES.SHOW_STATS:
			return DOC_ELEMENTS.HOME_PAGE.SHOW_STATS_BODY;
		case HOME_PAGE_STATES.LOAD_DATA:
			return DOC_ELEMENTS.HOME_PAGE.LOAD_DATA_BODY;
		default:
			console.error(`Invalid page state: ${state}`);
	}
}

let PageStateManager = {
	getState: async function () {
		return (
			(await ClientCache.get(ClientCache.Keys.HOME_PAGE_STATE)) ??
			HOME_PAGE_STATES.SELECT_DATA
		); // default to GET_DATA
	},

	setState: async function (state) {
		if (!validateState(state)) return;
		await ClientCache.cache(ClientCache.Keys.HOME_PAGE_STATE, state);
	},

	resetState: async function () {
		await ClientCache.delete(ClientCache.Keys.HOME_PAGE_STATE);
	},
};

function homePageSetView(state) {
	if (!validateState(state)) return;
	for (const otherState of Object.values(HOME_PAGE_STATES)) {
		if (state === otherState) continue;
		const otherStateBody = getContentBody(otherState);
		console.log(`Hiding ${otherStateBody.id}`);
		PageUtils.setVisibility(otherStateBody, false);
	}
	const contentBody = getContentBody(state);
	console.log(`Showing ${contentBody.id}`);
	PageUtils.setVisibility(contentBody, true);
}

export { PageStateManager, HOME_PAGE_STATES, homePageSetView, validateState };
