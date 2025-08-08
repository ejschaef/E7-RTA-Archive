import {
	PageStateManager,
	HOME_PAGE_STATES,
	validateState,
	HOME_PAGE_FNS,
} from "../page-state-manager.js";
import { runSelectDataLogic } from "../../page-views/home-page/select-data/select-data-logic.js";
import { StatsViewFns } from "../../page-views/home-page/stats/stats-logic.js";
import { runLoadDataLogic } from "../../page-views/home-page/load-data/load-data-logic.js";
import { TextController } from "../text-controller.js";
import { CONTEXT } from "../home-page-context.js";
import PageUtils from "../../page-utilities/page-utils.js";

export function resizeRankPlot() {
	setTimeout(() => {
		Plotly.Plots.resize(document.getElementById("rank-plot"));
	}, 20);
}

async function resolveShowStatsDispatch(stateDispatcher) {
	if (!CONTEXT.STATS_PRE_RENDER_COMPLETED) {
		console.log("Running stats pre render logic");
		await StatsViewFns.preFirstRenderLogic(stateDispatcher); // if stats page is accessed from outside home page, must populate, otherwise load data logic will
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
		console.log("Completed stats pre render logic");
	}
	await StatsViewFns.runStatsLogic(stateDispatcher);
	await HOME_PAGE_FNS.homePageSetView(HOME_PAGE_STATES.SHOW_STATS);
	if (!CONTEXT.STATS_POST_RENDER_COMPLETED) {
		console.log("Running stats post render logic");
		await StatsViewFns.postFirstRenderLogic(stateDispatcher); // code mirror can only be initialized after element is rendered
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
	console.log(`Switching to state: ${state}, with CONTEXT: `, CONTEXT);
	if (!validateState(state)) return;
	preDispatchLogic();
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
	let scrollPercent = CONTEXT.SCROLL_PERCENTS[state];
	setTimeout(() => {
		PageUtils.setScrollPercent(scrollPercent);
	}, 0);
}

export { stateDispatcher };
