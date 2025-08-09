import { CONTEXT } from "../../../home-page-context.js";
import {
	HOME_PAGE_FNS,
	HOME_PAGE_STATES,
} from "../../../../orchestration/page-state-manager.js";
import FilterSyntaxParser from "../../../../../e7/filter-parsing/filter-syntax-parser.js";
import { CM } from "../../../../../content-manager.js";
import CSVParse from "../../../../../csv-parse.js";
import { StatsView } from "../stats/stats-logic.js";
import { CLEAN_STR_TO_WORLD_CODE } from "../../../../../e7/references.js";
import { TextUtils } from "../../../../orchestration/text-controller.js";
import { NavBarUtils } from "../../../../page-utilities/nav-bar-utils.js";
import { addLoadDataListeners } from "./load-data-listeners.js";
import PYAPI from "../../../../../apis/py-API.js";

async function processUpload() {
	const selectedFile = await CM.ClientCache.get(CM.ClientCache.Keys.RAW_UPLOAD);

	console.log("Retrieved Upload: ", selectedFile);

	const battleArr = await CSVParse.parseUpload(selectedFile);

	const playerID = battleArr[0]["P1 ID"];
	const playerWorldCode = CLEAN_STR_TO_WORLD_CODE[battleArr[0]["P1 Server"]];
	const user = await CM.UserManager.findUser({
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
	let artifacts = await CM.ArtifactManager.getArtifacts();
	let response = await PYAPI.rsFetchBattleData(user);
	if (!response.ok) {
		const error = await response.json().error;
		const errorMSG = `Error while fetching data: ${error}`;
		console.error(`Error while fetching data: ${error}`);
		CONTEXT.ERROR_MSG = errorMSG;
		stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
	} else {
		const data = await response.json();
		const rawBattles = data.battles;
		await CM.BattleManager.cacheQuery(rawBattles, HM, artifacts);
		console.log("Cached queried battles");
	}
}

async function redirectError(err, source, stateDispatcher) {
	let sourceState;
	const [QUERY, UPLOAD, STATS] = [
		CONTEXT.VALUES.SOURCE.QUERY,
		CONTEXT.VALUES.SOURCE.UPLOAD,
		CONTEXT.VALUES.SOURCE.STATS,
	];
	if (source === QUERY || source === UPLOAD) {
		sourceState = HOME_PAGE_STATES.SELECT_DATA;
		TextUtils.queueSelectDataMsgRed(`Failed to load data: ${err.message}`);
	} else if (source === STATS) {
		sourceState = HOME_PAGE_STATES.SHOW_STATS;
		TextUtils.queueFilterMsgRed(`Failed to load data: ${err.message}`);
	} else {
		console.error(`Invalid source: ${source} ; redirecting to select data`);
		sourceState = HOME_PAGE_STATES.SELECT_DATA;
		TextUtils.queueSelectDataMsgRed(`Failed to load data: ${err.message}`);
	}
	console.error(err);
	await CM.UserManager.clearUserData();
	NavBarUtils.writeUserInfo(null);
	stateDispatcher(sourceState);
	return;
}

async function try_find_user(userObj) {
	console.log("Finding User using:", userObj);
	const user = await CM.UserManager.findUser(userObj);
	console.log("Got data:", JSON.stringify(user));
	if (user !== null) {
		return user;
	}
	return null;
}

async function replaceUser(user) {
	await CM.UserManager.clearUserData();
	await CM.UserManager.setUser(user);
	NavBarUtils.writeUserInfo(user);
}

async function runLogic(stateDispatcher) {
	let [HM, SOURCE, autoQuery] = [null, null, null];
	try {
		HM = await CM.HeroManager.getHeroManager();
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
			await replaceUser(user);
			await CM.BattleManager.cacheUpload(result.battleArr, HM);
		} else if (SOURCE === CONTEXT.VALUES.SOURCE.QUERY) {
			const userObj = CONTEXT.popKey(CONTEXT.KEYS.TRY_SET_USER);
			if (userObj === null) 
				throw new Error("TRY_SET_USER User missing from CONTEXT");
			user = await try_find_user(userObj); // find user automatically throws error if not found
			await replaceUser(user);
		}

		if (user === null) {
			user = await CM.UserManager.getUser();
		}

		// if new user query or auto query from upload battles we query the users battles from the server and add to cache
		if (autoQuery || SOURCE === CONTEXT.VALUES.SOURCE.QUERY) {
			await handleBattleQuery(user, stateDispatcher, HM);
		}

		// retrieve the battles from the cache (both uploaded and queried if applicable) and then apply any filters, then compute stats and plots
		console.log("Getting Battles From Cache");
		const battles = await CM.BattleManager.getBattles();

		console.log("BATTLES DURING LOAD");
		console.log(battles);

		console.log("Getting Filters From Cache");
		const filters = await FilterSyntaxParser.getFiltersFromCache(HM);

		console.log(`Received Filters: ${JSON.stringify(filters)}`);
		const stats = await CM.BattleManager.getStats(battles, filters, HM);
		await CM.ClientCache.setStats(stats);

		await StatsView.populateContent(); // populates tables and plots in show stats view before showing
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true; // flag that the stats page doesn't need to run populate content itself
		stateDispatcher(HOME_PAGE_STATES.SHOW_STATS);
		console.log("REACHED END OF LOAD DATA LOGIC");
		return;
	} catch (err) {
		try {
			redirectError(err, SOURCE, stateDispatcher);
		} catch (err) {
			console.error(
				`Something went wrong ; redirecting to select data ; error:`,
				err
			);
			await HOME_PAGE_FNS.homePageClearUserData();
			stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
		}
	}
}

function initialize() {
	addLoadDataListeners();
}

let LoadDataView = {
	runLogic: runLogic,
	initialize: initialize,
};

export { LoadDataView };
