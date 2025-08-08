import {
	PageStateManager,
	HOME_PAGE_STATES,
} from "./orchestration/page-state-manager.js";
import { NavBarUtils } from "./page-utilities/nav-bar-utils.js";
import {TextController, TextUtils} from "./orchestration/text-controller.js";
import { CONTEXT } from "./orchestration/home-page-context.js";
import PageUtils from "./page-utilities/page-utils.js";
import DOC_ELEMENTS from "./page-utilities/doc-element-references.js";
import IPM from "./orchestration/inter-page-manager.js";
import UserManager from "../e7/user-manager.js";
import { stateDispatcher } from "./orchestration/dispatchers/home-page-dispatch.js";
import { ListenerController } from "./orchestration/listener-controller.js";

async function handleAction(action) {
	switch (action) {

		case IPM.ACTIONS.CLEAR_USER:
			const user = await UserManager.getUser();
			await UserManager.clearUserData();
			NavBarUtils.writeUserInfo(null);
			TextUtils.queueSelectDataMsgGreen(`Cleared data of user ${user.name} (${user.id})`);
			await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
			return;

		case IPM.ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG:
			TextUtils.queueSelectDataMsgGreen("Data already cleared");
			return;

		case IPM.ACTIONS.SHOW_NO_USER_MSG:
			TextUtils.queueSelectDataMsgRed(
				"User not found; Must either query a valid user or upload battles to view hero stats"
			)
			return;

		case IPM.ACTIONS.QUERY_USER:
			CONTEXT.AUTO_QUERY = true;
			stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
			return;

		default:
			console.error(`Invalid action: ${action}`);
			return;
	}
}

async function processIPMState() {
	const ipmState = await IPM.flushState();
	for (const action of ipmState.actions) {
		await handleAction(action);
	}
}

async function initializeHomePage() {
	ListenerController.addHomePageListeners(stateDispatcher);
	const user = await UserManager.getUser();
	console.log("GOT USER", user);
	NavBarUtils.writeUserInfo(user);
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
		await processIPMState();
		await stateDispatcher(state);
		PageUtils.setVisibility(DOC_ELEMENTS.HOME_PAGE.FOOTER_BODY, true);
	});
}


main();
