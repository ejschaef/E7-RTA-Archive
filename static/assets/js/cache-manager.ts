// static/app.js
import { openDB, IDBPDatabase } from 'idb';
import { LanguageCode, LANGUAGES } from './e7/references';

async function clearStore(db: IDBPDatabase, storeName: string) {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  await tx.done;
};

const USER_DATA_KEYS = {
  USER: "current-user",
  BATTLES: "battles",
  RAW_UPLOAD: "raw-upload",
  UPLOADED_BATTLES: "uploaded-battles",
  FILTERED_BATTLES: "filtered-battles",
  STATS: "stats",
  FILTER_STR: "filter-str",
}

const SERVER_USER_LISTS_KEYS = {
  GLOBAL_USERS: "global-users",
  EU_USERS: "eu-users",
  ASIA_USERS: "asia-users",
  JPN_USERS: "jpn-users",
  KOR_USERS: "kor-users",
}

const Keys = {
  ...USER_DATA_KEYS,
  ...SERVER_USER_LISTS_KEYS,
  LANG : "lang",
  HERO_MANAGER: "hero-manager",
  SEASON_DETAILS: "season-details",
  AUTO_ZOOM_FLAG: "auto-zoom",
  AUTO_QUERY_FLAG: "auto-query",
  ID_SEARCH_FLAG: "id-search",
  ARTIFACTS: "artifacts", // map of artifact codes to names
  ARTIFACTS_LOWERCASE_NAMES_MAP: "artifacts-lowercase-names-map", // map of artifact lowercase names to original names
  ARTIFACT_OBJECT_LIST: "artifact-object-list",
  HOME_PAGE_STATE: "home-page-state",
  INTER_PAGE_MANAGER: "inter-page-manager",
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

  get: async function(id: string) {
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
      return result;
    } else {
      return null;
    }
  },

  cache: async function(id: string, data: any) {
    console.log(`Caching ${id}`);
    const db = await this.openDB();
    await db.put(this.consts.STORE_NAME, data, id);
    await this.setTimestamp(id, Date.now());
  },

  delete: async function(id: string) {
    const db = await this.openDB();
    await db.delete(this.consts.STORE_NAME, id);
    await this.deleteTimestamp(id);
  },

  deleteDB: async function() {
    await indexedDB.deleteDatabase(this.consts.DB_NAME);
    console.log('Database deleted');
  },

  getTimestamp: async function(id: string): Promise<number> {
    const db = await this.openDB();
    const key = `${id+this.MetaKeys.TIMESTAMP}`;
    const timestamp = await db.get(this.consts.META_STORE_NAME, key);
    return timestamp ?? 0;
  },

  setTimestamp: async function(id: string, timestamp: number): Promise<void> {
    const db = await this.openDB();
    const key = `${id+this.MetaKeys.TIMESTAMP}`;
    await db.put(this.consts.META_STORE_NAME, timestamp, key);
    await db.get(this.consts.META_STORE_NAME, key);
  },

  deleteTimestamp: async function(id: string): Promise<void> {
    const db = await this.openDB();
    const key = `${id+this.MetaKeys.TIMESTAMP}`;
    await db.delete(this.consts.META_STORE_NAME, key);
  },

  clearData: async function(): Promise<void> {
    const db = await this.openDB();
    await clearStore(db, this.consts.STORE_NAME);
    await clearStore(db, this.consts.META_STORE_NAME);
    console.log('All data cleared from data cache and meta data cache');
  },

  clearUserData: async function(): Promise<void> {
    const toDelete = Object.values(USER_DATA_KEYS);
    await Promise.all(toDelete.map(key => this.delete(key)));
    console.log("User data cleared from data cache");
  },


  clearUserLists: async function(): Promise<void> {
    const toDelete = Object.values(SERVER_USER_LISTS_KEYS);
    await Promise.all(toDelete.map(key => this.delete(key)));
    console.log("User lists cleared from data cache");
  },

  clearSeasonData: async function(): Promise<void> {
    await this.delete(Keys.SEASON_DETAILS);
    console.log("Season data cleared from data cache");
  },

  checkCacheTimeout: async function(id: string): Promise<boolean> {
    const timestamp = await this.getTimestamp(id);
    const currentTime = Date.now();
    if (!timestamp || (currentTime - timestamp > ClientCache.consts.CACHE_TIMEOUT)) {
      console.log(`Cache timeout for ${id}; timestamp: ${timestamp}; currentTime: ${currentTime}`);
      await this.delete(id);
      return false;
    }
    return true;
  },

  getFilterStr: async function(): Promise<string | null> {
    return await this.get(ClientCache.Keys.FILTER_STR);
  },

  setFilterStr: async function(filterStr: string): Promise<void> {
    await this.cache(ClientCache.Keys.FILTER_STR, filterStr);
  },

  getLang: async function(): Promise<LanguageCode> {
    return await this.get(ClientCache.Keys.LANG) ?? LANGUAGES.CODES.EN;
  },

  setLang: async function(lang: LanguageCode): Promise<void> {
    await this.cache(ClientCache.Keys.LANG, lang);
  },

  getStats: async function(): Promise<any | null> {
    return await this.get(ClientCache.Keys.STATS);
  },

  setStats: async function(stats: any): Promise<void> {
    await this.cache(Keys.STATS, stats);
  },

};

export default ClientCache; 