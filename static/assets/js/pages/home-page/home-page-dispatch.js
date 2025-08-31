import {
	PageStateManager,
	HOME_PAGE_STATES,
	validateState,
	HOME_PAGE_FNS,
} from "../orchestration/page-state-manager.js";
import { SelectDataView } from "./page-views/home-page/select-data/select-data-logic.js";
import { StatsView } from "./page-views/home-page/stats/stats-logic.js";
import { LoadDataView } from "./page-views/home-page/load-data/load-data-logic.js";
import { TextController } from "../orchestration/text-controller.js";
import { CONTEXT } from "./home-page-context.js";
import PageUtils from "../page-utilities/page-utils.js";

export function resizeRankPlot() {
	if (!CONTEXT.STATS_PRE_RENDER_COMPLETED) return;
	CONTEXT.IGNORE_RELAYOUT = true;
	setTimeout(() => {
		Plotly.Plots.resize(document.getElementById("rank-plot"));
	}, 20);
}

/**
 * If necessary, runs pre and post render logic for stats page.
 * This function is necessary because the stats page has elements that can
 * only be fully initialized when the page is visible.
 * The pre and post render logic for the stats view is only run once per accessing of the home page.
 * @param {function(HOME_PAGE_STATE)} stateDispatcher - function to dispatch to a new state
 */

async function resolveShowStatsDispatch(stateDispatcher) {
	if (!CONTEXT.STATS_PRE_RENDER_COMPLETED) {
		console.log("Running stats pre render logic");
		await StatsView.preFirstRenderLogic(stateDispatcher); // if stats page is accessed from outside home page, must populate content, otherwise load data logic will
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
		console.log("Completed stats pre render logic");
	}
	await StatsView.runLogic(stateDispatcher);
	await HOME_PAGE_FNS.homePageSetView(HOME_PAGE_STATES.SHOW_STATS);
	if (!CONTEXT.STATS_POST_RENDER_COMPLETED) {
		console.log("Running stats post render logic");
		await StatsView.postFirstRenderLogic(); // will resize code mirror appropriately
		CONTEXT.STATS_POST_RENDER_COMPLETED = true;
		console.log("Completed stats post render logic");
	}
	resizeRankPlot();
}

async function preDispatchLogic() {
	let currentState = await PageStateManager.getState();
	CONTEXT.SCROLL_PERCENTS[currentState] = PageUtils.getScrollPercent();
	TextController.clearMessages();
	TextController.processQueue();
}

// switches among view states for the home page
async function stateDispatcher(state) {
	console.log(`Switching to state: ${state}, with CONTEXT: `, CONTEXT.toString());
	if (!validateState(state)) return;
	preDispatchLogic();
	await PageStateManager.setState(state);
	switch (state) {
		case HOME_PAGE_STATES.SELECT_DATA:
			await SelectDataView.runLogic(stateDispatcher);
			await HOME_PAGE_FNS.homePageSetView(state);
			break;
		case HOME_PAGE_STATES.SHOW_STATS:
			await resolveShowStatsDispatch(stateDispatcher);
			break;
		case HOME_PAGE_STATES.LOAD_DATA:
			await HOME_PAGE_FNS.homePageSetView(state); // show load data page before actually running logic
			await LoadDataView.runLogic(stateDispatcher);
			break;
		default:
			console.error(`Invalid page state: ${state}`);
	}
	// persist scroll position between view state changes ; will reset after leaving page
	let scrollPercent = CONTEXT.SCROLL_PERCENTS[state];
	setTimeout(() => {
		PageUtils.setScrollPercent(scrollPercent);
	}, 0);
}

export { stateDispatcher };
