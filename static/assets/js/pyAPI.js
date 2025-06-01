import ClientCache from "./cache-manager.js";
import { printObjStruct } from "./e7/e7-utils.js";


let PYAPI = {};

PYAPI.consts = {
    DATAKEY: "taskdatakey",
}

const BATTLE_URL = '/api/get_battle_data';
const HERO_URL = '/api/get_hero_data';
const USER_URL = '/api/get_user_data';

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

    fetchBattleData: async function () {
        const battles = await this.fetchFromPython(BATTLE_URL);
        console.log('Got battles:');
        printObjStruct(battles);
        return battles
    },

    fetchUser: async function () {
        return await this.fetchFromPython(USER_URL);
    },

    serverProcessUpload: async function (battleArr, queryFlag) {
        return await fetch('/api/receive_upload_details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id : battleArr[0]["P1 ID"], queryFlag : queryFlag })
          })
    },
        
};

export default PYAPI;