import ClientCache from "../cache-manager.js";
import { printObjStruct } from './e7-utils.js';
import PYAPI from '../pyAPI.js'

function battleListToDict(battleList) {
    let battle_dict = {};
    for (let battle of battleList) {
      battle_dict[battle.seq_num] = battle;
    }
    return battle_dict;
}

let BattleManager = {

  loaded_servers: new Set(),

  getBattles: async function() {
    return (await ClientCache.getJSON(ClientCache.Keys.BATTLES)) ?? this.fetchAndCacheBattles();
  },

  fetchAndCacheBattles: async function() {
    const uploadedBattlesList = await ClientCache.getJSON(ClientCache.Keys.UPLOADED_BATTLES) ?? null;
    if (uploadedBattlesList) {
        await this.extendBattles(uploadedBattlesList);
        console.log("Loaded uploaded battles from cache");
    }
    const battlesList = await this.fetchBattlesList();
    return await this.extendBattles(battlesList);
  },

  // Will fetch the last 100 battles from E7 API from flask server based on the current user stored in session
  fetchBattlesList: async function() {
    const battlesList = await PYAPI.fetchBattleData();
    printObjStruct(battlesList);
    return battlesList;
  },

  fetchUploadedBattles: async function() {
    const battlesList = await ClientCache.getJSON(ClientCache.Keys.UPLOADED_BATTLES) ?? {};
    printObjStruct(battlesList);
    return battlesList;
  },

  removeBattles: async function() {
    await ClientCache.deleteJSON(ClientCache.Keys.BATTLES);
    console.log("Removed user data from cache");
  },

  //takes in list of battles then converts to dict and then adds to cached battles
  extendBattles: async function(battleList) {
    oldDict = await ClientCache.getJSON(ClientCache.Keys.BATTLES) ?? {};
    newDict = { ...oldDict, ...battleListToDict(battleList) };
    await ClientCache.setJSON(ClientCache.Keys.BATTLES, newDict);
    console.log("Extended user data in cache");
    return newDict;
  },

  //Takes uploaded battles and sets as battles in cache without querying new battles
  ingestUpload: async function(battleList) {
    await this.extendBattles(battleList);
    console.log("Ingested uploaded battle data into cache");
  },

}

export default UserManager;