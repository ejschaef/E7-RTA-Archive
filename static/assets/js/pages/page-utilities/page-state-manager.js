import ClientCache from "../../cache-manager.js";

const HOME_PAGE_STATES = {
	SELECT_DATA: "select-data",
	SHOW_STATS: "show-stats",
	LOAD_DATA: "load-data",
};

const VALIDATION_SET = new Set(Object.values(HOME_PAGE_STATES));

function validateState(state) {
	if (!VALIDATION_SET.has(state)) {
		console.error(`Invalid page state: ${state}`);
		return false;
	}
	return true;
}

function getContentBodyID(state) {
	return `${state}-body`;
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
		const contentBodyID = getContentBodyID(otherState);
		console.log(`Hiding ${contentBodyID}`);
		document.getElementById(contentBodyID).classList.add("d-none");
	}
	const contentBodyID = getContentBodyID(state);
	console.log(`Showing ${contentBodyID}`);
	document.getElementById(contentBodyID).classList.remove("d-none");
}

export { PageStateManager, HOME_PAGE_STATES, homePageSetView, validateState };
