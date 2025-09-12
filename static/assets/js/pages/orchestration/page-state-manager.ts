import ClientCache from "../../cache-manager.ts";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.ts";
import PageUtils from "../page-utilities/page-utils.js";
import { HOME_PAGE_STATES, HomePageState } from "../page-utilities/page-state-references.ts";
import UserManager, { User } from "../../e7/user-manager.ts";
import { WORLD_CODE_TO_CLEAN_STR } from "../../e7/references.ts";

const VALIDATION_SET = new Set(Object.values(HOME_PAGE_STATES));

function validateState(state: string) {
	if (!VALIDATION_SET.has(state as HomePageState)) {
		console.error(`Invalid page state: ${state}`);
		return false;
	}
	return true;
}

function getContentBody(state: HomePageState) {
	switch (state) {
		case HOME_PAGE_STATES.SELECT_DATA:
			return DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_BODY;
		case HOME_PAGE_STATES.SHOW_STATS:
			return DOC_ELEMENTS.HOME_PAGE.SHOW_STATS_BODY;
		case HOME_PAGE_STATES.LOAD_DATA:
			return DOC_ELEMENTS.HOME_PAGE.LOAD_DATA_BODY;
		case HOME_PAGE_STATES.HERO_INFO:
			return DOC_ELEMENTS.HOME_PAGE.HERO_INFO_BODY;
		default:
			console.error(`Invalid page state: ${state}`);
	}
}

let HomePageStateManager = {
	getState: async function (): Promise<HomePageState> {
		return (
			(await ClientCache.get(ClientCache.Keys.HOME_PAGE_STATE)) ??
			HOME_PAGE_STATES.SELECT_DATA
		); // default to GET_DATA
	},

	setState: async function (state: HomePageState) {
		if (!validateState(state)) return;
		await ClientCache.cache(ClientCache.Keys.HOME_PAGE_STATE, state);
	},

	resetState: async function () {
		await ClientCache.delete(ClientCache.Keys.HOME_PAGE_STATE);
	},
};

function homePageSetView(state: HomePageState) {
	if (!validateState(state)) return;
	for (const otherState of Object.values(HOME_PAGE_STATES)) {
		if (state === otherState) continue;
		const otherStateBody = getContentBody(otherState);
		if (!otherStateBody) continue;
		console.log(`Hiding ${otherStateBody.id}`);
		PageUtils.setVisibility(otherStateBody, false);
	}
	const contentBody = getContentBody(state);
	if (contentBody){
		console.log(`Showing ${contentBody.id}`);
		PageUtils.setVisibility(contentBody, true);
	};
	PageUtils.setVisibility(DOC_ELEMENTS.BODY_FOOTER_CONTAINER, true);
}

function homePageDrawUserInfo(user: User | null) {
	if (user) {
		DOC_ELEMENTS.HOME_PAGE.USER_NAME.innerText = user.name;
		DOC_ELEMENTS.HOME_PAGE.USER_ID.innerText = `${user.id}`;
		DOC_ELEMENTS.HOME_PAGE.USER_SERVER.innerText =
			WORLD_CODE_TO_CLEAN_STR[user.world_code];
	} else {
		DOC_ELEMENTS.HOME_PAGE.USER_NAME.innerText = "(None)";
		DOC_ELEMENTS.HOME_PAGE.USER_ID.innerText = "(None)";
		DOC_ELEMENTS.HOME_PAGE.USER_SERVER.innerText = "(None)";
	}
}

async function homePageSetUser(user: User | null) {
	await UserManager.clearUserData(); // clear any existing data
	homePageDrawUserInfo(user);
	if (user) {
		await UserManager.setUser(user);
	}
}

async function homePageClearUserData() {
	await homePageSetUser(null);
}

let HOME_PAGE_FNS = {
	homePageSetView: homePageSetView,
	homePageSetUser: homePageSetUser,
	homePageDrawUserInfo: homePageDrawUserInfo,
	homePageClearUserData: homePageClearUserData,
};

export { HomePageStateManager, HOME_PAGE_FNS, validateState };
