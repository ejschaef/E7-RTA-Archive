// static/app.js
let ClientCache = {};

ClientCache.consts = {
  DB_NAME: 'E7ArenaStatsClientDB',
  DB_VERSION:  1,
  STORE_NAME: 'DataStore',
};

ClientCache.functions = {

  openDB: async function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(ClientCache.consts.DB_NAME, ClientCache.consts.DB_VERSION);
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(ClientCache.consts.STORE_NAME)) {
          db.createObjectStore(ClientCache.consts.STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = function(event) {
        resolve(event.target.result);
      };
      request.onerror = function(event) {
        reject('DB error: ' + event.target.errorCode);
      };
    });
  },

  saveJSON: async function(id, jsonObject) {
    const db = await ClientCache.functions.openDB();
    const tx = db.transaction(ClientCache.consts.STORE_NAME, 'readwrite');
    const store = tx.objectStore(ClientCache.consts.STORE_NAME);
    store.put({ id, data: jsonObject });
    return tx.complete;
  },

  getJSON: async function(id) {
    const db = await ClientCache.functions.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ClientCache.consts.STORE_NAME, 'readonly');
      const store = tx.objectStore(ClientCache.consts.STORE_NAME);
      const request = store.get(id);
      request.onsuccess = function(event) {
        resolve(event.target.result ? event.target.result.data : null);
      };
      request.onerror = function(event) {
        reject('Get error: ' + event.target.errorCode);
      };
    });
  },

};