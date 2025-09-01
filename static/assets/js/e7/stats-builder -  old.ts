import HeroManager, { HeroDicts } from "./hero-manager.ts";
import {
	WORLD_CODE_TO_CLEAN_STR,
	COLUMNS_MAP,
	HERO_STATS_COLUMN_MAP,
	LEAGUE_MAP,
} from "./references.ts";
import type { BattleType } from "./references.ts";

const getWins = (battleList: BattleType[]) => battleList.filter((b) => b[COLUMNS_MAP.WIN]);
const getFirstPickSubset = (battleList: BattleType[]) =>
	battleList.filter((b) => b[COLUMNS_MAP.FIRST_PICK]);
const getSecondPickSubset = (battleList: BattleType[]) =>
	battleList.filter((b) => !b[COLUMNS_MAP.FIRST_PICK]);

const isIncomplete = (b: BattleType) => b[COLUMNS_MAP.TURNS] === 0;

const NA = "N/A";

function toPercent(value: number) {
	return (value * 100).toFixed(2) + "%";
}

function divideToPercentString(a: number, b: number) {
	return b !== 0 ? toPercent(a / b) : toPercent(0);
}

function getCR(battle: BattleType, heroName: string) {
	const entry = battle[COLUMNS_MAP.CR_BAR].find(
		(entry) => entry[0] === heroName
	);
	return entry ? entry[1] : null;
}

function queryStats(battleList: BattleType[], totalBattles: number, heroName: string) {
	const gamesWon = getWins(battleList).length;
	const gamesAppeared = battleList.length;
	const appearanceRate = totalBattles !== 0 ? gamesAppeared / totalBattles : 0;
	const winRate = gamesAppeared !== 0 ? gamesWon / gamesAppeared : 0;

	const postBanned = battleList.reduce(
		(acc, b) =>
			acc +
			+(b[COLUMNS_MAP.P1_POSTBAN] === heroName ||
				b[COLUMNS_MAP.P2_POSTBAN] === heroName),
		0
	);

	const successes = battleList.reduce(
		(acc, b) =>
			acc +
			+(b[COLUMNS_MAP.WIN] ||
				b[COLUMNS_MAP.P1_POSTBAN] === heroName ||
				b[COLUMNS_MAP.P2_POSTBAN] === heroName),
		0
	);

	const pointGain = battleList.reduce(
		(acc, b) => acc + (b[COLUMNS_MAP.POINT_GAIN] || 0),
		0
	);

	let gamesConsidered = 0;
	let crTotal = 0;
	let firstTurns = 0;
	for (const battle of battleList) {
		const cr = getCR(battle, heroName);
		if (cr !== null && cr !== 0) {
			gamesConsidered += 1;
			crTotal += cr;
			if (cr === 100) {
				firstTurns += 1;
			}
		}
	}
	const avgCR = divideToPercentString(crTotal / 100, gamesConsidered);

	return {
		[HERO_STATS_COLUMN_MAP.HERO_NAME]: heroName,
		[HERO_STATS_COLUMN_MAP.BATTLES]: gamesAppeared,
		[HERO_STATS_COLUMN_MAP.PICK_RATE]: toPercent(appearanceRate),
		[HERO_STATS_COLUMN_MAP.WINS]: gamesWon,
		[HERO_STATS_COLUMN_MAP.WIN_RATE]: toPercent(winRate),
		[HERO_STATS_COLUMN_MAP.POSTBANS]: postBanned,
		[HERO_STATS_COLUMN_MAP.POSTBAN_RATE]: divideToPercentString(
			postBanned,
			gamesAppeared
		),
		[HERO_STATS_COLUMN_MAP.SUCCESS_RATE]: divideToPercentString(
			successes,
			gamesAppeared
		),
		[HERO_STATS_COLUMN_MAP.PLUS_MINUS]: 2 * gamesWon - gamesAppeared,
		[HERO_STATS_COLUMN_MAP.POINT_GAIN]: pointGain,
		[HERO_STATS_COLUMN_MAP.AVG_CR]: avgCR,
		[HERO_STATS_COLUMN_MAP.FIRST_TURNS]: firstTurns,
		[HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE]: divideToPercentString(
			firstTurns,
			gamesConsidered
		),
	};
}

function getPrimes(battleList: BattleType[], isP1 = true): Set<number> {
	const primeSet: Set<number> = new Set();
	for (const battle of Object.values(battleList)) {
		const picks = isP1
			? battle[COLUMNS_MAP.P1_PICKS_PRIMES]
			: battle[COLUMNS_MAP.P2_PICKS_PRIMES];
		picks.forEach((element) => {
			primeSet.add(element);
		});
	}
	return primeSet;
}

function getHeroStats(battleList: BattleType[], HeroDicts: HeroDicts) {
	if (battleList.length === 0) {
		return { playerHeroStats: [], enemyHeroStats: [] };
	}

	const totalBattles = battleList.length;

	const playerPrimes = getPrimes(battleList, true);
	const enemyPrimes = getPrimes(battleList, false);

	const playerHeroStats = [];
	const enemyHeroStats = [];

	for (const prime of playerPrimes) {
		const hero = HeroManager.getHeroByPrime(prime, HeroDicts);
		if (!hero) continue;
		const playerSubset = battleList.filter(
			(b) => b[COLUMNS_MAP.P1_PICKS_PRIMES].includes(prime)
		);
		if (playerSubset.length > 0) {
			playerHeroStats.push(queryStats(playerSubset, totalBattles, hero.name));
		}
	}
	for (const prime of enemyPrimes) {
		const hero = HeroManager.getHeroByPrime(prime, HeroDicts);
		if (!hero) continue;
		const enemySubset = battleList.filter(
			(b) => b[COLUMNS_MAP.P2_PICKS_PRIMES].includes(prime)
		);
		if (enemySubset.length > 0) {
			enemyHeroStats.push(queryStats(enemySubset, totalBattles, hero.name));
		}
	}
	const nameCol = HERO_STATS_COLUMN_MAP.HERO_NAME;
	return {
		playerHeroStats: playerHeroStats.sort((b1, b2) =>
			b1[nameCol].localeCompare(b2[nameCol])
		),
		enemyHeroStats: enemyHeroStats.sort((b1, b2) =>
			b1[nameCol].localeCompare(b2[nameCol])
		),
	};
}

function getFirstPickStats(battleList: BattleType[], HeroDicts: HeroDicts) {
	battleList = getFirstPickSubset(Object.values(battleList));

	if (battleList.length === 0) {
		return [];
	}

	const totalBattles = battleList.length;

	const grouped: Record<number, { wins: number; appearances: number }> = {};
	for (const b of battleList) {
		if (b[COLUMNS_MAP.P1_PICKS_PRIMES].length === 0) continue; // skip any battle where player didn't get to pick a first unit
		const hero = b[COLUMNS_MAP.P1_PICKS_PRIMES][0];
		if (!(hero in grouped)) grouped[hero] = { wins: 0, appearances: 0 };
		grouped[hero].wins += +b[COLUMNS_MAP.WIN];
		grouped[hero].appearances += 1;
	}

	const result = Object.entries(grouped).map(([prime, stats]) => {
		const name = HeroManager.getHeroByPrime(prime, HeroDicts)?.name ?? HeroManager.EMPTY_NAME;
		return {
			hero: name,
			wins: stats.wins,
			appearances: stats.appearances,
			win_rate: toPercent(stats.wins / stats.appearances),
			appearance_rate: toPercent(stats.appearances / totalBattles),
			"+/-": 2 * stats.wins - stats.appearances,
		};
	});

	result.sort((a, b) => b.appearances - a.appearances);
	return result;
}

function getPrebanStats(battleList: BattleType[], HeroDicts: HeroDicts) {
	//console.log(`Got HeroDicts: ${HeroDicts}`);

	const emptyPrime = HeroDicts.Empty.prime;

	if (battleList.length === 0) {
		return [];
	}

	function getValidPrimes(index: number) {
		const primes = battleList.map((b) => b[COLUMNS_MAP.P1_PREBANS_PRIMES][index]).filter((p) => p !== null);
		return new Set(primes);
	}

	const preban1Set = getValidPrimes(0);
	const preban2Set = getValidPrimes(1);
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

	const totalBattles = battleList.length;
	const output = [];

	for (const preban of prebans) {
		const filtered = battleList.filter(
			(b) => b[COLUMNS_MAP.P1_PREBANS_PRIMES].includes(preban)
		);
		const appearances = filtered.length;
		if (appearances < 1) {
			continue;
		}
		const wins = filtered.reduce((acc, b) => acc + +b.Win, 0);

		const appearanceRate = totalBattles > 0 ? appearances / totalBattles : 0;
		const winRate = appearances > 0 ? wins / appearances : 0;
		const plusMinus = 2 * wins - appearances;

		output.push({
			preban: HeroDicts.prime_pair_lookup[preban],
			wins: wins,
			appearances: appearances,
			appearance_rate: toPercent(appearanceRate),
			win_rate: toPercent(winRate),
			"+/-": plusMinus,
		});
	}

	output.sort((a, b) => b.appearances - a.appearances);
	return output;
}

function secondsToTimeStr(inputSeconds: number) {
	let timeStr;
	const mins = Math.floor(inputSeconds / 60);
	const secs = (inputSeconds % 60).toFixed(1);
	if (mins === 0) {
		timeStr = `${secs} secs`;
	} else {
		timeStr = `${mins} : ${secs}s`;
	}
	return timeStr;
}

function getGeneralStats(battleList: BattleType[]) {
	battleList.sort(
		(b1, b2) => new Date(b1["Date/Time"]).getTime() - new Date(b2["Date/Time"]).getTime()
	);

	const totalBattles = battleList.length;

	const totalGain = battleList.reduce((acc, b) => acc + (b["Point Gain"] || 0), 0);
	const avgPPG = totalBattles > 0 ? totalGain / totalBattles : 0;

	const totalTurns = battleList.reduce((acc, b) => acc + b["Turns"], 0);
	const avgTurns = totalBattles > 0 ? totalTurns / totalBattles : 0;

	const maxTurns =
		battleList.length > 0 ? Math.max(...battleList.map((b) => b["Turns"])) : 0;

	const totalSeconds = battleList.reduce((acc, b) => acc + b["Seconds"], 0);
	const avgSeconds = totalBattles > 0 ? totalSeconds / totalBattles : 0;

	const maxSeconds =
		battleList.length > 0
			? Math.max(...battleList.map((b) => b["Seconds"]))
			: 0;

	let avgTimeStr = secondsToTimeStr(avgSeconds);
	let maxTimeStr = secondsToTimeStr(maxSeconds);

	const totalFirstTurnGames = battleList.reduce(
		(acc, b) => acc + +b["First Turn"],
		0
	);

	// create subsets for first pick and second pick battles
	const fpBattles = getFirstPickSubset(battleList);
	const spBattles = getSecondPickSubset(battleList);

	// get counts for first pick and second pick battles
	const fpCount = fpBattles.length;
	const spCount = spBattles.length;

	// calculate wins for first pick and second pick battles
	const fpWins = fpBattles.reduce((acc, b) => acc + +b.Win, 0);
	const spWins = spBattles.reduce((acc, b) => acc + +b.Win, 0);

	// calculate rate of occurrence for first pick and second pick battles
	const fpR = totalBattles ? fpCount / totalBattles : 0;
	const spR = totalBattles ? spCount / totalBattles : 0;

	// calculate win rate for first pick and second pick battles
	const fpWR = fpCount ? fpWins / fpCount : 0;
	const spWR = spCount ? spWins / spCount : 0;

	// calculate total win rate
	const winRate = totalBattles ? (fpWins + spWins) / totalBattles : 0;

	// iterate through battles and calculate longest win/loss streaks
	let [maxWinStreak, maxLossStreak, winStreak, lossStreak] = [0, 0, 0, 0];
	for (let b of battleList) {
		if (b.Win) {
			winStreak += 1;
			maxWinStreak = Math.max(maxWinStreak, winStreak);
			lossStreak = 0;
		} else {
			winStreak = 0;
			lossStreak += 1;
			maxLossStreak = Math.max(maxLossStreak, lossStreak);
		}
	}

	return {
		first_pick_count: fpCount,
		second_pick_count: spCount,
		first_pick_rate: fpCount ? toPercent(fpR) : NA,
		second_pick_rate: spCount ? toPercent(spR) : NA,
		first_pick_winrate: fpCount ? toPercent(fpWR) : NA,
		second_pick_winrate: spCount ? toPercent(spWR) : NA,
		total_winrate: totalBattles ? toPercent(winRate) : NA,
		total_battles: totalBattles,
		total_wins: fpWins + spWins,
		max_win_streak: maxWinStreak,
		max_loss_streak: maxLossStreak,
		avg_ppg: avgPPG.toFixed(2),
		avg_turns: avgTurns.toFixed(2),
		avg_time: avgTimeStr,
		max_turns: maxTurns,
		max_time: maxTimeStr,
		first_turn_games: totalFirstTurnGames,
		first_turn_rate: totalBattles
			? toPercent(totalFirstTurnGames / totalBattles)
			: NA,
	};
}

function getPerformanceStats(battlesList: BattleType[]) {
	const perfStatsContainer: Record<string, any> = {
		servers: [],
		leagues: [],
	};
	const totalBattles = battlesList.length;
	const servers = Object.values(WORLD_CODE_TO_CLEAN_STR);
	const leagues = Object.values(LEAGUE_MAP);

	type FilterListEntry = readonly [string, (b: BattleType) => boolean];

	const subsetFilters: Array<FilterListEntry> = [
		...servers.map((server) => [
			`Server: ${server}`,
			(b: BattleType) => b["P2 Server"] === server,
		] as const),
		...leagues.map((league) => [
			`League: ${league}`,
			(b: BattleType) => b["P2 League"] === league,
		] as const),
	];

	for (const [label, subsetFilter] of subsetFilters) {
		const subset = battlesList.filter(subsetFilter);
		if (subset.length === 0) continue;
		const count = subset.length;
		const wins = subset.reduce((acc, b) => acc + +b.Win, 0);
		const winRate = count > 0 ? toPercent(wins / count) : NA;
		const frequency = totalBattles > 0 ? toPercent(count / totalBattles) : NA;

		const firstPickGames = subset.filter((b) => b["First Pick"]);
		const fpWins = firstPickGames.reduce((acc, b) => acc + +b.Win, 0);

		const secondPickGames = subset.filter((b) => !b["First Pick"]);
		const spWins = secondPickGames.reduce((acc, b) => acc + +b.Win, 0);

		const targetList = label.toLowerCase().includes("server")
			? perfStatsContainer.servers
			: perfStatsContainer.leagues;

		targetList.push({
			label,
			count,
			wins,
			win_rate: winRate,
			frequency: frequency,
			"+/-": 2 * wins - count,
			fp_games: firstPickGames.length,
			sp_games: secondPickGames.length,
			fp_wr:
				firstPickGames.length > 0
					? toPercent(fpWins / firstPickGames.length)
					: "N/A",
			sp_wr:
				secondPickGames.length > 0
					? toPercent(spWins / secondPickGames.length)
					: "N/A",
		});
	}
	return [
		...perfStatsContainer.servers,
		...perfStatsContainer.leagues.slice(-4),
	];
}

let StatsBuilder = {
	getHeroStats,
	getFirstPickStats,
	getPrebanStats,
	getPerformanceStats,
	getGeneralStats,
};

export default StatsBuilder;
