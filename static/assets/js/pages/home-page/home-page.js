import {
	PageStateManager,
	HOME_PAGE_STATES,
} from "../orchestration/page-state-manager.js";
import { NavBarUtils } from "../page-utilities/nav-bar-utils.js";
import { TextController, TextUtils } from "../orchestration/text-controller.js";
import { CONTEXT } from "./home-page-context.js";
import PageUtils from "../page-utilities/page-utils.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.js";
import IPM from "../orchestration/inter-page-manager.ts";
import UserManager from "../../e7/user-manager.ts";
import { stateDispatcher } from "./home-page-dispatch.js";
import { addHomePageListeners } from "./home-page-listeners.js";
import { SelectDataView } from "./page-views/home-page/select-data/select-data-logic.js";
import { StatsView } from "./page-views/home-page/stats/stats-logic.js";
import { LoadDataView } from "./page-views/home-page/load-data/load-data-logic.js";
import { buildTables } from "./home-page-build-tables.js";

/**
 * Handles actions sent from other pages to this page.
 * @param {string} action - one of the actions defined in IPM.ACTIONS
 * @returns {Promise<boolean>} - true if the action caused a state dispatch to occur (we will skip the state dispatcher later if this is true)
 */
async function handleAction(action, messages) {
	let dispatchedToState = false;
	switch (action) {
		case IPM.ACTIONS.CLEAR_USER:
			const user = await UserManager.getUser();
			await UserManager.clearUserData();
			NavBarUtils.writeUserInfo(null);
			TextUtils.queueSelectDataMsgGreen(
				`Cleared data of user ${user.name} (${user.id})`
			);
			await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
			dispatchedToState = true;
			break;

		case IPM.ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG:
			TextUtils.queueSelectDataMsgGreen("Data already cleared");
			break;

		case IPM.ACTIONS.SHOW_NO_USER_MSG:
			const message = messages.pop() || "Cannot perform action; no active user found."
			TextUtils.queueSelectDataMsgRed(
				message
			);
			break;

		case IPM.ACTIONS.QUERY_USER:
			CONTEXT.AUTO_QUERY = true;
			stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
			dispatchedToState = true;
			break;

		default:
			console.error(`Invalid action: ${action}`);
			break;
	}
	return dispatchedToState;
}

async function processIPMState() {
	const ipmState = await IPM.flushState();
	let dispatchedToState = false;
	for (const action of ipmState.actions) {
		dispatchedToState = await handleAction(action, ipmState.messages);
	}
	return dispatchedToState;
}

async function initializeHomePage() {
	addHomePageListeners();
	buildTables();
	const VIEWS = [SelectDataView, StatsView, LoadDataView];
	for (const view of VIEWS) {
		await view.initialize(stateDispatcher);
	}
	const user = await UserManager.getUser();
	console.log("GOT USER", user);
	NavBarUtils.writeUserInfo(user);
	NavBarUtils.addExportCSVBtnListener();
	NavBarUtils.addOfficialSiteBtnListener();
	TextController.bindAutoClear(DOC_ELEMENTS.HOME_PAGE.MESSAGE_ELEMENTS_LIST);
}

async function main() {
	document.addEventListener("DOMContentLoaded", async () => {
		console.log("Initialized CONTEXT", CONTEXT);
		initializeHomePage();
		let state = await PageStateManager.getState();
		if (state === HOME_PAGE_STATES.LOAD_DATA) {
			state = HOME_PAGE_STATES.SELECT_DATA; // don't trap user in load data page if something goes wrong
			await PageStateManager.setState(state);
		}
		CONTEXT.HOME_PAGE_STATE = state;
		const dispatchedToState = await processIPMState();
		if (!dispatchedToState) {
			await stateDispatcher(state);
		}
		PageUtils.setVisibility(DOC_ELEMENTS.HOME_PAGE.FOOTER_BODY, true);
	});
}

main();
