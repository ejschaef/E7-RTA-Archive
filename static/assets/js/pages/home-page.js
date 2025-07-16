import {
	PageStateManager,
	HOME_PAGE_STATES,
	validateState,
	homePageSetView,
} from "./page-utilities/page-state-manager.js";
import {
	initializeSelectDataLogic,
	runSelectDataLogic,
} from "./page-view-logic/select-data-logic.js";
import {
	initializeStatsLogic,
	runStatsLogic,
	postFirstRenderLogic,
} from "./page-view-logic/stats-logic.js";
import { runLoadDataLogic } from "./page-view-logic/load-data-logic.js";
import { CONTEXT } from "./page-utilities/home-page-context.js";
import { ContentManager } from "../exports.js";
import PageUtils from "./page-utilities/page-utils.js";
import DOC_ELEMENTS from "./page-utilities/doc-element-references.js";

// switches among view states for the home page
async function stateDispatcher(state) {
	console.log(`Switching to state: ${state}, with CONTEXT: `, CONTEXT);
	if (!validateState(state)) return;
	let currentState = await PageStateManager.getState();
	CONTEXT.SCROLL_PERCENTS[currentState] = PageUtils.getScrollPercent();
	let scrollPercent = CONTEXT.SCROLL_PERCENTS[state];
	await PageStateManager.setState(state);
	switch (state) {
		case HOME_PAGE_STATES.SELECT_DATA:
			await runSelectDataLogic(stateDispatcher);
			await homePageSetView(state);
			break;
		case HOME_PAGE_STATES.SHOW_STATS:
			await runStatsLogic(stateDispatcher);
			await homePageSetView(state);
			if (!CONTEXT.STATS_POST_RENDER_COMPLETED)
				// code mirror can only be initialized after element is rendered
				await postFirstRenderLogic(stateDispatcher);
			// setTimeout(() => {
			// 	Plotly.Plots.resize(document.getElementById("rank-plot-container"));
			// }, 0);
			break;
		case HOME_PAGE_STATES.LOAD_DATA:
			await runLoadDataLogic(stateDispatcher, CONTEXT);
			break;
		default:
			console.error(`Invalid page state: ${state}`);
	}

	// persist scroll position between view state changes ; will reset after leaving page
	setTimeout(() => {
		PageUtils.setScrollPercent(scrollPercent);
	}, 0);
}

function addNavListeners() {
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
					const user = await ContentManager.UserManager.getUser();

					// Stats will not show if there is no active user ; will redirect to select data view with error
					if (!user) {
						CONTEXT.ERROR_MSG =
							"User not found; Must either query a valid user or upload battles to view hero stats";
						console.error(CONTEXT.ERROR_MSG);
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

function addSwitchUserBtnListener() {
	DOC_ELEMENTS.HOME_PAGE.CLEAR_DATA_BTN.addEventListener(
		"click",
		async function (_event) {
			const user = await ContentManager.UserManager.getUser();
			if (user) {
				await ContentManager.UserManager.clearUserData();
				await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
				PageUtils.setTextGreen(
					DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
					`Data of user ${user.name} (${user.id}) cleared`
				);
				CONTEXT.SCROLL_PERCENTS[HOME_PAGE_STATES.SHOW_STATS] = 0; // reset scroll position of show stats page when user data cleared
			} else {
				await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
				PageUtils.setTextGreen(
					DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
					"Data already cleared"
				);
			}
		}
	);
}

async function homePageLogic() {
	console.log("Initialized CONTEXT", CONTEXT);
	addNavListeners();
	addSwitchUserBtnListener();
	await initializeSelectDataLogic(stateDispatcher);
	await initializeStatsLogic(stateDispatcher);
	let state = await PageStateManager.getState();
	CONTEXT.HOME_PAGE_STATE = state;
	await stateDispatcher(state);
	PageUtils.setVisibility(DOC_ELEMENTS.HOME_PAGE.FOOTER_BODY, true);
}

async function main() {
	document.addEventListener("DOMContentLoaded", async () => {
		await homePageLogic();
	});
}

main();
