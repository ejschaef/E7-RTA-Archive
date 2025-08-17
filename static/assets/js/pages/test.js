import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";
import { CM } from "../content-manager.js";
import { buildFormattedBattleMap } from "../e7/battle-transform.js";
import { getStrMatches } from "../utils.ts";
import { Searcher } from "../e7/searcher.js";
import ArtifactManager from "../e7/artifact-manager.js";
import SeasonManager from "../e7/season-manager.js";
import { FilterParser } from "../e7/filter-parsing/filter-parser.ts";

document.addEventListener("DOMContentLoaded", async () => {
	await CM.ClientCache.clearData();

	// await CM.UserManager.clearUserDataLists();

	// let global_users = await CM.UserManager.getUserMap("world_global");
	// let first_ten = Object.values(global_users).slice(0, 10);
	// console.log(first_ten);

	// let user = await CM.UserManager.findUser({ id: "195863691" });
	// let response = await PYAPI.rsFetchBattleData(user.user);

	let seasons = await SeasonManager.getSeasonDetails();

	console.log(`Got seasons:`, seasons, typeof seasons, seasons.length);

	let HM = await CM.HeroManager.getHeroManager();

	let info = await E7API.fetchInfo(119456895, "world_korea");
	console.log(info);

	info = await E7API.fetchInfo(195863691, "world_global");
	console.log(info);
	
});
