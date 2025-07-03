import ClientCache from "./cache-manager.js";
import { printObjStruct } from "./e7/e7-utils.js";


const BATTLE_URL = '/api/get_battle_data';
const HERO_URL = '/api/get_hero_data';
const USER_URL = '/api/get_user_data';
const SEASON_URL = '/api/get_season_details';

let PYAPI = {

    test: function(data) {
        // test the fetching works properly
        console.log('Got data in test:', data.rank_plot);
    },

    fetchFromPython: async function (url) {
        let response = await fetch(url);
        if (!response.ok) {
            console.log("Retrying Fetch...");
            response = await fetch(url);
        }
        const data = await response.json();
        return data? data : null;
    },

    fetchHeroData: async function () {
        return await this.fetchFromPython(HERO_URL);
    },

    fetchBattleData: async function (user) {
        if (!user) {
            throw new Error("Must pass user to fetch battles data");
        }
        return await fetch(BATTLE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user: user })
          })
    },

    fetchAndCacheSeasonDetails: async function () {
        await fetch(SEASON_URL)
        .then(response => response.json())
        .then(async data => {
            if (data.success) {
                const seasonDetails = JSON.parse(data.seasonDetails);
                seasonDetails.forEach(season => {
                    season.range = [season["Start"], season["End"]].map(d => new Date(`${d.split(" ")[0]}T00:00:00`))
                });
                await ClientCache.set(ClientCache.Keys.SEASON_DETAILS, seasonDetails);
                return { seasonDetails: seasonDetails, error: false};
            } else {
                return { seasonDetails: null, error: data.error};
            }
        })
    },

    fetchAndCacheUser: async function (userData) {
        if ((!userData.username || !userData.server) && !userData.id) {
            throw new Error("Must pass both username and server or just ID to fetch user");
        }
        const response = await fetch(USER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userData })
        })
        const data = await response.json();
        try {
            if (response.ok) {
                if (!data.foundUser) {
                    if (userData.username) {
                        let serverStr = userData.server.replace("world_", "");
                        return { user: null, error: `Could not find user: "${userData.username}" in server: ${serverStr}`};
                    } else if (userData.id) {
                        return { user: null, error: `Could not find user with ID: ${userData.id}`};
                    }
                } else {
                    const user = data.user;
                    console.log("Server communication successful; received response data for user");
                    console.log(`Found user: ${JSON.stringify(user)}`);
                    await ClientCache.setUser(user);
                    return { user, error: false};
                }
            } else {
                console.log("Server communication unsuccessful")
                return { user: null, error: data.error};
            };
        } catch (e) {
            throw new Error(`Error fetching and caching user: ${e}`);
        }
    },

    //returns both user and battles
    fetchDataFromID: async function (id) {
        if (!id) {
            throw new Error("Must pass ID to fetch user");
        }
        return await fetch('/api/get_battle_data_from_id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id : id })
          })
    },
        
};

export default PYAPI;