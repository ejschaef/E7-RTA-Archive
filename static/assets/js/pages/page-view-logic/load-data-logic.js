import { CONTEXT } from "../page-utilities/home-page-context.js";
import {
	HOME_PAGE_FNS,
	HOME_PAGE_STATES,
} from "../page-utilities/page-state-manager.js";
import { ContentManager, CSVParse } from "../../exports.js";
import { PageUtils } from "../../exports.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.js";
import { populateContent } from "./stats-logic.js";

async function handleUploadAndSetUser(HM) {
	const selectedFile = await ContentManager.ClientCache.get(
		ContentManager.ClientCache.Keys.RAW_UPLOAD
	);

	console.log("Retrieved Upload: ", selectedFile);

	const battleArr = await CSVParse.parseUpload(selectedFile);

	const playerID = battleArr[0]["P1 ID"];
	const data = await ContentManager.UserManager.findUser({
		id: playerID,
	});
	if (!data.error) {
		await HOME_PAGE_FNS.homePageSetUser(data.user);
		await ContentManager.BattleManager.cacheUpload(battleArr, HM);
		return;
	} else {
		console.log(
			"Failed to find user with ID during upload verification:",
			playerID
		);
		console.log("Setting Error Message:", data.error);
		throw new Error("File Upload Error ", data.error);
	}
}

async function handleBattleQuery(user, stateDispatcher, HM) {
	console.log(
		"querying and caching user battles for user: ",
		JSON.stringify(user)
	);
	await PageUtils.queryAndCacheBattles(user, stateDispatcher, HM);
}

async function runLoadDataLogic(stateDispatcher) {
	try {
		const HM = await ContentManager.HeroManager.getHeroManager();

		const SOURCE = CONTEXT.popKey(CONTEXT.KEYS.SOURCE);
		const autoZoom = await ContentManager.ClientCache.getFlag("autoZoom");
		const autoQuery = CONTEXT.popKey(CONTEXT.KEYS.AUTO_QUERY);

		if (SOURCE === CONTEXT.VALUES.SOURCE.UPLOAD) {
			await handleUploadAndSetUser(HM); // will set user value in cache if successful
		}

		const user = await ContentManager.UserManager.getUser();

		// if new user query or auto query from upload battles we query the users battles from the server and add to cache
		if (autoQuery) {
			await handleBattleQuery(user, stateDispatcher, HM);
		}

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

		await populateContent();  // populates tables and plots in show stats view before showing
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
		stateDispatcher(HOME_PAGE_STATES.SHOW_STATS);
		console.log("REACHED END OF LOAD DATA LOGIC");
		return;
	} catch (err) {
		let sourceState;
		if (
			SOURCE === CONTEXT.VALUES.SOURCE.QUERY ||
			SOURCE === CONTEXT.VALUES.SOURCE.UPLOAD
		) {
			sourceState = HOME_PAGE_STATES.SELECT_DATA;
		} else if (SOURCE === CONTEXT.VALUES.SOURCE.STATS) {
			sourceState = HOME_PAGE_STATES.SHOW_STATS;
		} else {
			throw new Error(`Invalid source: ${source}`);
		}
		console.error(err);
		await ContentManager.UserManager.clearUserData();
		CONTEXT.ERROR_MSG = `Failed to load data: ${err.message}`;
		stateDispatcher(sourceState);
		return;
	}
}

export { runLoadDataLogic };
