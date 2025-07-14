import HeroManager from './hero-manager.js';
import { WORLD_CODE_TO_CLEAN_STR, COLUMNS_MAP } from './references.js';

const getWins = battleList => battleList.filter(b => b[COLUMNS_MAP.WIN]);
const getFirstPickSubset = battleList => battleList.filter(b => b[COLUMNS_MAP.FIRST_PICK]);
const getSecondPickSubset = battleList => battleList.filter(b => !b[COLUMNS_MAP.FIRST_PICK]);

const isIncomplete = (b) => b[COLUMNS_MAP.TURNS] === 0;

function toPercent(value) {
    return (value * 100).toFixed(2) + '%';
}

function queryStats(battleList, totalBattles) {
  const gamesWon = getWins(battleList).length;
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
    const playerSubset = battleList.filter( b => b[COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] % prime === 0 );
    const enemySubset = battleList.filter( b => b[COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] % prime === 0);
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
    const battleList = getFirstPickSubset(Object.values(battles));

    console.log(battles);
    console.log(battleList);

    if (battleList.length === 0) {
      return [];
    }

    const totalBattles = battleList.length;

    const grouped = {};
    for (const b of battleList) {
        if (b[COLUMNS_MAP.P1_PICKS_PRIMES].length === 0) continue; // skip any battle where player didn't get to pick a first unit
        const hero = b[COLUMNS_MAP.P1_PICKS_PRIMES][0];
        if (!(hero in grouped)) grouped[hero] = { wins: 0, appearances: 0 };
        grouped[hero].wins += b[COLUMNS_MAP.WIN];
        grouped[hero].appearances += 1;
    }

    const result = Object.entries(grouped).map(([prime, stats]) => {
        console.log("prime", prime);
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
    
    console.log(battles);

    const emptyPrime = HeroManager.getHeroByName('Empty', HM).prime;

    const battleList = Object.values(battles);

    if (battleList.length === 0) {
      return [];
    }

    const getValidPrimes = (col, index) =>
        [...new Set(battleList.map(b => b[col][index]).filter(p => p && p !== emptyPrime))];

    const preban1Set = getValidPrimes(COLUMNS_MAP.P1_PREBANS_PRIMES, 0);
    const preban2Set = getValidPrimes(COLUMNS_MAP.P1_PREBANS_PRIMES, 1);
    const prebanSet = new Set([...preban1Set, ...preban2Set]);

    let prebans = [];
    for (const prime of prebanSet) {
        prebans.push(prime);
    }
    for (const a of prebanSet) {
        for (const b of prebanSet) {
            if (a < b) prebans.push(a * b);
        }
    }
    console.log("Prebans:", prebans);

    const totalBattles = battleList.length;
    const output = [];

    for (const preban of prebans) {
        const filtered = battleList.filter(b => b["P1 Prebans Prime Product"] % preban === 0);
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

  const totalBattles = battleList.length;

  const totalGain = battleList.reduce((acc, b) => acc + b["Point Gain"], 0);
  const avgPPG = totalBattles > 0 ? totalGain / totalBattles : 0;

  // create subsets for first pick and second pick battles
  const fpBattles = getFirstPickSubset(battleList);
  const spBattles = getSecondPickSubset(battleList);

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
    if (b.Win) {
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
    const wins = subset.reduce((acc, b) => acc + b.Win, 0);
    const winRate = count > 0 ? wins / count : "N/A";
    const frequency = totalBattles > 0 ? count / totalBattles : "N/A";

    const firstPickGames = subset.filter(b => b["First Pick"]);
    const fpWins = firstPickGames.reduce((acc, b) => acc + b.Win, 0);

    const secondPickGames = subset.filter(b => !b["First Pick"]);
    const spWins = secondPickGames.reduce((acc, b) => acc + b.Win, 0);

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
        fp_wr : firstPickGames.length > 0 ? toPercent(fpWins / firstPickGames.length) : "N/A",
        sp_wr : secondPickGames.length > 0 ? toPercent(spWins / secondPickGames.length) : "N/A"
      }
    );
  }
  allServerStats.sort((a, b) => a.server.localeCompare(b.server));
  return allServerStats;
}

let StatsBuilder = { getHeroStats, getFirstPickStats, getPrebanStats, getServerStats, getGeneralStats };

export default StatsBuilder;