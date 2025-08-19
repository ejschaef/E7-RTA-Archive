import E7API from "../apis/e7-API.ts";
import PYAPI from "../apis/py-API.js";
import { ContentManager } from "../content-manager.ts";
import { buildFormattedBattleMap } from "../e7/battle-transform.js";
import { Searcher } from "../e7/searcher.ts";
import ArtifactManager from "../e7/artifact-manager.ts";
import SeasonManager from "../e7/season-manager.js";
import { FilterParser } from "../e7/filter-parsing/filter-parser.ts";

document.addEventListener("DOMContentLoaded", async () => {
	await ContentManager.ClientCache.clearData();

	// await ContentManager.UserManager.clearUserDataLists();

	// let global_users = await ContentManager.UserManager.getUserMap("world_global");
	// let first_ten = Object.values(global_users).slice(0, 10);
	// console.log(first_ten);

	// let user = await ContentManager.UserManager.findUser({ id: "195863691" });
	// let response = await PYAPI.rsFetchBattleData(user.user);

	let seasons = await SeasonManager.getSeasonDetails();

	console.log(`Got seasons:`, seasons, typeof seasons, seasons.length);

	let HeroDicts = await ContentManager.HeroManager.getHeroDicts();

	let info = await E7API.fetchInfo(119456895, "world_korea");
	console.log(info);

	info = await E7API.fetchInfo(195863691, "world_global");
	console.log(info);
});
