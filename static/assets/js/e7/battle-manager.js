import ClientCache from "../cache-manager.js";
import { printObjStruct } from './e7-utils.js';
import PYAPI from '../pyAPI.js'
import HeroManager from "./hero-manager.js";

const COLUMNS = [
    "Date/Time", "Seq Num", "P1 ID", "P2 ID", 
    "P1 League", "P2 League", "P1 Points", "Win", "Firstpick", 
    "P1 Preban 1", "P1 Preban 2", "P2 Preban 1", "P2 Preban 2", 
    "P1 Pick 1", "P1 Pick 2", "P1 Pick 3", "P1 Pick 4", "P1 Pick 5", 
    "P2 Pick 1", "P2 Pick 2", "P2 Pick 3", "P2 Pick 4", "P2 Pick 5", 
    "P1 Postban", "P2 Postban"];

const HERO_COLUMNS = COLUMNS.filter(col => col.includes(" Pick ") || col.includes("ban "));

const LEAGUE_MAP = {
    "bronze" : 0,
    "silver" : 1,
    "gold" : 2,
    "master" : 3,
    "challenger" : 4,
    "champion" : 5,
    "warlord" : 6,
    "emperor" : 7,
    "legend" : 8
}


function battleListToDict(battleList) {
    let battle_dict = {};
    console.log(`Processing ${battleList.length} battles into dict...`);
    for (let battle of battleList) {
        console.log(`Processing battle: ${battle}`);
        battle_dict[battle["Seq Num"]] = battle;
    }
    return battle_dict;
}

// takes the raw battles recieved from flask-server and converts to clean format we will serve in battles table user can download from
function formatBattleClean(raw, HM) {
  const getChampName = code => HM.code_lookup[code].name ?? code;
  return {
    "Date/Time": raw.time,
    "Seq Num": raw.seq_num,
    "P1 ID": raw.p1_id.toString(),
    "P2 ID": raw.p2_id.toString(),
    "P1 League": raw.grades[0] ?? "",
    "P2 League": raw.grades[1] ?? "",
    "P1 Points": raw.scores[0] ?? null,
    "Win": raw.winner === 1 ? "W" : "L",
    "Firstpick": raw.firstpick === 1 ? "True" : "False",
    "P1 Preban 1": getChampName(raw.p1_preban[0]),
    "P1 Preban 2": getChampName(raw.p1_preban[1]),
    "P2 Preban 1": getChampName(raw.p2_preban[0]),
    "P2 Preban 2": getChampName(raw.p2_preban[1]),
    "P1 Pick 1": getChampName(raw.p1_picks[0]),
    "P1 Pick 2": getChampName(raw.p1_picks[1]),
    "P1 Pick 3": getChampName(raw.p1_picks[2]),
    "P1 Pick 4": getChampName(raw.p1_picks[3]),
    "P1 Pick 5": getChampName(raw.p1_picks[4]),
    "P2 Pick 1": getChampName(raw.p2_picks[0]),
    "P2 Pick 2": getChampName(raw.p2_picks[1]),
    "P2 Pick 3": getChampName(raw.p2_picks[2]),
    "P2 Pick 4": getChampName(raw.p2_picks[3]),
    "P2 Pick 5": getChampName(raw.p2_picks[4]),
    "P1 Postban": getChampName(raw.postbans[1]),
    "P2 Postban": getChampName(raw.postbans[0]),
  };
}

function cleanUploadedBattle(battle) {
    for (let col of HERO_COLUMNS) {
        battle[col] = battle[col] ? battle[col] : "Empty"
    }
    battle["P1 Points"] = Number(battle["P1 Points"]) || battle["P1 Points"];
    return battle;
}

function formatBattleNumerical(cleanBattle, HM) {
    const getChampPrime = name => HM.name_lookup[name].prime ?? code;
    return {
        "Date/Time": cleanBattle["Date/Time"],
        "Seq Num": cleanBattle["Seq Num"],
        "P1 ID": cleanBattle["P1 ID"],
        "P2 ID": cleanBattle["P2 ID"],
        "P1 League": LEAGUE_MAP[cleanBattle["P1 League"]] ?? "",
        "P2 League": LEAGUE_MAP[cleanBattle["P2 League"]] ?? "",
        "P1 Points": cleanBattle["P1 Points"],
        "Win": cleanBattle.Win = "W" ? 1 : 0,
        "Firstpick": cleanBattle.Firstpick === "True" ? 1 : 0,
        "P1 Preban 1": getChampPrime(cleanBattle["P1 Preban"]),
        "P1 Preban 2": getChampPrime(cleanBattle["P1 Preban 2"]),
        "P2 Preban 1": getChampPrime(cleanBattle["P2 Preban 1"]),
        "P2 Preban 2": getChampPrime(cleanBattle["P2 Preban 2"]),
        "P1 Pick 1": getChampPrime(cleanBattle["P1 Pick 1"]),
        "P1 Pick 2": getChampPrime(cleanBattle["P1 Pick 2"]),
        "P1 Pick 3": getChampPrime(cleanBattle["P1 Pick 3"]),
        "P1 Pick 4": getChampPrime(cleanBattle["P1 Pick 4"]),
        "P1 Pick 5": getChampPrime(cleanBattle["P1 Pick 5"]),
        "P2 Pick 1": getChampPrime(cleanBattle["P2 Pick 1"]),
        "P2 Pick 2": getChampPrime(cleanBattle["P2 Pick 2"]),
        "P2 Pick 3": getChampPrime(cleanBattle["P2 Pick 3"]),
        "P2 Pick 4": getChampPrime(cleanBattle["P2 Pick 4"]),
        "P2 Pick 5": getChampPrime(cleanBattle["P2 Pick 5"]),
        "P1 Postban": getChampPrime(cleanBattle["P1 Postban"]),
        "P2 Postban": getChampPrime(cleanBattle["P2 Postban"]),
    };
}

let BattleManager = {

  loaded_servers: new Set(),

  // gets battles (upload and/or queried) and returns as list in clean format; used directly to populate battles table
  getBattles: async function(HM) {
    console.log("Getting battles");
    return (await ClientCache.getJSON(ClientCache.Keys.BATTLES)) ?? this.fetchAndCacheBattles(HM);
  },

  fetchAndCacheBattles: async function(HM) {
    console.log(`Battles not found in cache, fetching and caching...;`);
    const queriedBattleList = await this.fetchBattlesList();
    const battles = await this.cacheQuery(queriedBattleList, HM);
    console.log("Fetched new battles from E7 API");
    return battles;
  },

  // Will fetch the last 100 battles from E7 API from flask server based on the current user stored in session
  fetchBattlesList: async function() {
    const battlesList = await PYAPI.fetchBattleData();
    return battlesList;
  },

  fetchUploadedBattles: async function() {
    const battlesList = await ClientCache.getJSON(ClientCache.Keys.UPLOADED_BATTLES) ?? {};
    printObjStruct(battlesList);
    return battlesList;
  },

  // Removes all user battle data from cache, should be called when user is switched out
  removeBattles: async function() {
    await ClientCache.deleteJSON(ClientCache.Keys.BATTLES);
    await ClientCache.deleteJSON(ClientCache.Keys.UPLOADED_BATTLES);
    await ClientCache.deleteJSON(ClientCache.Keys.FILTERED_BATTLES);
    console.log("Removed battle data from cache; cleared ['BATTLES', 'UPLOADED_BATTLES', 'FILTERED_BATTLES']");
  },

  removeFilteredBattles: async function() {
    await ClientCache.deleteJSON(ClientCache.KEYS.FILTERED_BATTLES);
    console.log("Removed filtered battle data from cache; cleared ['FILTERED_BATTLES']");
  },

  /* after battles are set in cache, applies filters to the battles and stores filtered arr in cache under filtered 
  battle key all battles are stored in their clean format, not numerical format; convert after to compute metrics */
  applyFilter: async function(filterList) {
    filterList = filterList || [];
    let battles = await this.getBattles();
    for (let filter of filterList) {
        battles = battles.filter(battle => filter(battle));
    }
    await ClientCache.setJSON(ClientCache.KEYS.FILTERED_BATTLES, battles);
    console.log(`Filtered battles and stored in cache; modified ['FILTERED_BATTLES']; Applied total of <${filterList.length}> filters`);
    return battles;
  },

  // should be called to compute metrics
  getNumericalFilteredBattles: async function(filterList, HM) {
    HM = HM || await HeroManager.getHeroManager();
    const battles = await this.applyFilter(filterList);
    const mapFn = battle => formatBattleNumerical(battle, HM);
    const numericalBattles = battles.map(mapFn);
    console.log("Converted filtered battles from cache to numerical format; returning");
    return numericalBattles;
  },

  //takes in list of battles then converts to dict and then adds to cached battles
  extendBattles: async function(cleanBattleList) {
    let oldDict = await ClientCache.getJSON(ClientCache.Keys.BATTLES) ?? {};
    const newDict = { ...oldDict, ...battleListToDict(cleanBattleList) };
    await ClientCache.setJSON(ClientCache.Keys.BATTLES, newDict);
    console.log("Extended user data in cache");
    return newDict;
  },

  //Takes queried battles, clean format and extend in cache
  cacheQuery: async function(battleList, HM) {
    if (!battleList) {
        console.log("No query battles provided to cacheQuery");
        return [];
    }
    HM = HM || await HeroManager.getHeroManager();
    const mapFn = battle => formatBattleClean(battle, HM);
    const cleanBattles = battleList.map(mapFn);
    await ClientCache.setJSON(ClientCache.KEYS.QUERIED_BATTLES, cleanBattles);
    const battles = await this.extendBattles(cleanBattles);
    console.log("Cached queried battles in cache; modified [BATTLES]");
    return battles;
  },

  //Takes uploaded battles and sets as battles in cache, should be called before attempting to get battles if upload exists
  cacheUpload: async function(battleList) {
    if (!battleList) {
        console.log("No uploaded battles provided to cacheUpload");
        return [];
    }
    const cleanBattles = battleList.map(cleanUploadedBattle);
    await ClientCache.setJSON(ClientCache.Keys.UPLOADED_BATTLES, cleanBattles);
    let battles = await this.extendBattles(cleanBattles);
    console.log("Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]");
    return battles;
  },

}

export default BattleManager;