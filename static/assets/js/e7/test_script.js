import { WORLD_CODES } from "./references.js"

console.log([...WORLD_CODES]);

let ClientCache = {};

ClientCache = {
  consts: {
    DB_NAME: 'E7ArenaStatsClientDB',
    DB_VERSION:  1,
    STORE_NAME: 'DataStore',
  },

  Keys: {
    USER_MANAGER: "user-manager",
    HERO_MANAGER: "hero-manager"
  }
};

console.log(ClientCache.Keys.USER_MANAGER)