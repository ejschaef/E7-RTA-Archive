import ClientCache from "../cache-manager.js";
import { printObjStruct } from './e7-utils.js';
import PYAPI from '../pyAPI.js'

let UserManager = {

  loaded_servers: new Set(),

  getUser: async function() {
    return (await ClientCache.getJSON(ClientCache.Keys.USER)) ?? this.fetchAndCacheUser();
  },

  fetchAndCacheUser: async function() {
    const user = await PYAPI.fetchUser();
    await ClientCache.setJSON(ClientCache.Keys.USER, user);
    console.log("Cached user data from python");
    printObjStruct(user);
    return user;
  },

  removeUser: async function() {
    await ClientCache.deleteJSON(ClientCache.Keys.USER);
    console.log("Removed user data from cache");
  }
}

export default UserManager;