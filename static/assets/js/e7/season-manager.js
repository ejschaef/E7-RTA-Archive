import ClientCache from "../cache-manager.js";
import PYAPI from '../pyAPI.js'

// a Season record has the following fields: "Season Number", "Code", "Season", "Start", "End", "Status"

let SeasonManager = {

    getSeasonDetails: async function() {
        let seasonDetails = await ClientCache.get(ClientCache.Keys.SEASON_DETAILS);
        if (seasonDetails === null) {
            const result = await PYAPI.fetchAndCacheSeasonDetails();
            if (result.error) {
                throw new Error(`Could not fetch season details: ${result.error}`);
            } else{
                seasonDetails = result.seasonDetails;
            }
        }
        return seasonDetails;
    },

};

export default SeasonManager;