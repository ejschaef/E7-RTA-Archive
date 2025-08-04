import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";
import ContentManager from "../content-manager.js";
import { buildFormattedBattleMap } from "../e7/battle-transform.js";
import { getStrMatches } from "../utils.js";
import { Searcher } from "../e7/searcher.js";
import ArtifactManager from "../e7/artifact-manager.js";


function ingestStringChars(set, strings) {
	console.log("Ingesting strings:", typeof strings, strings);
	let length = set.size;
	for (let str of strings) {
		for (let char of str) {
			set.add(char);
			let newLength = set.size;
			if (length !== newLength) {
				console.log("New chars in string:", str, char);
			}
			length = newLength;
		}
	}
	
}

document.addEventListener("DOMContentLoaded", async () => {
	await ContentManager.ClientCache.clearData();

    // await ContentManager.UserManager.clearUserDataLists();

    let global_users = await ContentManager.UserManager.getUserMap("world_global");
    // let first_ten = Object.values(global_users).slice(0, 10);
    // console.log(first_ten);

	// let user = await ContentManager.UserManager.findUser({ id: "195863691" });
	// let response = await PYAPI.rsFetchBattleData(user.user);

	let HM = await ContentManager.HeroManager.getHeroManager();
	let artifacts = await ContentManager.ArtifactManager.getArtifacts();
	console.log(`Got artifacts:`, artifacts, typeof artifacts, artifacts.length);


	console.log(getStrMatches("wolf", Object.values(global_users), 10, {keys: ["name"], distance: 4}));

	const searcher = new Searcher();

	let wolf = await searcher.search("Global Server", "wolf");

	let artiList = await ArtifactManager.getArtifactObjectList()

	console.log(artiList);

	let elbris = await searcher.search(Searcher.DOMAINS.ARTIFACTS, "elbris");

	console.log(wolf.map(user => [user.item.name, user.item.id]));
	console.log(elbris);
});
