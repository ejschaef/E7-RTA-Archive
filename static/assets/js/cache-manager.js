// static/app.js
import { openDB } from 'idb';

async function clearStore(db, storeName) {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  await tx.done;
};

const Keys = {
  USER: "current-user",
  HERO_MANAGER: "hero-manager",
  BATTLES: "battles",
  UPLOADED_BATTLES: "uploaded-battles",
  FILTERED_BATTLES: "filtered-battles",
  FILTER_STR: "filter-str",
  STATS: "stats",
  SEASON_DETAILS: "season-details",
  AUTO_ZOOM_FLAG: "auto-zoom",
  AUTO_QUERY_FLAG: "auto-query",
  GLOBAL_USERS: "global-users",
  EU_USERS: "eu-users",
  ASIA_USERS: "asia-users",
  JPN_USERS: "jpn-users",
  KOR_USERS: "kor-users",
  ARTIFACTS: "artifacts",
  HOME_PAGE_STATE: "home-page-state",
};

const FlagsToKeys = {
  "autoZoom": Keys.AUTO_ZOOM_FLAG,
  "autoQuery": Keys.AUTO_QUERY_FLAG,
};

let ClientCache = {
  consts: {
    DB_NAME: 'E7ArenaStatsClientDB',
    DB_VERSION:  1,
    STORE_NAME: 'DataStore',
    META_STORE_NAME: 'MetaStore',
    CACHE_TIMEOUT: 1000 * 60 * 60 * 24 * 2, // 2 day cache timeout
  },

  Keys: {...Keys},

  MetaKeys: {
    TIMESTAMP: "timestamp",
  },

  loaded_UM: new Set(),

  openDB: async () => {
    return openDB(ClientCache.consts.DB_NAME, ClientCache.consts.DB_VERSION, {
      upgrade(db) {
        if (db.objectStoreNames.contains(ClientCache.consts.STORE_NAME)) {
          db.deleteObjectStore(ClientCache.consts.STORE_NAME); // 🧹 clear old store
          console.log('Old store deleted');
        }
        if (!db.objectStoreNames.contains(ClientCache.consts.STORE_NAME)) {
          console.log('Created data store');
          db.createObjectStore(ClientCache.consts.STORE_NAME);
        }
        if (!db.objectStoreNames.contains(ClientCache.consts.META_STORE_NAME)) {
          console.log('Created meta data store');
          db.createObjectStore(ClientCache.consts.META_STORE_NAME);
        }
      }
    });
  },

  get: async function(id) {
    const db = await this.openDB();
    const result = await db.get(this.consts.STORE_NAME, id);
    if (result !== null) {
      console.log(`Found ${id} in cache`);
    } else {
      console.log(`${id} not found in cache; returning null`);
      return null;
    }
    const useCache = await this.checkCacheTimeout(id);
    if (useCache){
      console.log(`Timeout not reached, using cache for ${id}`);
      return result;
    } else {
      console.log(`Timeout reached, returning null for ${id}`);
      return null;
    }
  },

  cache: async function(id, data) {
    console.log(`Caching ${id} with data: ${data}`);
    const db = await this.openDB();
    await db.put(this.consts.STORE_NAME, data, id);
    await this.setTimestamp(id, Date.now());
  },

  delete: async function(id) {
    const db = await this.openDB();
    await db.delete(this.consts.STORE_NAME, id);
    await this.deleteTimestamp(id);
  },

  deleteDB: async function() {
    await indexedDB.deleteDatabase(this.consts.DB_NAME);
    console.log('Database deleted');
  },

  getTimestamp: async function(id) {
    const db = await this.openDB();
    const key = `${id+this.MetaKeys.TIMESTAMP}`;
    const timestamp = await db.get(this.consts.META_STORE_NAME, key);
    return timestamp ?? null;
  },

  setTimestamp: async function(id, timestamp) {
    const db = await this.openDB();
    const key = `${id+this.MetaKeys.TIMESTAMP}`;
    await db.put(this.consts.META_STORE_NAME, timestamp, key);
    const val = await db.get(this.consts.META_STORE_NAME, key);
    console.log(`Timestamp set: ${val}`);
  },

  deleteTimestamp: async function(id) {
    const db = await this.openDB();
    const key = `${id+this.MetaKeys.TIMESTAMP}`;
    await db.delete(this.consts.META_STORE_NAME, key);
    console.log(`Timestamp deleted for <${id}>`);
  },

  clearData: async function() {
    const db = await this.openDB();
    await clearStore(db, this.consts.STORE_NAME);
    await clearStore(db, this.consts.META_STORE_NAME);
    console.log('All data cleared from data cache and meta data cache');
  },

  clearUserData: async function() {
    const toDelete = [Keys.USER, Keys.BATTLES, Keys.UPLOADED_BATTLES, Keys.FILTERED_BATTLES, Keys.FILTER_STR, Keys.STATS];
    await Promise.all(toDelete.map(key => this.delete(key)));
    console.log("User data cleared from data cache");
  },

  clearSeasonData: async function() {
    await this.delete(Keys.SEASON_DETAILS);
    console.log("Season data cleared from data cache");
  },

  checkCacheTimeout: async function(id) {
    const timestamp = await this.getTimestamp(id);
    const currentTime = Date.now();
    console.log(`Checking Timeout for <${id}> | Current time: ${currentTime}, cache timestamp: ${timestamp}, difference: ${currentTime - timestamp} ms`);
    if (!timestamp || (currentTime - timestamp > ClientCache.consts.CACHE_TIMEOUT)) {
      console.log(`Cache timeout reached, clearing data from <${id}>`);
      await this.delete(id);
      return false;
    }
    return true;
  },

  getFilterStr: async function() {
    return await this.get(ClientCache.Keys.FILTER_STR);
  },

  setFilterStr: async function(filterStr) {
    await this.cache(ClientCache.Keys.FILTER_STR, filterStr);
  },

  getStats: async function() {
    return await this.get(ClientCache.Keys.STATS);
  },

  setStats: async function(stats) {
    await this.cache(Keys.STATS, stats);
  },

  getFlag: async function(flag) {
    const key = FlagsToKeys[flag];
    if (!key) {
      throw new Error(`No key found for flag <${flag}>`);
    }
    return await this.get(key);
  },

  setFlag: async function(flag, value) {
    const key = FlagsToKeys[flag];
    if (!key) {
      throw new Error(`No key found for flag <${flag}>`);
    }
    await this.cache(key, value);
  },

};

export default ClientCache; 