import E7API from "../e7-API.js";
import ContentManager from "../content-manager.js";



async function test() {
    await ContentManager.SeasonManager.clearSeasonDetails();
    await E7API.fetchUserJSON("global");
    await E7API.fetchHeroJSON("en");

    const seasonDetails = await ContentManager.SeasonManager.getSeasonDetails();
    console.log("Got season details:", JSON.stringify(seasonDetails), seasonDetails, typeof(seasonDetails));
};

export {test}