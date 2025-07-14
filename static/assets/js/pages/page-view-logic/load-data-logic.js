import { CONTEXT } from "../page-utilities/context-references.js";
import {
	HOME_PAGE_STATES,
	homePageSetView,
	PageStateManager,
} from "../page-utilities/page-state-manager.js";
import { ContentManager } from "../../exports.js";
import { PageUtils } from "../../exports.js";

async function runLoadDataLogic(stateDispatcher, contextFlags) {
	homePageSetView(HOME_PAGE_STATES.LOAD_DATA);
	try {

		const HM = await ContentManager.HeroManager.getHeroManager();
		const user = await ContentManager.UserManager.getUser();

		// if new user query or auto query from upload battles we query the users battles from the server else skip
		if (contextFlags[CONTEXT.KEYS.QUERY]) {
			contextFlags[CONTEXT.KEYS.QUERY] = false;
			console.log(
				"querying and caching user battles for user: ",
				JSON.stringify(user)
			);
			await PageUtils.queryAndCacheBattles(
				user,
				stateDispatcher,
				contextFlags,
				HM
			);
		}

		const autoZoom = contextFlags[CONTEXT.KEYS.AUTO_ZOOM];
		contextFlags[CONTEXT.KEYS.AUTO_ZOOM] = false;

		// retrieve the battles from the cache (both uploaded and queried if applicable) and then apply any filters, then compute stats and plots
		console.log("Getting Battles From Cache");
		const battles = await ContentManager.BattleManager.getBattles();

		console.log("BATTLES DURING LOAD");
		console.log(battles);

		console.log("Getting Filters From Cache");
		const filters = await ContentManager.getFilters(HM);

		console.log(`Received Filters: ${JSON.stringify(filters)}`);
		const stats = await ContentManager.BattleManager.getStats(
			battles,
			user,
			filters,
			HM,
			autoZoom
		);
		await ContentManager.ClientCache.setStats(stats);
		stateDispatcher(HOME_PAGE_STATES.SHOW_STATS, contextFlags);
	} catch (err) {

		let sourceState;
		const source = contextFlags[CONTEXT.KEYS.SOURCE];
		if (
			source === CONTEXT.VALUES.SOURCE.QUERY ||
			source === CONTEXT.VALUES.SOURCE.UPLOAD
		) {
			sourceState = HOME_PAGE_STATES.SELECT_DATA;
		} else if (source === CONTEXT.VALUES.SOURCE.STATS) {
			sourceState = HOME_PAGE_STATES.SHOW_STATS;
		} else {
			throw new Error(`Invalid source: ${source}`);
		}
		console.error(err);
		await ContentManager.UserManager.clearUserData();
		contextFlags[
			CONTEXT.KEYS.ERROR_MSG
		] = `Failed to load data: ${err.message}`;
		stateDispatcher(sourceState, contextFlags);
	}
}

export { runLoadDataLogic };
