// static/app.js
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8.0.3/+esm';


let ClientCache = {
  consts: {
    DB_NAME: 'E7ArenaStatsClientDB',
    DB_VERSION:  1,
    STORE_NAME: 'DataStore',
    META_STORE_NAME: 'MetaStore',
    CACHE_TIMEOUT: 1000 * 60 * 60 * 24 * 2, // 2 day cache timeout
  },

  Keys: {
    USER: "current-user",
    HERO_MANAGER: "hero-manager",
    BATTLES: "battles",
    UPLOADED_BATTLES: "uploaded-battles",
    FILTERED_BATTLES: "filtered-battles",
  },

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

  getJSON: async function(id) {
    await this.checkCacheTimeout(id);
    const db = await this.openDB();
    const result = await db.get(this.consts.STORE_NAME, id);
    if (result) {
      console.log(`Returning ${id} from cache: ${result}`);
    } else {
      console.log(`${id} not found in cache; returning null`);
    }
    return result ?? null;
  },

  setJSON: async function(id, data) {
    const db = await this.openDB();
    await db.put(this.consts.STORE_NAME, data, id);
    await this.setTimestamp(id, Date.now());
  },

  deleteJSON: async function(id) {
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
    const tx = db.transaction(this.consts.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.consts.STORE_NAME);
    store.clear();
    await tx.done; // optional, if using promises to track when complete
    console.log('All data cleared from data cache');
  },

  clearUserData: async function() {
    [this.Keys.USER, this.Keys.BATTLES, this.Keys.UPLOADED_BATTLES, this.Keys.FILTERED_BATTLES].forEach(async key => {
      await this.deleteJSON(key);
    });
    console.log("User data cleared from data cache");
  },

  checkCacheTimeout: async function(id) {
    const timestamp = await this.getTimestamp(id);
    const currentTime = Date.now();
    console.log(`Checking Timeout for <${id}> | Current time: ${currentTime}, cache timestamp: ${timestamp}, difference: ${currentTime - timestamp} ms`);
    if (!timestamp || (currentTime - timestamp > ClientCache.consts.CACHE_TIMEOUT)) {
      console.log(`Cache timeout reached, clearing data from <${id}>`);
      await this.deleteJSON(id);
    }
  },
};

export default ClientCache;