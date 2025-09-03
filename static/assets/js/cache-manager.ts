// static/app.js
import { openDB, IDBPDatabase } from 'idb';
import { LanguageCode, LANGUAGES } from './e7/references';

async function clearStore(db: IDBPDatabase<any>, storeName: string) {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  await tx.done;
};

const USER_DATA_KEYS = {
  USER: "current-user",
  BATTLES: "battles",
  RAW_UPLOAD: "raw-upload",
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

const REFERENCE_DATA_KEYS = {
  ...SERVER_USER_LISTS_KEYS,
  ARTIFACTS: "artifacts", // map of artifact codes to names
  ARTIFACTS_LOWERCASE_NAMES_MAP: "artifacts-lowercase-names-map", // map of artifact lowercase names to original names
  ARTIFACT_OBJECT_LIST: "artifact-object-list", // list of artifact objects with id and name fields
  HERO_MANAGER: "hero-manager",
  SEASON_DETAILS: "season-details",
}

const Keys = {
  ...USER_DATA_KEYS,
  ...REFERENCE_DATA_KEYS,
  LANG: "lang",
  AUTO_ZOOM_FLAG: "auto-zoom",
  AUTO_QUERY_FLAG: "auto-query",
  ID_SEARCH_FLAG: "id-search",
  HOME_PAGE_STATE: "home-page-state",
  INTER_PAGE_MANAGER: "inter-page-manager",
} as const;

type Key = typeof Keys[keyof typeof Keys];

// time units in milliseconds
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR   = 60 * MINUTE;
const DAY    = 24 * HOUR;
const WEEK   = 7 * DAY;

const DEFAULT_TIMEOUT = DAY * 2;
const USER_DATA_TIMEOUT = WEEK;
const REFERENCE_DATA_TIMEOUT = DAY;

// Key list for creating custom timeouts
const REFERENCE_DATA_KEY_LIST = Object.values(REFERENCE_DATA_KEYS);
const USER_DATA_KEY_LIST = Object.values(USER_DATA_KEYS).filter((key) => key !== USER_DATA_KEYS.FILTER_STR);

type TimeoutData = readonly [timestamp: number, timeout: number];

function isTimeoutData(data: any): data is TimeoutData {
  return Array.isArray(data) && data.length === 2 && typeof data[0] === 'number' && typeof data[1] === 'number';
}

function getCacheTimeout(key: Key): number {
  if (REFERENCE_DATA_KEY_LIST.includes(key)) return REFERENCE_DATA_TIMEOUT;
  if (USER_DATA_KEY_LIST.includes(key)) return USER_DATA_TIMEOUT;
  return DEFAULT_TIMEOUT
}

function makeTimeoutData(key: Key): TimeoutData {
  return [Date.now(), getCacheTimeout(key)];
}

const DATA_STORE_NAME = 'DataStore' as const;
const META_STORE_NAME = 'MetaStore' as const;

interface DataSchema {
  [DATA_STORE_NAME]: {
    key: string;
    value: any;
  };
  [META_STORE_NAME]: {
    key: string;
    value: TimeoutData;
  };
}


let ClientCache = {
  consts: {
    DB_NAME: 'E7ArenaStatsClientDB',
    DB_VERSION: 1,
    STORE_NAME: DATA_STORE_NAME,
    META_STORE_NAME: META_STORE_NAME,
  },

  Keys: { ...Keys },

  MetaKeys: {
    TIMESTAMP: "timestamp",
  },

  loaded_UM: new Set(),

  openDB: async function() {
     const db = await openDB<DataSchema>(ClientCache.consts.DB_NAME, ClientCache.consts.DB_VERSION, {
      upgrade(db) {
        if (db.objectStoreNames.contains(DATA_STORE_NAME)) {
          db.deleteObjectStore(DATA_STORE_NAME); // 🧹 clear old store
          console.log('Old store deleted');
        }
        if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
          console.log('Created data store');
          db.createObjectStore(DATA_STORE_NAME);
        }
        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
          console.log('Created meta data store');
          db.createObjectStore(META_STORE_NAME);
        }
      }
    });
    return db;
  },

  get: async function (key: string) {
    const db = await this.openDB();
    const result = await db.get(DATA_STORE_NAME, key);
    if (result) {
      console.log(`Found ${key} in cache`);
    } else {
      console.log(`${key} not found in cache; returning null`);
      return null;
    }
    const useCache = await this.checkCacheTimeout(key);
    if (useCache) {
      return result;
    } else {
      return null;
    }
  },

  cache: async function (key: Key, data: any) {
    console.log(`Caching ${key}`);
    const db = await this.openDB();
    await db.put(DATA_STORE_NAME, data, key);
    await this.setTimeoutDataNow(key);
  },

  delete: async function (key: Key) {
    const db = await this.openDB();
    await db.delete(DATA_STORE_NAME, key);
    await this.deleteTimeoutData(key);
  },

  deleteDB: async function () {
    await indexedDB.deleteDatabase(this.consts.DB_NAME);
    console.log('Database deleted');
  },

  getTimeoutData: async function (key: Key): Promise<TimeoutData | null> {
    const db = await this.openDB();
    const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
    const timeoutData: TimeoutData | undefined = await db.get(META_STORE_NAME, metakey);
    return timeoutData || null;
  },

  setTimeoutData: async function (key: Key, timeoutData: TimeoutData): Promise<void> {
    const db = await this.openDB();
    const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
    await db.put(META_STORE_NAME, timeoutData, metakey);
  },

  setTimeoutDataNow: async function (key: Key): Promise<void> {
    const timeoutData = makeTimeoutData(key);
    await this.setTimeoutData(key, timeoutData);
  },

  deleteTimeoutData: async function (key: Key): Promise<void> {
    const db = await this.openDB();
    const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
    await db.delete(META_STORE_NAME, metakey);
    console.log(`Deleted ${key} from cache`);
  },

  clearData: async function (): Promise<void> {
    const db = await this.openDB();
    await clearStore(db, DATA_STORE_NAME);
    await clearStore(db, META_STORE_NAME);
    console.log('All data cleared from data cache and meta data cache');
  },

  clearUserData: async function (): Promise<void> {
    const toDelete = Object.values(USER_DATA_KEYS);
    await Promise.all(toDelete.map(key => this.delete(key)));
    console.log("User data cleared from data cache");
  },


  clearUserLists: async function (): Promise<void> {
    const toDelete = Object.values(SERVER_USER_LISTS_KEYS);
    await Promise.all(toDelete.map(key => this.delete(key)));
    console.log("User lists cleared from data cache");
  },

  clearSeasonData: async function (): Promise<void> {
    await this.delete(Keys.SEASON_DETAILS);
    console.log("Season data cleared from data cache");
  },

  clearReferenceData: async function (): Promise<void> {
    const toDelete = Object.values(REFERENCE_DATA_KEYS);
    await Promise.all(toDelete.map(key => this.delete(key)));
    console.log("Reference data cleared from data cache");
  },

  checkCacheTimeout: async function (key: Key): Promise<boolean> {
    const timeoutData = await this.getTimeoutData(key);
    const currentTime = Date.now();
    if (!timeoutData) {
      console.log("No timeout data found for " + key);
      return false;
    }
    else if (!isTimeoutData(timeoutData)) {
      console.log(`Invalid timeout data found for ${key}; Invalid Timeout Record: ${timeoutData}`);
      await this.delete(key);
      return false;
    }
    const [timestamp, timeout] = timeoutData;
    const timedelta = currentTime - timestamp;
    if (timedelta > timeout) {
      console.log(`Cache timeout for ${key}; Timeout Record: ${timeoutData}; currentTime: ${currentTime}`);
      await this.delete(key);
      return false;
    }
    console.log(`Cache ok for ${key}; Timeout Record: ${timeoutData}; currentTime: ${currentTime}; timeout: ${getCacheTimeout(key)}; diff: ${currentTime - timeoutData[0]}`);
    return true;
  },

  getFilterStr: async function (): Promise<string | null> {
    return await this.get(Keys.FILTER_STR);
  },

  setFilterStr: async function (filterStr: string): Promise<void> {
    await this.cache(Keys.FILTER_STR, filterStr);
  },

  getLang: async function (): Promise<LanguageCode> {
    return await this.get(Keys.LANG) ?? LANGUAGES.CODES.EN;
  },

  setLang: async function (lang: LanguageCode): Promise<void> {
    await this.cache(Keys.LANG, lang);
  },

  getStats: async function (): Promise<any | null> {
    return await this.get(Keys.STATS);
  },

  setStats: async function (stats: any): Promise<void> {
    await this.cache(Keys.STATS, stats);
  },
};

export default ClientCache; 