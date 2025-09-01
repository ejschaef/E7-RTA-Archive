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
	if (a === 0) return NA;
	return b !== 0 ? toPercent(a / b) : toPercent(0);
}

function divideToString(a: number, b: number) {
	if (b === 0) return NA;
	return (a / b).toFixed(2);
}

function getCR(battle: BattleType, heroName: string) {
	const entry = battle[COLUMNS_MAP.CR_BAR].find(
		(entry) => entry[0] === heroName
	);
	return entry ? entry[1] : null;
}

function computeGenericStats(subset: BattleType[], totalBattles: number) {
	const wins = getWins(subset).length;
	const subsetLength = subset.length;
	const firstTurns = subset.filter((b) => b[COLUMNS_MAP.FIRST_TURN]).length;
	const firstTurnRate = divideToPercentString(firstTurns, subset.length);
	const pointGain = subset.reduce((acc, b) => acc + (b[COLUMNS_MAP.POINT_GAIN] || 0), 0);
	return {
		wins,
		subsetLength,
		frequency: divideToPercentString(subset.length, totalBattles),
		winRate: divideToPercentString(getWins(subset).length, subset.length),
		plusMinus: 2 * wins - subsetLength,
		pointGain: subset.reduce((acc, b) => acc + (b[COLUMNS_MAP.POINT_GAIN] || 0), 0),
		avgPPG: divideToString(pointGain, subsetLength),
		firstTurns,
		firstTurnRate,
	};
};

function queryStats(battleList: BattleType[], totalBattles: number, heroName: string) {
	const genericStats = computeGenericStats(battleList, totalBattles);

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
		[HERO_STATS_COLUMN_MAP.BATTLES]: genericStats.subsetLength,
		[HERO_STATS_COLUMN_MAP.PICK_RATE]: genericStats.frequency,
		[HERO_STATS_COLUMN_MAP.WINS]: genericStats.wins,
		[HERO_STATS_COLUMN_MAP.WIN_RATE]: genericStats.winRate,
		[HERO_STATS_COLUMN_MAP.POSTBANS]: postBanned,
		[HERO_STATS_COLUMN_MAP.POSTBAN_RATE]: divideToPercentString(
			postBanned,
			genericStats.subsetLength
		),
		[HERO_STATS_COLUMN_MAP.SUCCESS_RATE]: divideToPercentString(
			successes,
			genericStats.subsetLength
		),
		[HERO_STATS_COLUMN_MAP.PLUS_MINUS]: genericStats.plusMinus,
		[HERO_STATS_COLUMN_MAP.POINT_GAIN]: genericStats.pointGain,
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

	if (battleList.length === 0) {
		return [];
	}

	const prebanSet: Set<number> = new Set();
	for (const b of battleList) {
		const prebans = b[COLUMNS_MAP.P1_PREBANS_PRIMES];
		prebanSet.add(prebans[0]);
		prebanSet.add(prebans[1]);
		prebanSet.add(prebans[0] * prebans[1]);
	}

	const totalBattles = battleList.length;
	const output = [];

	for (const preban of prebanSet) {
		const filtered = battleList.filter(
			(b) => b[COLUMNS_MAP.P1_PREBANS_PRIMES].includes(preban)
		);
		const genericStats = computeGenericStats(filtered, totalBattles);

		output.push({
			preban: HeroDicts.prime_pair_lookup[preban],
			wins: genericStats.wins,
			appearances: genericStats.subsetLength,
			appearance_rate: genericStats.frequency,
			win_rate: genericStats.winRate,
			"+/-": genericStats.plusMinus,
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
	const avgPPG = divideToString(totalGain, totalBattles);

	const totalTurns = battleList.reduce((acc, b) => acc + b["Turns"], 0);
	const avgTurns = divideToString(totalTurns, totalBattles);

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

	const fpStats = computeGenericStats(fpBattles, totalBattles);
	const spStats = computeGenericStats(spBattles, totalBattles);


	// calculate total win rate
	const winRate = divideToPercentString(fpStats.wins + spStats.wins, totalBattles);

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
		first_pick_count: fpStats.subsetLength,
		second_pick_count: spStats.subsetLength,
		first_pick_rate: fpStats.frequency,
		second_pick_rate: spStats.frequency,
		first_pick_winrate: fpStats.winRate,
		second_pick_winrate: spStats.winRate,
		total_winrate: winRate,
		total_battles: totalBattles,
		total_wins: fpStats.wins + spStats.wins,
		max_win_streak: maxWinStreak,
		max_loss_streak: maxLossStreak,
		avg_ppg: avgPPG,
		avg_turns: avgTurns,
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
		const count = subset.length;
		if (count === 0) continue;
		const subsetStats = computeGenericStats(subset, totalBattles);

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
			wins: subsetStats.wins,
			win_rate: subsetStats.winRate,
			frequency: subsetStats.frequency,
			"+/-": subsetStats.plusMinus,
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
		...perfStatsContainer.leagues.slice(-4), // only show highest 4 leagues the player has played against
	];
}

let StatsBuilder = {
	getHeroStats,
	getFirstPickStats,
	getPrebanStats,
	getPerformanceStats,
	getGeneralStats,
	computeGenericStats,
};

export default StatsBuilder;
