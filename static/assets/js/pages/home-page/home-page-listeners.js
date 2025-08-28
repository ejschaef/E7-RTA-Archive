import {
	PageStateManager,
	HOME_PAGE_STATES,
} from "../orchestration/page-state-manager.js";
import { NavBarUtils } from "../page-utilities/nav-bar-utils.ts";
import { TextUtils } from "../orchestration/text-controller.js";
import { CONTEXT } from "./home-page-context.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.ts";
import UserManager from "../../e7/user-manager.ts";
import { stateDispatcher, resizeRankPlot } from "./home-page-dispatch.js";

function addNavListener() {
	document.querySelectorAll(".nav-link").forEach((link) => {
		link.addEventListener("click", async function (event) {
			const navType = this.dataset.nav;
			console.log("Clicked nav item:", navType);
			const currentState = await PageStateManager.getState();
			if (Object.values(HOME_PAGE_STATES).includes(navType)) {
				if (currentState === navType) {
					console.log(`Already in state: ${currentState} ; returning`);
					return;
				}
				if (navType === HOME_PAGE_STATES.SELECT_DATA) {
					stateDispatcher(HOME_PAGE_STATES.SELECT_DATA, CONTEXT);
				} else if (navType === HOME_PAGE_STATES.SHOW_STATS) {
					const user = await UserManager.getUser();

					// Stats will not show if there is no active user ; will redirect to select data view with error
					if (!user) {
						TextUtils.queueSelectDataMsgRed(
							"User not found; Must either query a valid user or upload battles to view hero stats"
						);
						stateDispatcher(HOME_PAGE_STATES.SELECT_DATA, CONTEXT);
					} else {
						stateDispatcher(HOME_PAGE_STATES.SHOW_STATS, CONTEXT);
					}
				}
			} else {
				// Default behavior continues as normal
				console.log(`Navigating to: ${this.href}`);
			}
		});
	});
}

function addClearDataBtnListener() {
	DOC_ELEMENTS.NAV_BAR.CLEAR_DATA_BTN.addEventListener(
		"click",
		async function (_event) {
			const user = await UserManager.getUser();
			if (user) {
				await NavBarUtils.eraseUserFromPage();
				TextUtils.queueSelectDataMsgGreen(
					`Cleared data of user ${user.name} (${user.id})`
				);
				await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
				CONTEXT.SCROLL_PERCENTS[HOME_PAGE_STATES.SHOW_STATS] = 0; // reset scroll position of show stats page when user data cleared
			} else {
				TextUtils.queueSelectDataMsgGreen("Data already cleared");
				await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
			}
		}
	);
}

function addSideBarHideListener() {
	DOC_ELEMENTS.NAV_BAR.SIDEBAR_HIDE_BTN.addEventListener(
		"click",
		function (_event) {
			console.log("Triggered sidebar listener");
			resizeRankPlot();
		}
	);
}

function addSideBarListener() {
	DOC_ELEMENTS.NAV_BAR.SIDEBAR_CONTROL.addEventListener(
		"click",
		function (_event) {
			console.log("Triggered sidebar listener");
			resizeRankPlot();
		}
	);
}

export function addHomePageListeners() {
	addNavListener();
	addClearDataBtnListener();
	addSideBarHideListener();
	addSideBarListener();
}
