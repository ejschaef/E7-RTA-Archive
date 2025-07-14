import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";
import ContentManager from "../content-manager.js";
import { buildFormattedBattleMap } from "../e7/battle-transform.js";

document.addEventListener("DOMContentLoaded", async () => {
	await ContentManager.ClientCache.clearUserData();

    let global_users = await ContentManager.UserManager.getUserMap("world_global");
    let first_ten = Object.values(global_users).slice(0, 10);
    console.log(first_ten);

	let user = await ContentManager.UserManager.findUser({ id: "195863691" });
	let response = await PYAPI.rsFetchBattleData(user.user);

	let HM = await ContentManager.HeroManager.getHeroManager();
	let artifacts = await ContentManager.ArtifactManager.getArtifacts();
	console.log(`Got artifacts: ${JSON.stringify(artifacts)}`);

	if (response.ok) {
		let data = await response.json();
		console.log(data);
		let rawBattles = data.battles;
		let formattedBattles = buildFormattedBattleMap(rawBattles, HM, artifacts);
		console.log(formattedBattles);
	} else {
		console.error("Error:", response.error);
	}
});
