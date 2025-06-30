import ClientCache from "./cache-manager.js";
import { printObjStruct } from "./e7/e7-utils.js";


let PYAPI = {};

PYAPI.consts = {
    DATAKEY: "taskdatakey",
}

const BATTLE_URL = '/api/get_battle_data';
const HERO_URL = '/api/get_hero_data';
const USER_URL = '/api/get_user_data';
const SEASON_URL = '/api/get_season_details';

PYAPI = {
    fetchAndCache: async function () {
        const url = '/api/fetch_user_data';
        const response = await fetch(url);
        const data = await response.json();

        if (data.use_cache) {
            // Server says use local cache
            const cachedData = await ClientCache.getJSON(PYAPI.consts.DATAKEY); // function to read from IndexedDB
            if (cachedData) {
                console.log("Retrieving from cache");
                this.test(cachedData);
                return cachedData;
            } else {
                console.warn('Cache expected but not found, refetching...');
                // fallback: force fetch without cached_client param
                return await this.fetchAndCacheWithoutCacheFlag();
            }
        } else {
            // Got fresh data, save it and use it
            await ClientCache.setJSON(PYAPI.consts.DATAKEY, data); // function to save in IndexedDB
            console.log("Got data from python success");
            await this.notifyCacheSuccess()
            this.test(data);
            return data;
        }
    },

    fetchAndCacheWithoutCacheFlag: async function() {
        const response = await fetch('/api/data');
        const data = await response.json();
        await ClientCache.setJSON(PYAPI.consts.DATAKEY, data);
        this.test(data);
        return data
    },

    notifyCacheSuccess: async function () {
        console.log("Notifying of cache success");
        const url = '/api/notify_cache_success';
        await fetch(url);
    },

    test: function(data) {
        // test the fetching works properly
        console.log('Got data in test:', data.rank_plot);
    },


    fetchFromPython: async function (url) {
        const response = await fetch(url);
        const data = await response.json();
        return data? data : {};
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
                await ClientCache.setJSON(ClientCache.Keys.SEASON_DETAILS, data.season_details);
                return { seasonDetails: data.season_details, error: false};
            } else {
                return { seasonDetails: null, error: data.error};
            }
        })
    },

    fetchAndCacheUser: async function (userData) {
        if ((!userData.username || !userData.server) && !userData.id) {
            throw new Error("Must pass both username and server or just ID to fetch user");
        }
        await fetch(USER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userData })
          })
          .then(response => response.json())
          .then(async data => {
            if (data.success) {
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
            }
        });
    },

    //returns both user and battles
    fetchDataFromID: async function (id) {
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