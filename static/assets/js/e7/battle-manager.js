import ClientCache from "../cache-manager.js";
import { printObjStruct } from './e7-utils.js';
import HeroManager from "./hero-manager.js";
import { LEAGUE_MAP } from "./references.js";
import { generateRankPlot } from "./plots.js";
import { COLUMNS } from "./references.js";

const HERO_COLUMNS = COLUMNS.filter(col => col.includes(" Pick ") || col.includes("ban "));

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
    //console.log(`Formatting battle: ${JSON.stringify(raw)}`);
    const getChampName = code => HeroManager.getHeroByCode(code, HM)?.name ?? HM.Fodder.name;
    const battle = {
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
    battle["P1 Picks"] = [battle["P1 Pick 1"], battle["P1 Pick 2"], battle["P1 Pick 3"], battle["P1 Pick 4"], battle["P1 Pick 5"]];
    battle["P2 Picks"] = [battle["P2 Pick 1"], battle["P2 Pick 2"], battle["P2 Pick 3"], battle["P2 Pick 4"], battle["P2 Pick 5"]];
    battle["P1 Prebans"] = [battle["P1 Preban 1"], battle["P1 Preban 2"]];
    battle["P2 Prebans"] = [battle["P2 Preban 1"], battle["P2 Preban 2"]];
    return battle;
}

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

function formatBattleNumerical(cleanBattle, HM) {
    // console.log(`Formatting battle: ${JSON.stringify(cleanBattle)}`);
    const getChampPrime = name => HeroManager.getHeroByName(name, HM).prime;
    return {
        "Date/Time": cleanBattle["Date/Time"],
        "Seq Num": new Date(`${cleanBattle["Seq Num"].split(" ")[0]}T00:00:00`),
        "P1 ID": cleanBattle["P1 ID"],
        "P2 ID": cleanBattle["P2 ID"],
        "P1 League": LEAGUE_MAP[cleanBattle["P1 League"]] ?? "",
        "P2 League": LEAGUE_MAP[cleanBattle["P2 League"]] ?? "",
        "P1 Points": cleanBattle["P1 Points"],
        "Win": cleanBattle.Win === "W" ? 1 : 0,
        "Firstpick": cleanBattle.Firstpick === "True" ? 1 : 0,
        "P1 Preban 1": getChampPrime(cleanBattle["P1 Preban 1"]),
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
        "P1 Picks": cleanBattle["P1 Picks"].map(getChampPrime).reduce((acc, val) => acc * val, 1), //take prime product to get sets
        "P2 Picks": cleanBattle["P2 Picks"].map(getChampPrime).reduce((acc, val) => acc * val, 1),
        "P1 Prebans": cleanBattle["P1 Prebans"].map(getChampPrime).reduce((acc, val) => acc * val, 1),
        "P2 Prebans": cleanBattle["P2 Prebans"].map(getChampPrime).reduce((acc, val) => acc * val, 1),
    };
}

function toPercent(value) {
    return (value * 100).toFixed(2) + '%';
}

function queryStats(battleList, totalBattles) {
  const gamesWon = battleList.filter(b => b.Win).length;
  const gamesAppeared = battleList.length;
  const appearanceRate = totalBattles !== 0 ? gamesAppeared / totalBattles : 0;
  const winRate = gamesAppeared !== 0 ? gamesWon / gamesAppeared : 0;

  return {
      games_won: gamesWon,
      games_appeared: gamesAppeared,
      total_games: totalBattles,
      appearance_rate: toPercent(appearanceRate),
      win_rate: toPercent(winRate),
      '+/-': 2 * gamesWon - gamesAppeared
  };
}

function getHeroStats(battles, HM) {
  const heroes = HM.heroes;
  const battleList = Object.values(battles);
  if (battleList.length === 0) {
      return {playerHeroStats: [], enemyHeroStats: []};
  }
  const totalBattles = battleList.length;
  const playerHeroStats = [];
  const enemyHeroStats = [];
  for (const hero of heroes) {
    if (hero.name === HM.Empty.name) {
      continue;
    }
    const prime = hero.prime;
    const playerSubset = battleList.filter( b => b["P1 Picks"] % prime === 0 );
    const enemySubset = battleList.filter( b => b["P2 Picks"] % prime === 0);
    if (playerSubset.length > 0) {
      playerHeroStats.push({...queryStats(playerSubset, totalBattles), hero: hero.name});
    }
    if (enemySubset.length > 0) {
      enemyHeroStats.push({...queryStats(enemySubset, totalBattles), hero: hero.name});
    }
  }
  return {
    playerHeroStats: playerHeroStats.sort((b1, b2) => b1.hero.localeCompare(b2.hero)), 
    enemyHeroStats: enemyHeroStats.sort((b1, b2) => b1.hero.localeCompare(b2.hero))
  }
}

function getFirstPickStats(battles, HM) {
    const battleList = Object.values(battles).filter(b => b["Firstpick"]);

    if (battleList.length === 0) {
      return [];
    }

    const totalBattles = battleList.length;

    const grouped = {};
    for (const b of battleList) {
        const hero = b["P1 Pick 1"];
        if (!(hero in grouped)) grouped[hero] = { wins: 0, appearances: 0 };
        grouped[hero].wins += b["Win"] ? 1 : 0;
        grouped[hero].appearances += 1;
    }

    const result = Object.entries(grouped).map(([prime, stats]) => {
        const name = HeroManager.getHeroByPrime(prime, HM).name;
        return {
            hero: name,
            wins: stats.wins,
            appearances: stats.appearances,
            win_rate: toPercent(stats.wins / stats.appearances),
            appearance_rate: toPercent(stats.appearances / totalBattles),
            '+/-': 2 * stats.wins - stats.appearances
        };
    });

    result.sort((a, b) => b.appearances - a.appearances);
    return result;
}

function getPrebanStats(battles, HM) {
    //console.log(`Got HM: ${HM}`);
    const emptyPrime = HeroManager.getHeroByName('Empty', HM).prime;

    const battleList = Object.values(battles);

    if (battleList.length === 0) {
      return [];
    }

    const getValidPrimes = (col) =>
        [...new Set(battleList)].map(b => b[col]).filter(p => p && p !== emptyPrime);

    const preban1 = getValidPrimes('P1 Preban 1');
    const preban2 = getValidPrimes('P1 Preban 2');
    const prebanSet = new Set([...preban1, ...preban2]);

    let prebans = [];
    for (const prime of prebanSet) {
        prebans.push(prime);
    }
    for (const a of prebanSet) {
        for (const b of prebanSet) {
            if (a < b) prebans.push(a * b);
        }
    }
    //console.log("Prebans:", prebans);

    const totalBattles = battleList.length;
    const output = [];

    for (const preban of prebans) {
        const filtered = battleList.filter(b => b["P1 Prebans"] % preban === 0);
        const appearances = filtered.length;
        if (appearances < 1) {
          continue;
        }
        const wins = filtered.reduce((acc, b) => acc + b.Win, 0);
        
        const appearanceRate = totalBattles > 0 ? appearances / totalBattles : 0;
        const winRate = appearances > 0 ? wins / appearances : 0;
        const plusMinus = 2 * wins - appearances;

        output.push({
            preban: HM.prime_pair_lookup[preban],
            wins: wins,
            appearances: appearances,
            appearance_rate: toPercent(appearanceRate),
            win_rate: toPercent(winRate),
            '+/-': plusMinus
        });
    }

    output.sort((a, b) => b.appearances - a.appearances);
    return output;
}

function getGeneralStats(battles, HM) {
        const totalBattles = Object.values(battles).length;

        const fpBattles = Object.values(battles).filter(b => b["Firstpick"] === 1);
        const spBattles = Object.values(battles).filter(b => b["Firstpick"] !== 1);

        const fpCount = fpBattles.length;
        const spCount = spBattles.length;

        const fpWins = fpBattles.reduce((acc, b) => acc + b.Win, 0);
        const spWins = spBattles.reduce((acc, b) => acc + b.Win, 0);

        const fpR = totalBattles? fpCount / totalBattles : 0;
        const spR = totalBattles? spCount / totalBattles : 0;

        const fpWR = fpCount? fpWins / fpCount : 0;
        const spWR = spCount? spWins / spCount : 0;

        const winRate = totalBattles? (fpWins + spWins) / totalBattles : 0;

        const NA = "N/A";

        return {
            "firstpick_count"   : fpCount,
            "secondpick_count"  : spCount,
            "firstpick_rate"    : fpCount? toPercent(fpR) : NA,
            "secondpick_rate"   : spCount? toPercent(spR) : NA,
            "firstpick_winrate" : fpCount? toPercent(fpWR) : NA,
            "secondpick_winrate": spCount? toPercent(spWR) : NA,
            "total_winrate"     : totalBattles? toPercent(winRate) : NA,
            "total_battles"     : totalBattles,
        }
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
  applyFilter: async function(filterList) {
    filterList = filterList || [];
    let battles = await this.getBattles();
    for (let filter of filterList) {
      console.log(`Applying filter: ${filter}`);
      const startLen = Object.keys(battles).length;
      battles = Object.fromEntries(
          Object.entries(battles).filter(([key, battle]) => {
            const include = filter.call(battle);
            console.log(`Filtering battle: ${key} ${include ? "included" : "excluded"}`);
            return include;
        })
      )
      console.log(`Filtered ${startLen - Object.keys(battles).length} out of ${startLen}; new total = ${Object.keys(battles).length}`);
    }
    console.log(`Caching filtered battles ; total = ${Object.keys(battles).length}`);
    await ClientCache.cache(ClientCache.Keys.FILTERED_BATTLES, battles);
    console.log(`Filtered battles and stored in cache; modified ['FILTERED_BATTLES']; Applied total of <${filterList.length}> filters`);
    return battles;
  },

  // should be called to compute metrics
  getNumericalFilteredBattles: async function(filterList, HM) {
    const battles = await this.applyFilter(filterList);
    const mapFn = (key, battle) => [key, formatBattleNumerical(battle, HM)];
    const numericalBattles = Object.fromEntries(
            Object.entries(battles).map(([key, battle]) => mapFn(key, battle))
        )
    //console.log("Converted filtered battles from cache to numerical format; returning:" + JSON.stringify(numericalBattles) + " battles"  );
    return numericalBattles;
  },

  //takes in list of battles then converts to dict and then adds to cached battles
  extendBattles: async function(cleanBattleList) {
    let oldDict = await ClientCache.get(ClientCache.Keys.BATTLES) ?? {};
    const newDict = { ...oldDict, ...battleListToDict(cleanBattleList) };
    await ClientCache.cache(ClientCache.Keys.BATTLES, newDict);
    console.log("Extended user data in cache");
    return newDict;
  },

  //Takes queried battles, clean format and extend in cache
  cacheQuery: async function(battleList, HM) {
    if (!battleList) {
        console.log("No query battles provided to cacheQuery");
        return [];
    }
    console.log(`Caching queried battles: ${battleList} battles; modified [BATTLES]`);
    const mapFn = battle => formatBattleClean(battle, HM);
    const cleanBattles = battleList.map(mapFn);
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
    await ClientCache.cache(ClientCache.Keys.UPLOADED_BATTLES, cleanBattles);
    let battles = await this.extendBattles(cleanBattles);
    console.log("Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]");
    return battles;
  },


  getStats: async function(battles, user, filters, HM) {
    const filteredBattles = await this.getNumericalFilteredBattles(filters, HM);
    const plotContent = generateRankPlot(Object.values(battles), user, filters.length >= 1 ? filteredBattles : null);
    const prebanStats = await this.getPrebanStats(filteredBattles, HM);
    const firstpickStats = await this.getFirstPickStats(filteredBattles, HM);
    const generalStats = await this.getGeneralStats(filteredBattles, HM);
    const heroStats = await this.getHeroStats(filteredBattles, HM);

    return {
      battles : Object.values(battles),
      plotContent : plotContent,
      prebanStats: prebanStats,
      generalStats: generalStats,
      firstpickStats: firstpickStats,
      playerHeroStats: heroStats.playerHeroStats,
      enemyHeroStats: heroStats.enemyHeroStats
    }
  },

  getPrebanStats    : getPrebanStats,
  getFirstPickStats : getFirstPickStats,
  getGeneralStats   : getGeneralStats,
  getHeroStats      : getHeroStats
}

export default BattleManager;