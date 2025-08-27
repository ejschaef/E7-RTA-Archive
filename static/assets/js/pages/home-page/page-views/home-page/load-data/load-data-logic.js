import { CONTEXT } from "../../../home-page-context.js";
import { HOME_PAGE_STATES } from "../../../../orchestration/page-state-manager.js";
import { FilterParser } from "../../../../../e7/filter-parsing/filter-parser.ts";
import { ContentManager } from "../../../../../content-manager.ts";
import CSVParse from "../../../../../csv-parse.ts";
import { StatsView } from "../stats/stats-logic.js";
import { CLEAN_STR_TO_WORLD_CODE } from "../../../../../e7/references.ts";
import { TextUtils } from "../../../../orchestration/text-controller.js";
import { NavBarUtils } from "../../../../page-utilities/nav-bar-utils.ts";
import { addLoadDataListeners } from "./load-data-listeners.js";
import PYAPI from "../../../../../apis/py-API.js";
import { ExportImportFns } from "../../../../../export-import-data-tools.ts";

async function processUpload() {
	const selectedFile = await ContentManager.ClientCache.get(
		ContentManager.ClientCache.Keys.RAW_UPLOAD
	);

	console.log("Retrieved Upload: ", selectedFile);

	const uploadedData = await ExportImportFns.parseJSON(selectedFile);
	const battleArr = ExportImportFns.restructureParsedUploadBattles(uploadedData.battles);
	const uploadedUser = uploadedData.user;

	const user = await ContentManager.UserManager.findUser(uploadedUser);

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

async function handleBattleQuery(user, HeroDicts) {
	console.log(
		"querying and caching user battles for user: ",
		JSON.stringify(user)
	);
	let artifacts =
		await ContentManager.ArtifactManager.getArtifactCodeToNameMap();
	let response = await PYAPI.rsFetchBattleData(user);
	console.log("Got response", response);
	if (!response.ok) {
		const data = await response.json();
		throw new Error(data.error);
	} else {
		const data = await response.json();
		const rawBattles = data.battles;
		await ContentManager.BattleManager.cacheQuery(
			rawBattles,
			HeroDicts,
			artifacts
		);
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
	await NavBarUtils.eraseUserFromPage();
	await stateDispatcher(sourceState);
	return;
}

async function try_find_user(userObj) {
	console.log("Finding User using:", userObj);
	const user = await ContentManager.UserManager.findUser(userObj);
	console.log("Got data:", JSON.stringify(user));
	if (user !== null) {
		return user;
	}
	return null;
}

async function replaceUser(user) {
	await ContentManager.UserManager.clearUserData();
	await ContentManager.UserManager.setUser(user);
	const lang = await ContentManager.LangManager.getLang();
	NavBarUtils.writeUserInfo(user, lang);
}

async function runLogic(stateDispatcher) {
	let [HeroDicts, SOURCE, autoQuery] = [null, null, null];
	try {
		HeroDicts = await ContentManager.HeroManager.getHeroDicts();
		SOURCE = CONTEXT.popKey(CONTEXT.KEYS.SOURCE);
		autoQuery = CONTEXT.popKey(CONTEXT.KEYS.AUTO_QUERY);
	} catch (e) {
		console.error("Could not load reference and context variables: ", e);
		await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
		return;
	}

	try {
		let user = null;
		if (SOURCE === CONTEXT.VALUES.SOURCE.UPLOAD) {
			let result = await processUpload();
			user = result.user;
			await replaceUser(user);
			await ContentManager.BattleManager.cacheUpload(
				result.battleArr,
				HeroDicts
			);
		} else if (SOURCE === CONTEXT.VALUES.SOURCE.QUERY) {
			const userObj = CONTEXT.popKey(CONTEXT.KEYS.TRY_SET_USER);
			if (userObj === null)
				throw new Error("TRY_SET_USER User missing from CONTEXT");
			user = await try_find_user(userObj); // find user automatically throws error if not found
			await replaceUser(user);
		}

		if (user === null) {
			user = await ContentManager.UserManager.getUser();
		}

		// if new user query or auto query from upload battles we query the users battles from the server and add to cache
		if (autoQuery || SOURCE === CONTEXT.VALUES.SOURCE.QUERY) {
			await handleBattleQuery(user, HeroDicts);
		}

		// retrieve the battles from the cache (both uploaded and queried if applicable) and then apply any filters, then compute stats and plots
		console.log("Getting Battles From Cache");
		const battles = await ContentManager.BattleManager.getBattles();

		console.log("BATTLES DURING LOAD");
		console.log(battles);

		console.log("Getting Filters From Cache");
		const filters = await FilterParser.getFiltersFromCache(HeroDicts);

		console.log(`Received Filters: ${JSON.stringify(filters)}`);
		const stats = await ContentManager.BattleManager.getStats(
			battles,
			filters,
			HeroDicts
		);

		console.log("Got Stats: ", stats);
		await ContentManager.ClientCache.setStats(stats);

		await StatsView.populateContent(); // populates tables and plots in show stats view before showing
		CONTEXT.STATS_PRE_RENDER_COMPLETED = true; // flag that the stats page doesn't need to run populate content itself
		console.log("REACHED END OF LOAD DATA LOGIC");
		await stateDispatcher(HOME_PAGE_STATES.SHOW_STATS);
		return;
	} catch (err) {
		try {
			await redirectError(err, SOURCE, stateDispatcher);
			return;
		} catch (err) {
			console.error(
				`Something went wrong ; redirecting to select data ; error:`,
				err
			);
			await NavBarUtils.eraseUserFromPage();
			await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
			return;
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
