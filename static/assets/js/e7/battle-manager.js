import ClientCache from "../cache-manager.js";
import HeroManager from "./hero-manager.js";
import { LEAGUE_MAP, WORLD_CODE_TO_CLEAN_STR } from "./references.js";
import { generateRankPlot } from "./plots.js";
import { COLUMNS } from "./references.js";
import FilterSyntaxParser from "./filter-syntax-parser.js";
import UserManager from "./user-manager.js";

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

    // server columns not included since they are added later during cacheQuery by utilizing UserManager
    const battle = {
        "Date/Time": raw.time,
        "Seq Num": raw.seq_num,
        "P1 ID": raw.p1_id.toString(),
        "P2 ID": raw.p2_id.toString(),
        "P1 League": raw.grades[0] ?? "",
        "P2 League": raw.grades[1] ?? "",
        "P1 Points": raw.scores[0] ?? null,
        "Win": raw.winner === 1 ? "W" : "L",
        "First Pick": raw.first_pick === 1 ? "True" : "False",
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

/* 
formatBattleNumerical takes our cleaned battle format from above and converts to numerical format so that we can more easily compute stats
Note that filters are applied to the cleaned format before this not the numerical format
*/ 
function formatBattleNumerical(cleanBattle, HM) {
    // console.log(`Formatting battle: ${JSON.stringify(cleanBattle)}`);
    const getChampPrime = name => HeroManager.getHeroByName(name, HM).prime;
    return {
        "Date/Time": cleanBattle["Date/Time"],
        "Seq Num": cleanBattle["Seq Num"],
        "P1 ID": cleanBattle["P1 ID"],
        "P2 ID": cleanBattle["P2 ID"],
        "P1 League": LEAGUE_MAP[cleanBattle["P1 League"]] ?? "",
        "P2 League": LEAGUE_MAP[cleanBattle["P2 League"]] ?? "",
        "P1 Points": cleanBattle["P1 Points"],
        "Win": cleanBattle.Win === "W" ? 1 : 0,
        "First Pick": cleanBattle["First Pick"] === "True" ? 1 : 0,
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
    const battleList = Object.values(battles).filter(b => b["First Pick"]);

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
  const battleList = Object.values(battles);
  battleList.sort((b1, b2) => new Date(b1["Date/Time"]) - new Date(b2["Date/Time"]));

  let totalGain = 0;
  let battlesConsidered = 0;
  if (battleList.length > 1) {
    for (let i = 0; i < battleList.length - 1; i++) {
      const [b1, b2] = [battleList[i], battleList[i + 1]];
      const pointsDiff = b2["P1 Points"] - b1["P1 Points"];
      if (pointsDiff < -40) {
        continue
      }
      totalGain += pointsDiff;
      battlesConsidered += 1;
    }
  }
  const avgPPG = battlesConsidered > 0 ? totalGain / battlesConsidered : 0;

  const totalBattles = battleList.length;

  // create subsets for first pick and second pick battles
  const fpBattles = battleList.filter(b => b["First Pick"] === 1);
  const spBattles = battleList.filter(b => b["First Pick"] !== 1);

  // get counts for first pick and second pick battles
  const fpCount = fpBattles.length;
  const spCount = spBattles.length;

  // calculate wins for first pick and second pick battles
  const fpWins = fpBattles.reduce((acc, b) => acc + b.Win, 0);
  const spWins = spBattles.reduce((acc, b) => acc + b.Win, 0);

  // calculate rate of occurrence for first pick and second pick battles
  const fpR = totalBattles? fpCount / totalBattles : 0;
  const spR = totalBattles? spCount / totalBattles : 0;

  // calculate win rate for first pick and second pick battles
  const fpWR = fpCount? fpWins / fpCount : 0;
  const spWR = spCount? spWins / spCount : 0;

  // calculate total win rate
  const winRate = totalBattles? (fpWins + spWins) / totalBattles : 0;

  // iterate through battles and calculate longest win/loss streaks
  let [maxWinStreak, maxLossStreak, winStreak, lossStreak] = [0, 0, 0, 0];
  for (let b of battleList) {
    if (b.Win === 1) {
      winStreak += 1;
      maxWinStreak = Math.max(maxWinStreak, winStreak);
      lossStreak = 0;
    } else {
      winStreak = 0
      lossStreak += 1;
      maxLossStreak = Math.max(maxLossStreak, lossStreak);
    }
  }

  const NA = "N/A";

  return {
      "first_pick_count"   : fpCount,
      "second_pick_count"  : spCount,
      "first_pick_rate"    : fpCount? toPercent(fpR) : NA,
      "second_pick_rate"   : spCount? toPercent(spR) : NA,
      "first_pick_winrate" : fpCount? toPercent(fpWR) : NA,
      "second_pick_winrate": spCount? toPercent(spWR) : NA,
      "total_winrate"     : totalBattles? toPercent(winRate) : NA,
      "total_battles"     : totalBattles,
      "total_wins"        : fpWins + spWins,
      "max_win_streak"    : maxWinStreak,
      "max_loss_streak"   : maxLossStreak,
      "avg_ppg"           : avgPPG.toFixed(2),
  }
}

function getServerStats(battlesList) {
  const allServerStats = [];
  const totalBattles = battlesList.length;
  for (const server of Object.values(WORLD_CODE_TO_CLEAN_STR)) {
    const subset = battlesList.filter(b => b["P2 Server"] === server);
    const count = subset.length;
    const wins = subset.reduce((acc, b) => acc + (b.Win === "W" ? 1 : 0), 0);
    const winRate = count > 0 ? wins / count : "N/A";
    const frequency = totalBattles > 0 ? count / totalBattles : "N/A";

    const firstPickGames = subset.filter(b => b["First Pick"] === "True");
    const fpWins = firstPickGames.reduce((acc, b) => acc + (b.Win === "W" ? 1 : 0), 0);
    const fpWinRate = firstPickGames.length > 0 ? fpWins / firstPickGames.length : "N/A";

    const secondPickGames = subset.filter(b => b["First Pick"] === "False");
    const spWins = secondPickGames.reduce((acc, b) => acc + (b.Win === "W" ? 1 : 0), 0);
    const spWinRate = secondPickGames.length > 0 ? spWins / secondPickGames.length : "N/A";

    allServerStats.push(
      {
        server,
        count, 
        wins, 
        win_rate: toPercent(winRate), 
        frequency: toPercent(frequency),
        "+/-": 2 * wins - count,
        fp_games : firstPickGames.length,
        sp_games : secondPickGames.length,
        fp_wr : toPercent(fpWinRate),
        sp_wr : toPercent(spWinRate)
      }
    );
  }
  allServerStats.sort((a, b) => a.server.localeCompare(b.server));
  return allServerStats;
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
  extendBattles: async function(cleanBattleList) {
    let oldDict = await ClientCache.get(ClientCache.Keys.BATTLES) ?? {};

    // new battles automatically overwrite old ones if they share same seq_num
    const newDict = { ...oldDict, ...battleListToDict(cleanBattleList) };
    await ClientCache.cache(ClientCache.Keys.BATTLES, newDict);
    console.log("Extended user data in cache");
    return newDict;
  },

  //Takes queried battles, clean format and extend in cache
  cacheQuery: async function(battleList, user,  HM) {
    if (!battleList) {
        console.log("No query battles provided to cacheQuery");
        return [];
    }
    console.log(`Caching queried battles: ${battleList} battles; modified [BATTLES]`);
    const mapFn = battle => formatBattleClean(battle, HM);
    const cleanBattles = battleList.map(mapFn);

    // add Servers to battles
    const cleanServerStr =  UserManager.convertServerStr(user.world_code);
    cleanBattles.map(b => {b["P1 Server"] = cleanServerStr})
    await UserManager.addP2ServersByID(cleanBattles);
    
    const battles = await this.extendBattles(cleanBattles);
    console.log("Cached queried battles in cache; modified [BATTLES]");

    return battles;
  },

  //Takes uploaded battles and sets as battles in cache, should be called before attempting to get battles if upload exists
  cacheUpload: async function(battleList) {
    if (!battleList) {
        console.log("No uploaded battles provided to cacheUpload");
        return FilterSyntaxParser.emptyFilters();
    }
    const cleanBattles = battleList.map(cleanUploadedBattle);
    await ClientCache.cache(ClientCache.Keys.UPLOADED_BATTLES, cleanBattles);
    let battles = await this.extendBattles(cleanBattles);
    console.log("Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]");
    return battles;
  },


  getStats: async function(battles, user, filters, HM, autoZoom) {
    const numFilters = filters.localFilters.length + filters.globalFilters.length;
    const filteredBattles = await this.applyFilter(filters);
    const battlesList = Object.values(battles);
    const filteredBattlesList = Object.values(filteredBattles);
    const numericalFilteredBattles = await this.getNumericalBattles(filteredBattles, HM);
    const plotContent = generateRankPlot(
      battlesList, 
      user, numFilters > 0 ? numericalFilteredBattles : null, autoZoom
    );
    const prebanStats = await this.getPrebanStats(numericalFilteredBattles, HM);
    const firstPickStats = await this.getFirstPickStats(numericalFilteredBattles, HM);
    const generalStats = await this.getGeneralStats(numericalFilteredBattles, HM);
    const heroStats = await this.getHeroStats(numericalFilteredBattles, HM);
    const serverStats = await this.getServerStats(filteredBattlesList);

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

  getPrebanStats    : getPrebanStats,
  getFirstPickStats : getFirstPickStats,
  getGeneralStats   : getGeneralStats,
  getHeroStats      : getHeroStats,
  getServerStats    : getServerStats,
}

export default BattleManager;