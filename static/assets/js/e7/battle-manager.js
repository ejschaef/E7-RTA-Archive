import ClientCache from "../cache-manager.js";
import { generateRankPlot } from "./plots.js";
import { COLUMNS } from "./references.js";
import FilterSyntaxParser from "./filter-syntax-parser.js";
import StatsBuilder from "./stats-builder.js";
import { buildFormattedBattleMap, parsedCSVToFormattedBattleMap } from "./battle-transform.js";

const HERO_COLUMNS = COLUMNS.filter(col => col.includes(" Pick ") || col.includes("ban "));

function cleanUploadedBattle(battle) {
    for (let col of HERO_COLUMNS) {
        battle[col] = battle[col] ? battle[col] : "Empty"
    }
    battle["P1 Points"] = Number(battle["P1 Points"]) || battle["P1 Points"];
    battle["P1 Picks"] = [battle["P1 Pick 1"], battle["P1 Pick 2"], battle["P1 Pick 3"], battle["P1 Pick 4"], battle["P1 Pick 5"]];
    battle["P2 Picks"] = [battle["P2 Pick 1"], battle["P2 Pick 2"], battle["P2 Pick 3"], battle["P2 Pick 4"], battle["P2 Pick 5"]];
    battle["P1 Prebans"] = [battle["P1 Preban 1"], battle["P1 Preban 2"]];
    battle["P2 Prebans"] = [battle["P2 Preban 1"], battle["P2 Preban 2"]];
    return battle;
}


let BattleManager = {

  loaded_servers: new Set(),

  // gets battles (upload and/or queried) and returns as list in clean format; used directly to populate battles table
  getBattles: async function() {
    console.log("Getting battles");
    return (await ClientCache.get(ClientCache.Keys.BATTLES)) ?? null;
  },

  // Removes all user battle data from cache, should be called when user is switched out
  removeBattles: async function() {
    await ClientCache.delete(ClientCache.Keys.BATTLES);
    await ClientCache.delete(ClientCache.Keys.UPLOADED_BATTLES);
    await ClientCache.delete(ClientCache.Keys.FILTERED_BATTLES);
    console.log("Removed battle data from cache; cleared ['BATTLES', 'UPLOADED_BATTLES', 'FILTERED_BATTLES']");
  },

  removeFilteredBattles: async function() {
    await ClientCache.delete(ClientCache.Keys.FILTERED_BATTLES);
    console.log("Removed filtered battle data from cache; cleared ['FILTERED_BATTLES']");
  },

  /* after battles are set in cache, applies filters to the battles and stores filtered arr in cache under filtered 
  battle key all battles are stored in their clean format, not numerical format; convert after to compute metrics */
  applyFilter: async function(filters) {
    let battles = await this.getBattles();
    const localFilterList = filters.localFilters || [];
    const globalFilterList = filters.globalFilters || [];

    // apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
    let battleList = Object.values(battles);
    for (let filter of globalFilterList) {
      console.log(`Applying global filter: ${filter}`);
      const startLen = battleList.length;
      battleList = filter.call(battleList);
      battles = Object.fromEntries(battleList.map(b => [b["Seq Num"], b]));
      console.log(`Filtered ${startLen - battleList.length} out of ${startLen}; new total = ${battleList.length}`);
    }

    // apply local filters (filters that can be resolved on each battle without context of other battles)
    for (let filter of localFilterList) {
      console.log(`Applying local filter: ${filter}`);
      const startLen = Object.keys(battles).length;
      battles = Object.fromEntries(
          Object.entries(battles).filter(([key, battle]) => {
            const include = filter.call(battle);
            //console.log(`Filtering battle: ${key} ${include ? "included" : "excluded"}`);
            return include;
        })
      )
      console.log(`Filtered ${startLen - Object.keys(battles).length} out of ${startLen}; new total = ${Object.keys(battles).length}`);
    }

    console.log(`Caching filtered battles ; total = ${Object.keys(battles).length}`);
    await ClientCache.cache(ClientCache.Keys.FILTERED_BATTLES, battles);
    console.log(`Filtered battles and stored in cache; modified ['FILTERED_BATTLES']; Applied total of <${localFilterList.length + globalFilterList.length}> filters`);
    return battles;
  },

  // should be called when computing metrics
  getNumericalBattles: async function(battles, HM) {
    const mapFn = (key, battle) => [key, formatBattleNumerical(battle, HM)];
    const numericalBattles = Object.fromEntries(
            Object.entries(battles).map(([key, battle]) => mapFn(key, battle))
        )
    //console.log("Converted filtered battles from cache to numerical format; returning:" + JSON.stringify(numericalBattles) + " battles"  );
    return numericalBattles;
  },

  //takes in list of battles then converts to dict and then adds to cached battles
  extendBattles: async function(cleanBattleMap) {
    let oldDict = await ClientCache.get(ClientCache.Keys.BATTLES) ?? {};

    // new battles automatically overwrite old ones if they share same seq_num
    const newDict = { ...oldDict, ...cleanBattleMap };
    await ClientCache.cache(ClientCache.Keys.BATTLES, newDict);
    console.log("Extended user data in cache");
    return newDict;
  },

  //Takes queried battles, clean format and extend in cache
  cacheQuery: async function(battleList,  HM, artifacts) {
    if (!battleList) {
        console.log("No query battles provided to cacheQuery");
        return [];
    }
    console.log(`Caching queried battles: ${battleList.length} battles; modified [BATTLES]`);
    const cleanBattleMap = buildFormattedBattleMap(battleList, HM, artifacts);
    
    const battles = await this.extendBattles(cleanBattleMap);
    console.log("Cached queried battles in cache; modified [BATTLES]");
    return battles;
  },

  //Takes uploaded battles and sets as battles in cache, should be called before attempting to get battles if upload exists
  cacheUpload: async function(rawParsedBattleList, HM) {
    if (!rawParsedBattleList) {
        console.error("No uploaded battles provided to cacheUpload");
        return {};
    }
    const cleanBattles = parsedCSVToFormattedBattleMap(rawParsedBattleList, HM);
    await ClientCache.cache(ClientCache.Keys.UPLOADED_BATTLES, cleanBattles);
    let battles = await this.extendBattles(cleanBattles);
    console.log("Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]");
    return battles;
  },


  getStats: async function(battles, user, filters, HM, autoZoom) {
    console.log("Getting stats");
    const numFilters = filters.localFilters.length + filters.globalFilters.length;

    console.log(`Applying ${numFilters} filters`);
    const filteredBattles = await this.applyFilter(filters);
    const battlesList = Object.values(battles);
    const filteredBattlesList = Object.values(filteredBattles);
    const plotContent = generateRankPlot(
      battlesList, 
      user, numFilters > 0 ? filteredBattles : null, autoZoom
    );


    console.log("Getting preban stats");
    const prebanStats = await StatsBuilder.getPrebanStats(filteredBattles, HM);
    console.log("Getting first pick stats");
    const firstPickStats = await StatsBuilder.getFirstPickStats(filteredBattles, HM);
    console.log("Getting general stats");
    const generalStats = await StatsBuilder.getGeneralStats(filteredBattles, HM);
    console.log("Getting hero stats");
    const heroStats = await StatsBuilder.getHeroStats(filteredBattles, HM);
    console.log("Getting server stats");
    const serverStats = await StatsBuilder.getServerStats(filteredBattlesList);

    console.log("Returning stats");
    return {
      battles : battlesList,
      filteredBattles: filteredBattlesList,
      plotContent : plotContent,
      prebanStats: prebanStats,
      generalStats: generalStats,
      firstPickStats: firstPickStats,
      playerHeroStats: heroStats.playerHeroStats,
      enemyHeroStats: heroStats.enemyHeroStats,
      serverStats: serverStats,
    }
  },
}

export default BattleManager;