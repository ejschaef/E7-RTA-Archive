let PYAPI = {};

PYAPI.consts = {
    DATAKEY: "taskdatakey",
}

PYAPI.functions = {
    fetchAndCache: async function () {
        const url = '/api/fetch_user_data';
        const response = await fetch(url);
        const data = await response.json();

        if (data.use_cache) {
            // Server says use local cache
            const cachedData = await ClientCache.functions.getJSON(PYAPI.consts.DATAKEY); // function to read from IndexedDB
            if (cachedData) {
                console.log("Retrieving from cache");
                PYAPI.functions.test(cachedData);
                return cachedData;
            } else {
                console.warn('Cache expected but not found, refetching...');
                // fallback: force fetch without cached_client param
                return await PYAPI.functions.fetchAndCacheWithoutCacheFlag();
            }
        } else {
            // Got fresh data, save it and use it
            await ClientCache.functions.saveJSON(PYAPI.consts.DATAKEY, data); // function to save in IndexedDB
            console.log("Got data from python success");
            await PYAPI.functions.notifyCacheSuccess()
            PYAPI.functions.test(data);
            return data;
        }
    },

    fetchAndCacheWithoutCacheFlag: async function() {
        const response = await fetch('/api/data');
        const data = await response.json();
        await ClientCache.functions.saveJSON(PYAPI.consts.DATAKEY, data);
        PYAPI.functions.test(data);
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
    }
};