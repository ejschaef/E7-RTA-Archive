import {
	HomePageStateManager,
} from "../orchestration/page-state-manager.ts";
import { HOME_PAGE_STATES, HomePageState } from "../page-utilities/page-state-references.ts";
import { NavBarUtils } from "../page-utilities/nav-bar-utils.ts";
import { TextController, TextUtils } from "../orchestration/text-controller.js";
import { CONTEXT, ScrollPercents } from "./home-page-context.ts";
import PageUtils from "../page-utilities/page-utils.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.ts";
import IPM, { Action } from "../orchestration/inter-page-manager.ts";
import UserManager from "../../e7/user-manager.ts";
import { addHomePageListeners } from "./home-page-listeners.js";
import { buildTables } from "./home-page-build-tables.js";
import { LangManager } from "../../lang-manager.ts";
import { PageOrchestration, WrapperLogic } from "../orchestration/page-orchestration-template.ts";
import { HOME_PAGE_VIEWS } from "./home-page-views.ts";

/**
 * Handles actions sent from other pages to this page.
 * @param {Action} action - one of the actions defined in IPM.ACTIONS
 * @returns {Promise<boolean>} - true if the action caused a state dispatch to occur (we will skip the state dispatcher later if this is true)
 */
async function handleAction(actionObj: Action) {
	const action = actionObj.action;
	let message = actionObj.message;
	switch (action) {
		case IPM.ACTIONS.CLEAR_USER:
			const user = await UserManager.getUser();
			if (!user) 
				break;
			await NavBarUtils.eraseUserFromPage();
			TextUtils.queueSelectDataMsgGreen(
				`Cleared data of user ${user.name} (${user.id})`
			);
			HomePageStateManager.setState(HOME_PAGE_STATES.SELECT_DATA);
			break;

		case IPM.ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG:
			TextUtils.queueSelectDataMsgGreen("Data already cleared");
			break;

		case IPM.ACTIONS.SHOW_NO_USER_MSG:
			message =
				actionObj.message || "Cannot perform action; no active user found.";
			TextUtils.queueSelectDataMsgRed(message);
			break;

		case IPM.ACTIONS.QUERY_USER:
			CONTEXT.AUTO_QUERY = true;
			HomePageStateManager.setState(HOME_PAGE_STATES.LOAD_DATA);
			break;

		default:
			console.error(`Invalid action: ${action}`);
			break;
	}
}

async function processIPMState() {
	const ipmState = await IPM.flushState();
	for (const actionObj of ipmState.actions) {
		await handleAction(actionObj);
	}
}

const WRAPPER_LOGIC: WrapperLogic = {
	preInitialize: async (dispatch) => {
		addHomePageListeners(dispatch);
		buildTables();
	},
	postInitialize: async () => {
		const user = await UserManager.getUser();
		console.log("GOT USER", user);
		const lang = await LangManager.getLang();
		NavBarUtils.writeUserInfo(user, lang);
		NavBarUtils.addExportDataBtnListener();
		NavBarUtils.addBraceButtonListeners();
		TextController.bindAutoClear(DOC_ELEMENTS.HOME_PAGE.MESSAGE_ELEMENTS_LIST);

		let state = await HomePageStateManager.getState();
		if (state === HOME_PAGE_STATES.LOAD_DATA) {
			state = HOME_PAGE_STATES.SELECT_DATA; // don't trap user in load data page if something goes wrong
			await NavBarUtils.eraseUserFromPage();
			await HomePageStateManager.setState(state);
		}
		await processIPMState();
	},
	preDispatch: async (state: HomePageState) => {
		console.log(`Switching to state: ${state}, with CONTEXT: `, CONTEXT.toString());
		let currentState = await HomePageStateManager.getState();
		(CONTEXT.SCROLL_PERCENTS as ScrollPercents)[currentState] = PageUtils.getScrollPercent();
		TextController.clearMessages();
		TextController.processQueue();
		await HomePageStateManager.setState(state);
	},
	postDispatch: async (state: HomePageState) => {
		let scrollPercent = (CONTEXT.SCROLL_PERCENTS as ScrollPercents)[state];
		setTimeout(() => {
			PageUtils.setScrollPercent(scrollPercent);
		}, 0);
		CONTEXT.IS_FIRST_RENDER = false;
	},
}

const orchestration = new PageOrchestration(
	WRAPPER_LOGIC, 
	HOME_PAGE_VIEWS
);


export async function main() {
	document.addEventListener("DOMContentLoaded", async () => {
		await orchestration.initialize();
		const state = await HomePageStateManager.getState();
		await orchestration.dispatch(state);
	});
}
await main();
