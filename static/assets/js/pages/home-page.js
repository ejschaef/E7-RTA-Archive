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
	addCodeMirror,
} from "./page-view-logic/stats-logic.js";
import { runLoadDataLogic } from "./page-view-logic/load-data-logic.js";
import { CONTEXT } from "./page-utilities/context-references.js";
import { ContentManager } from "../exports.js";
import PageUtils from "./page-utilities/page-utils.js";

const SCROLL_PERCENTS = {
	[HOME_PAGE_STATES.SELECT_DATA]: 0,
	[HOME_PAGE_STATES.SHOW_STATS]: 0,
	[HOME_PAGE_STATES.LOAD_DATA]: 0,
};

async function stateDispatcher(state, context) {
	console.log(`Switching to state: ${state}`);
	if (!validateState(state)) return;
	let scrollPercent = SCROLL_PERCENTS[state];
	await PageStateManager.setState(state);
	console.log("Error Message while in dispatch: ", document.getElementById("errorMSG").textContent);
	switch (state) {
		case HOME_PAGE_STATES.SELECT_DATA:
			await runSelectDataLogic(stateDispatcher, context);
			await homePageSetView(state);
			break;
		case HOME_PAGE_STATES.SHOW_STATS:
			await runStatsLogic(stateDispatcher, context);
			await homePageSetView(state);
			if (!context[CONTEXT.KEYS.EDITOR_INITIALIZED])
				await addCodeMirror(stateDispatcher, context);
			// setTimeout(() => {
			// 	Plotly.Plots.resize(document.getElementById("rank-plot-container"));
			// }, 0);
			break;
		case HOME_PAGE_STATES.LOAD_DATA:
			await runLoadDataLogic(stateDispatcher, context);
			break;
		default:
			console.error(`Invalid page state: ${state}`);
	}
	if (scrollPercent) {
		setTimeout(() => {
			PageUtils.setScrollPercent(scrollPercent);
		}, 0);
	}
}

function addNavListeners(context) {
	document.querySelectorAll(".nav-link").forEach((link) => {
		link.addEventListener("click", async function (event) {
			const navType = this.dataset.nav;
			console.log("Clicked nav item:", navType);
			const currentState = await PageStateManager.getState();
			if (Object.values(HOME_PAGE_STATES).includes(navType)) {
				if (currentState === navType) {
					console.log(`Already in state: ${currentState} ; returning`);
					return
				};
				SCROLL_PERCENTS[currentState] = PageUtils.getScrollPercent();
				if (navType === HOME_PAGE_STATES.SELECT_DATA) {
					stateDispatcher(HOME_PAGE_STATES.SELECT_DATA, context);
				} else if (navType === HOME_PAGE_STATES.SHOW_STATS) {
					const user = await ContentManager.UserManager.getUser();

					// Stats will not show if there is no active user ; will redirect to select data view with error
					if (!user) {
						context[CONTEXT.KEYS.ERROR_MSG] =
							"User not found; Must either query a valid user or upload battles to view hero stats";
						console.error(context[CONTEXT.KEYS.ERROR_MSG]);
						stateDispatcher(HOME_PAGE_STATES.SELECT_DATA, context);
					} else {
						stateDispatcher(HOME_PAGE_STATES.SHOW_STATS, context);
					}
				}
			} else {
				// Default behavior continues as normal
				console.log(`Navigating to: ${this.href}`);
			}
		});
	});
}

async function homePageLogic() {
	const context = {
		[CONTEXT.KEYS.ERROR_MSG]: null,
		[CONTEXT.KEYS.AUTO_ZOOM]: false,
		[CONTEXT.KEYS.SOURCE]: null,
		[CONTEXT.KEYS.QUERY]: null,
		SCROLL_PERCENTS: SCROLL_PERCENTS,
	};
	console.log(`Initialized context flags: ${JSON.stringify(context)}`);
	addNavListeners(context);
	await initializeSelectDataLogic(stateDispatcher, context);
	await initializeStatsLogic(stateDispatcher, context);
	let state = await PageStateManager.getState();
	if (state) {
		stateDispatcher(state, context);
	}
}

async function main() {
	document.addEventListener("DOMContentLoaded", async () => {
		await homePageLogic();
	});
}

main();
