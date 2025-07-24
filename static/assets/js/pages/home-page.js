import {
	PageStateManager,
	HOME_PAGE_STATES,
	validateState,
	HOME_PAGE_FNS
} from "./page-utilities/page-state-manager.js";
import {
	initializeSelectDataLogic,
	runSelectDataLogic,
} from "./page-view-logic/select-data-logic.js";
import {
	initializeStatsLogic,
	runStatsLogic,
	postFirstRenderLogic,
	preFirstRenderLogic,
} from "./page-view-logic/stats-logic.js";
import { runLoadDataLogic } from "./page-view-logic/load-data-logic.js";
import { CONTEXT } from "./page-utilities/home-page-context.js";
import { ContentManager } from "../exports.js";
import PageUtils from "./page-utilities/page-utils.js";
import DOC_ELEMENTS from "./page-utilities/doc-element-references.js";
import IPM from "./page-utilities/inter-page-manager.js";


async function resolveShowStatsDispatch(stateDispatcher) {
	if (!CONTEXT.STATS_PRE_RENDER_COMPLETED) {
		console.log("Running stats pre render logic");
		await preFirstRenderLogic(stateDispatcher); // if stats page is accessed from outside home page, must populate, otherwise load data logic will
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
		console.log("Completed stats pre render logic");
	}
	await runStatsLogic(stateDispatcher);
	await HOME_PAGE_FNS.homePageSetView(HOME_PAGE_STATES.SHOW_STATS);
	if (!CONTEXT.STATS_POST_RENDER_COMPLETED) {
		console.log("Running stats post render logic");
		await postFirstRenderLogic(stateDispatcher); // code mirror can only be initialized after element is rendered
		setTimeout(() => {
			Plotly.Plots.resize(document.getElementById("rank-plot-container"));
		}, 0);
		CONTEXT.STATS_POST_RENDER_COMPLETED = true;
		console.log("Completed stats post render logic");
	}
}

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
			await HOME_PAGE_FNS.homePageSetView(state);
			break;
		case HOME_PAGE_STATES.SHOW_STATS:
			await resolveShowStatsDispatch(stateDispatcher);
			break;
		case HOME_PAGE_STATES.LOAD_DATA:
			await HOME_PAGE_FNS.homePageSetView(state); // show load data page before actually running logic
			await runLoadDataLogic(stateDispatcher);
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

function addClearDataBtnListener() {
	DOC_ELEMENTS.HOME_PAGE.CLEAR_DATA_BTN.addEventListener(
		"click",
		async function (_event) {
			const user = await ContentManager.UserManager.getUser();
			if (user) {
				await HOME_PAGE_FNS.homePageSetUser(null);
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

async function handleAction(action) {
	switch (action) {
		case IPM.ACTIONS.CLEAR_USER:
			const user = await ContentManager.UserManager.getUser();
			await HOME_PAGE_FNS.homePageSetUser(null);
			await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
			PageUtils.setTextGreen(
				DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
				`Data of user ${user.name} (${user.id}) cleared`
			);
			return
		case IPM.ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG:
			PageUtils.setTextGreen(
				DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
				"Data already cleared"
			);
			return;
		case IPM.ACTIONS.SHOW_NO_USER_MSG:
			PageUtils.setTextRed(
				DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
				"User not found; Must either query a valid user or upload battles to view hero stats"
			)
			return;
	}
}

async function homePageLogic() {
	console.log("Initialized CONTEXT", CONTEXT);
	addNavListeners();
	addClearDataBtnListener();
	await initializeSelectDataLogic(stateDispatcher);
	await initializeStatsLogic(stateDispatcher);
	const user = await ContentManager.UserManager.getUser();
	HOME_PAGE_FNS.homePageDrawUserInfo(user);
	let state = await PageStateManager.getState();
	if (state == HOME_PAGE_STATES.LOAD_DATA) {
		state = HOME_PAGE_STATES.SELECT_DATA;  // don't trap user in load data page if something goes wrong
		await PageStateManager.setState(state);
	}
	CONTEXT.HOME_PAGE_STATE = state;
	await stateDispatcher(state);
	const ipmState = await IPM.readAndClear();
	console.log("IPM STATE", ipmState);
	for (const action of ipmState.actions) {
		await handleAction(action);
	}
	PageUtils.setVisibility(DOC_ELEMENTS.HOME_PAGE.FOOTER_BODY, true);
}

async function main() {
	document.addEventListener("DOMContentLoaded", async () => {
		await homePageLogic();
	});
}

main();
