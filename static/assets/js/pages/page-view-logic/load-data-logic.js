import { CONTEXT } from "../page-utilities/home-page-context.js";
import {
	HOME_PAGE_FNS,
	HOME_PAGE_STATES,
} from "../page-utilities/page-state-manager.js";
import ClientCache from "../../cache-manager.js";
import UserManager from "../../e7/user-manager.js";
import BattleManager from "../../e7/battle-manager.js";
import HeroManager from "../../e7/hero-manager.js";
import { ContentManager, CSVParse } from "../../exports.js";
import { PageUtils } from "../../exports.js";
import { StatsViewFns } from "./stats-logic.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.js";
import { CLEAN_STR_TO_WORLD_CODE } from "../../e7/references.js";

function addEscapeButtonListener() {
	const escapeBtn = DOC_ELEMENTS.HOME_PAGE.ESCAPE_BTN;
	escapeBtn.addEventListener("click", async () => {
		const user = await UserManager.getUser();
		if (user) {
			await HOME_PAGE_FNS.homePageSetUser(null);
		} else {
			await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
		}
	});
}

function initializeLoadDataLogic() {
	addEscapeButtonListener();
}

async function processUpload() {
	const selectedFile = await ClientCache.get(
		ClientCache.Keys.RAW_UPLOAD
	);

	console.log("Retrieved Upload: ", selectedFile);

	const battleArr = await CSVParse.parseUpload(selectedFile);

	const playerID = battleArr[0]["P1 ID"];
	const playerWorldCode = CLEAN_STR_TO_WORLD_CODE[battleArr[0]["P1 Server"]];
	const user = await UserManager.findUser({
		id: playerID,
		world_code: playerWorldCode,
	});
	if (!user) {
		console.log(
			"Failed to find user with ID during upload verification:",
			playerID
		);
		console.log("Setting Error Message:", "User not found");
		throw new Error("File Upload Error: User not found");
	}
	return { user, battleArr };
}

async function handleBattleQuery(user, stateDispatcher, HM) {
	console.log(
		"querying and caching user battles for user: ",
		JSON.stringify(user)
	);
	await PageUtils.queryAndCacheBattles(user, stateDispatcher, HM);
}

async function redirectError(err, source, stateDispatcher) {
	let sourceState;
	if (
		source === CONTEXT.VALUES.SOURCE.QUERY ||
		source === CONTEXT.VALUES.SOURCE.UPLOAD
	) {
		sourceState = HOME_PAGE_STATES.SELECT_DATA;
	} else if (source === CONTEXT.VALUES.SOURCE.STATS) {
		sourceState = HOME_PAGE_STATES.SHOW_STATS;
	} else {
		console.error(`Invalid source: ${source} ; redirecting to select data`);
		sourceState = HOME_PAGE_STATES.SELECT_DATA;
	}
	console.error(err);
	await HOME_PAGE_FNS.homePageClearUserData();
	CONTEXT.ERROR_MSG = `Failed to load data: ${err.message}`;
	stateDispatcher(sourceState);
	return;
}

async function runLoadDataLogic(stateDispatcher) {
	let [HM, SOURCE, autoQuery] = [null, null, null];
	try{
		HM = await HeroManager.getHeroManager();
		SOURCE = CONTEXT.popKey(CONTEXT.KEYS.SOURCE);
		autoQuery = CONTEXT.popKey(CONTEXT.KEYS.AUTO_QUERY);
	} catch (e) {
		console.error("Could not load reference and context variables: ", e);
		stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
	}

	try {
		let user = null;
		if (SOURCE === CONTEXT.VALUES.SOURCE.UPLOAD) {
			let result = await processUpload();
			user = result.user;
			await HOME_PAGE_FNS.homePageSetUser(user);
			await BattleManager.cacheUpload(result.battleArr, HM);
		}

		if (user === null) {
			user = await UserManager.getUser();
		}

		// if new user query or auto query from upload battles we query the users battles from the server and add to cache
		if (autoQuery) {
			await handleBattleQuery(user, stateDispatcher, HM);
		}

		// retrieve the battles from the cache (both uploaded and queried if applicable) and then apply any filters, then compute stats and plots
		console.log("Getting Battles From Cache");
		const battles = await BattleManager.getBattles();

		console.log("BATTLES DURING LOAD");
		console.log(battles);

		console.log("Getting Filters From Cache");
		const filters = await ContentManager.getFilters(HM);

		console.log(`Received Filters: ${JSON.stringify(filters)}`);
		const stats = await BattleManager.getStats(
			battles,
			filters,
			HM,
		);
		await ClientCache.setStats(stats);

		await StatsViewFns.populateContent();  // populates tables and plots in show stats view before showing
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
		stateDispatcher(HOME_PAGE_STATES.SHOW_STATS);
		console.log("REACHED END OF LOAD DATA LOGIC");
		return;
	} catch (err) {
		try {
			redirectError(err, SOURCE, stateDispatcher);
		} catch (err) {
			console.error(`Something went wrong ; redirecting to select data ; error:`, err);
			await HOME_PAGE_FNS.homePageClearUserData();
			stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
		}
	}
}

export { runLoadDataLogic, initializeLoadDataLogic };
