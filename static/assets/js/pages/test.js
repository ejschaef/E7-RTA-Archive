import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";
import { CM } from "../content-manager.js";
import { buildFormattedBattleMap } from "../e7/battle-transform.js";
import { getStrMatches } from "../utils.ts";
import { Searcher } from "../e7/searcher.js";
import ArtifactManager from "../e7/artifact-manager.js";
import SeasonManager from "../e7/season-manager.js";

document.addEventListener("DOMContentLoaded", async () => {
	await CM.ClientCache.clearData();

	// await CM.UserManager.clearUserDataLists();

	let global_users = await CM.UserManager.getUserMap("world_global");
	// let first_ten = Object.values(global_users).slice(0, 10);
	// console.log(first_ten);

	// let user = await CM.UserManager.findUser({ id: "195863691" });
	// let response = await PYAPI.rsFetchBattleData(user.user);

	let seasons = await SeasonManager.getSeasonDetails();

	console.log(`Got seasons:`, seasons, typeof seasons, seasons.length);

	let HM = await CM.HeroManager.getHeroManager();
	let artifacts = await CM.ArtifactManager.getArtifacts();
	console.log(`Got artifacts:`, artifacts, typeof artifacts, artifacts.length);

	console.log(
		getStrMatches("wolf", Object.values(global_users), 10, {
			keys: ["name"],
			distance: 4,
		})
	);

	const searcher = new Searcher();

	let wolf = await searcher.search("Global Server", "wolf");

	let artiList = await ArtifactManager.getArtifactObjectList();

	console.log(artiList);

	let elbris = await searcher.search(Searcher.DOMAINS.ARTIFACTS, "elbris");

	console.log(wolf.map((user) => [user.item.name, user.item.id]));
	console.log(elbris);
});
