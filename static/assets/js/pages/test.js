import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";
import ContentManager from "../content-manager.js";
import { buildFormattedBattleMap } from "../e7/battle-transform.js";


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
	// await ContentManager.ClientCache.clearUserData();

    // await ContentManager.UserManager.clearUserDataLists();

	await ContentManager.ArtifactManager.clearArtifactData();

    let global_users = await ContentManager.UserManager.getUserMap("world_global");
    let first_ten = Object.values(global_users).slice(0, 10);
    console.log(first_ten);

	let user = await ContentManager.UserManager.findUser({ id: "195863691" });
	let response = await PYAPI.rsFetchBattleData(user.user);

	let HM = await ContentManager.HeroManager.getHeroManager();
	let artifacts = await ContentManager.ArtifactManager.getArtifacts();
	console.log(`Got artifacts:`, artifacts, typeof artifacts, artifacts.length);



	let charSet = new Set();
	ingestStringChars(charSet, Object.values(artifacts));
	ingestStringChars(charSet, HM.heroes.map(hero => hero.name));
	console.log(charSet);
});
