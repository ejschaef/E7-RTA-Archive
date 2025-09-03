import { merge } from "jquery";
import BattleManager from "../e7/battle-manager";
import { BattleType, ColumnHeader, COLUMNS_MAP, LEAGUE_MAP, WORLD_CODE_ENUM, WORLD_CODE_TO_CLEAN_STR } from "../e7/references"
import StatsBuilder from "../e7/stats-builder"
import { NOT_IMPLEMENTED, Test } from "./test-struct";
import { HeroDicts } from "../e7/hero-manager";


const genStats = StatsBuilder.computeGenericStats;

const compWins = (battles: BattleType[]) =>
	battles.reduce((acc, b) => acc + +b["Win"], 0);

const compWinrate = (battles: BattleType[]) =>
	compWins(battles) / battles.length;

const compPlusMinus = (battles: BattleType[]) =>
	2 * compWins(battles) - battles.length;


function getSeqNumArray(battles: BattleType[]): number[] {
	return battles.map((b) => Number(b[COLUMNS_MAP.SEQ_NUM]));
}

function getSeqNumSet(battles: BattleType[]): Set<number> {
	return new Set(getSeqNumArray(battles));
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
	a.sort();
	b.sort();
	if (a === b) return true;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; ++i) {
		if (a[i] !== b[i]) {
			console.log(`Failed at index ${i}: a: ${a[i]}, b: ${b[i]}`);
			return false;
		};
	}
	return true;
}

function setsEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
	if (setA.size !== setB.size) return false;
	for (const val of setA) {
		if (!setB.has(val)) return false;
	}
	return true;
}

type Stringifiable = { toString(): string };

function arrToCounts<T extends Stringifiable>(arr: T[]): {[key: string]: number} {
	const counts: {[key: string]: number} = {};
	for (const val of arr) {
		const key = val.toString();
		counts[key] = (counts[key] || 0) + 1;
	}
	return counts;
}

function isArrCountSubset<T extends Stringifiable>(iterA: Iterable<T>, iterB: Iterable<T>): boolean {
	const arrayA = Array.from(iterA);
	const arrayB = Array.from(iterB);
	const countsA = arrToCounts(arrayA);
	const countsB = arrToCounts(arrayB);
	for (const key in countsA) {
		if (!(key in countsB)) return false;
		if (countsB[key] < countsA[key]) return false;
	}
	return true;
}

function filterColByVals(battles: BattleType[], column: ColumnHeader, values: any[], keep: boolean = true): BattleType[] {
	return battles.filter((b) => keep ? values.includes(b[column]) : !values.includes(b[column]))
}

function filterColByFn(battles: BattleType[], column: ColumnHeader, fn: (v: any) => boolean, keep: boolean = true): BattleType[] {
	return battles.filter((b) => keep ? fn(b[column]) : !fn(b[column]));
}

function removeBattles(battles: BattleType[], seqNums: Set<number>): BattleType[] {
	return battles.filter((b) => !seqNums.has(Number(b[COLUMNS_MAP.SEQ_NUM])))
}

function filterCR(
	{ battles, crEvalFn, heroName }: {battles: BattleType[], crEvalFn: (cr: number) => boolean, heroName: string}
): BattleType[] {
	return battles.filter((b) => {
		const crBar = b[COLUMNS_MAP.CR_BAR];
		const entry = crBar.find((entry) => entry[0] === heroName);
		if (!entry) return false;
		return crEvalFn(entry[1]);
	})	
}

function filterDates(battles: BattleType[], dates: string[]): BattleType[] {
	return battles.filter((b) => dates.includes(b[COLUMNS_MAP.DATE_TIME].slice(0, 10)));
}

function filterPick(
	battles: BattleType[],
	{ heroNames, pick, isP1 }: { heroNames: string[]; pick: number; isP1: boolean }
): BattleType[] {
	const pickCol = isP1 ? COLUMNS_MAP.P1_PICKS : COLUMNS_MAP.P2_PICKS;
	return battles.filter((b) => {
		const hero = b[pickCol][pick-1];
		return heroNames.includes(hero);
	});
}
function filterPicks(
	{battles, heroName, isP1}: {battles: BattleType[], heroName: string, isP1: boolean}
): BattleType[] {
	const pickCol = isP1 ? COLUMNS_MAP.P1_PICKS : COLUMNS_MAP.P2_PICKS;
	return battles.filter((b) => {
		return b[pickCol].includes(heroName);
	})
}

function locateHeroIndex(
	{battle, heroName, isP1}: {battle: BattleType, heroName: string, isP1: boolean}
): number {
	const pickCol = isP1 ? COLUMNS_MAP.P1_PICKS : COLUMNS_MAP.P2_PICKS;
	return battle[pickCol].indexOf(heroName);
}

function filterEquipment(
	{battles, heroName, targetEquipVec, isP1}: {battles: BattleType[], heroName: string, targetEquipVec: string[], isP1: boolean}
): BattleType[] {
	const equipCol = isP1 ? COLUMNS_MAP.P1_EQUIPMENT : COLUMNS_MAP.P2_EQUIPMENT;
	return battles.filter((b) => {
		const equipArr = b[equipCol];
		const index = locateHeroIndex({battle: b, heroName, isP1});
		if (index === -1) return false;
		return isArrCountSubset(targetEquipVec, equipArr[index]);
	})
}

function filterArtifact(
	{battles, heroName, artifactNames, isP1}: {battles: BattleType[], heroName: string, artifactNames: string[], isP1: boolean}
): BattleType[] {
	const artCol = isP1 ? COLUMNS_MAP.P1_ARTIFACTS : COLUMNS_MAP.P2_ARTIFACTS;
	return battles.filter((b) => {
		const artArr = b[artCol];
		const index = locateHeroIndex({battle: b, heroName, isP1});
		if (index === -1) return false;
		const arti = artArr[index];
		return artifactNames.includes(arti);
	})
}

function getCR(battle: BattleType, heroName: string): number | null {
	const crEntry = battle[COLUMNS_MAP.CR_BAR].find((entry) => entry[0] === heroName);
	return crEntry ? crEntry[1] : null;
}

function computeAvgCR(battles: BattleType[], heroName: string): string {
	let totalCR = 0;
	for (const b of battles) {
		const cr = getCR(b, heroName);
		if (cr === null) continue;
		totalCR += cr;
	}
	return StatsBuilder.divideToPercentString(totalCR / 100, battles.length);
}

function computeFirstTurnRate(battles: BattleType[], heroName: string): string {
	const firstTurns = battles.filter((b) => b[COLUMNS_MAP.FIRST_TURN_HERO] === heroName).length;
	return StatsBuilder.divideToPercentString(firstTurns, battles.length);
}

function mergeBattles(battles1: BattleType[], battles2: BattleType[]): BattleType[] {
	return [...battles1, ...battles2];
}


export const FilterTests: Test[] = [
	// Base Filters - Boolean
	{
		name: "isWinTrue",
		filterStr: "is-win = true;",
		eval: (battles, filteredBattles) => {
			const isWinTrue = filterColByFn(battles, COLUMNS_MAP.WIN, (v) => v === true);
			return setsEqual(getSeqNumSet(isWinTrue), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "notFirstPick",
		filterStr: "is-first-pick != false;",
		eval: (battles, filteredBattles) => {
			const notFirstPick = filterColByFn(battles, COLUMNS_MAP.FIRST_PICK, (v) => v !== false);
			return setsEqual(getSeqNumSet(notFirstPick), getSeqNumSet(filteredBattles));
		}
	},

	// Base Filters - Integer
	{
		name: "highVictoryPoints",
		filterStr: "victory-points > 2500;",
		eval:(battles, filteredBattles) => {
			const highVictoryPoints = filterColByFn(battles, COLUMNS_MAP.P1_POINTS, (v) => v > 2500);
			return setsEqual(getSeqNumSet(highVictoryPoints), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "shortBattle",
		filterStr: "turns <= 10;",
		eval: (battles, filteredBattles) => {
			const shortBattle = filterColByFn(battles, COLUMNS_MAP.TURNS, (v) => v <= 10);
			return setsEqual(getSeqNumSet(shortBattle), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "negativePointGain",
		filterStr: "point-gain < 0;",
		eval: (battles, filteredBattles) => {
			const negativePointGain = filterColByFn(battles, COLUMNS_MAP.POINT_GAIN, (v) => v < 0);
			return setsEqual(getSeqNumSet(negativePointGain), getSeqNumSet(filteredBattles));
		},
	},

	// Base Filters - Date
	{
		name: "after2025Aug",
		filterStr: "date >= 2025-08-01;",
		eval: (battles, filteredBattles) => {
			const after2025Aug = filterColByFn(battles, COLUMNS_MAP.DATE_TIME, (dt) => dt.slice(0, 10) >= "2025-08-01");
			return setsEqual(getSeqNumSet(after2025Aug), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "july2025Range",
		filterStr: "date in 2025-07-01...2025-07-31;",
		eval: (battles, filteredBattles) => {
			const july2025Range = filterColByFn(battles, COLUMNS_MAP.DATE_TIME, (dt) => 
				dt.slice(0, 10) >= "2025-07-01" && dt.slice(0, 10) < "2025-07-31"
			);
			console.log(july2025Range);
			return setsEqual(getSeqNumSet(july2025Range), getSeqNumSet(filteredBattles));
		}
	},

	// Base Filters - String
	{
		name: "p2LeagueChampion",
		filterStr: `p2.league = "champion";`,
		eval: (battles, filteredBattles) => {
			const p2Champion = filterColByFn(battles, COLUMNS_MAP.P2_LEAGUE, (league) => league === "Champion");
			return setsEqual(getSeqNumSet(p2Champion), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "notZioFirstTurn",
		filterStr: `first-turn-hero != 'Zio';`,
		eval: (battles, filteredBattles) => {
			const notZioFirstTurn = filterColByFn(battles, COLUMNS_MAP.FIRST_TURN_HERO, (v) => v === "Zio", false);
			return setsEqual(getSeqNumSet(notZioFirstTurn), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "p1serverGlobal",
		filterStr: `p1.server = "Global";`,
		eval: (battles, filteredBattles) => {
			const p1Global = filterColByFn(battles, COLUMNS_MAP.P1_SERVER, (v) => v === "Global");
			return setsEqual(getSeqNumSet(p1Global), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "p2serverGlobal",
		filterStr: `p2.server = "Global";`,
		eval: (battles, filteredBattles) => {
			const p2Global = filterColByFn(battles, COLUMNS_MAP.P2_SERVER, (v) => v === "Global");
			return setsEqual(getSeqNumSet(p2Global), getSeqNumSet(filteredBattles));
		}
	},

	// Base Filters - Set Membership
	{
		name: "rinakInPrebans",
		filterStr: `"Rinak" in prebans;`,
		eval: (battles, filteredBattles) => {
			const rinakPreban1 = filterColByFn(battles, COLUMNS_MAP.P1_PREBANS, (v) => v.includes("Rinak"));
			const rinakPreban2 = filterColByFn(battles, COLUMNS_MAP.P2_PREBANS, (v) => v.includes("Rinak"));
			const subset = mergeBattles(rinakPreban1, rinakPreban2);
			return setsEqual(getSeqNumSet(subset), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "peiraNotInP2Picks",
		filterStr: `"Lone Wolf Peira" !in p2.picks;`,
		eval: (battles, filteredBattles) => {
			const peiraPick = filterPicks({battles, heroName: "Lone Wolf Peira", isP1: false});
			const subset = removeBattles(battles, getSeqNumSet(peiraPick));
			return setsEqual(getSeqNumSet(subset), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "pick1InSet",
		filterStr: `p1.pick1 in { "Lone Wolf Peira", "Boss Arunka"};`,
		eval: (battles, filteredBattles) => {
			const subset = filterPick(battles, {
				heroNames: ["Lone Wolf Peira", "Boss Arunka"],
				pick: 1,
				isP1: true,
			});
			return setsEqual(getSeqNumSet(subset), getSeqNumSet(filteredBattles));
		},
	},
	// Base Filters - season
	{
		name: "Season 17f",
		filterStr: `season = season-17f;`,
		eval: (battles, filteredBattles) => {
			const season17f = filterColByFn(battles, COLUMNS_MAP.SEASON_CODE, (v) => v.includes("17f"));
			return setsEqual(getSeqNumSet(season17f), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "Season 17",
		filterStr: `season = season-17;`,
		eval: (battles, filteredBattles) => {
			const currentSeason = filterColByFn(battles, COLUMNS_MAP.SEASON_CODE, (v) => v === "pvp_rta_ss17");
			return setsEqual(getSeqNumSet(currentSeason), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "Season Code Set",
		filterStr: `season in { "pvp_rta_ss17", "pvp_rta_ss17f" };`,
		eval: (battles, filteredBattles) => {
			const currentSeason = filterColByFn(battles, COLUMNS_MAP.SEASON_CODE, (v) => v === "pvp_rta_ss17" || v === "pvp_rta_ss17f");
			return setsEqual(getSeqNumSet(currentSeason), getSeqNumSet(filteredBattles));
		}
	},

	// Base Filters - Range
	{
		name: "victoryPointsRange",
		filterStr: "victory-points in 2400...=2600;",
		eval: (battles, filteredBattles) => {
			const victoryPoints = filterColByFn(battles, COLUMNS_MAP.P1_POINTS, (v) => v >= 2400 && v <= 2600);
			return setsEqual(getSeqNumSet(victoryPoints), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "dateNotInRange",
		filterStr: "date !in 2025-07-15...=2025-07-31;",
		eval: (battles, filtered) => {
			const inRange = filterColByFn(battles, COLUMNS_MAP.DATE_TIME, 
				(d) => !(d.slice(0, 10) >= "2025-07-15" && d.slice(0, 10) <= "2025-07-31")
			);
			return setsEqual(getSeqNumSet(inRange), getSeqNumSet(filtered));
		},
	},

	// Clause Functions
	{
		name: "andExample",
		filterStr: `AND(is-win = true, p2.league = "Champion", victory-points > 2400);`,
		eval: (battles, filtered) => {
			const wins = filterColByVals(battles, COLUMNS_MAP.WIN, [true]);
			const winChamp = filterColByVals(wins, COLUMNS_MAP.P2_LEAGUE, ["Champion"]);
			const victoryPoints = filterColByFn(winChamp, COLUMNS_MAP.P1_POINTS, (vp) => vp > 2400);
			return setsEqual(getSeqNumSet(victoryPoints), getSeqNumSet(filtered));
		}
	},
	{
		name: "orExample",
		filterStr: `OR(p2.server = "Global", p2.server = "Asia", p2.server = "Europe");`,
		eval: (battles, filtered) => {
			const globalAsiaEurope = filterColByVals(battles, COLUMNS_MAP.P2_SERVER, ["Global", "Asia", "Europe"]);
			return setsEqual(getSeqNumSet(globalAsiaEurope), getSeqNumSet(filtered));
		}
	},
	{
		name: "xorExample",
		filterStr: `XOR(is-first-pick = true, is-first-turn = true);`,
		eval: (battles, filtered) => {
			const firstPick = filterColByVals(battles, COLUMNS_MAP.FIRST_PICK, [true]);
			const firstTurn = filterColByVals(battles, COLUMNS_MAP.FIRST_TURN, [true]);
			const firstPickSet = getSeqNumSet(firstPick);
			const firstTurnSet = getSeqNumSet(firstTurn);
			const xorSet = firstPickSet.difference(firstTurnSet).union(firstTurnSet.difference(firstPickSet));
			return setsEqual(xorSet, getSeqNumSet(filtered));
		}
	},
	{
		name: "notExample",
		filterStr: `NOT(is-win = true);`,
		eval: (battles, filtered) => {
			const losses = filterColByVals(battles, COLUMNS_MAP.WIN, [true], false);
			return setsEqual(getSeqNumSet(losses), getSeqNumSet(filtered));
		},
	},
	{
		name: "notPickExample",
		filterStr: `NOT(p1.pick1 = "Arbiter Vildred");`,
		eval: (battles, filtered) => {
			const p1Vildred = filterPick(
				battles,
				{ pick: 1, heroNames: ["Arbiter Vildred"], isP1: true },
			);
			const negated = removeBattles(battles, getSeqNumSet(p1Vildred));
			return setsEqual(getSeqNumSet(negated), getSeqNumSet(filtered));
		},
	},

	// Nested Clauses
	{
		name: "nestedAndOr",
		filterStr: `AND(OR(is-win = true, point-gain > 0), NOT(p2.league = "challenger"));`,
		eval: (battles, filteredBattles) => {
			const p2NotChallenger = filterColByVals(battles, COLUMNS_MAP.P2_LEAGUE, [LEAGUE_MAP.challenger], false);
			const p2NotChallengerWin = filterColByVals(p2NotChallenger, COLUMNS_MAP.WIN, [true]);
			const p2NotChallengerGain = filterColByFn(p2NotChallenger, COLUMNS_MAP.POINT_GAIN, (v) => v > 0);
			const merged = mergeBattles(p2NotChallengerWin, p2NotChallengerGain);
			return setsEqual(getSeqNumSet(merged), getSeqNumSet(filteredBattles));
		}
	},

	// Direct Functions
	{
		name: "equipmentExample1",
		filterStr: `p1.equipment("Arbiter Vildred", {Torrent, Torrent, Immunity});`,
		eval: (battles, filteredBattles) => {
			const p1EquipmentArbiterVildred = filterEquipment(
				{battles, heroName: "Arbiter Vildred", targetEquipVec: ["Torrent", "Torrent", "Immunity"], isP1: true}
			);
			console.log(p1EquipmentArbiterVildred);
			return setsEqual(getSeqNumSet(p1EquipmentArbiterVildred), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "equipmentExample2",
		filterStr: `p1.equipment("Arbiter Vildred", {Torrent, Torrent, Torrent});`,
		eval: (battles, filteredBattles) => {
			const p1EquipmentArbiterVildred = filterEquipment(
				{battles, heroName: "Arbiter Vildred", targetEquipVec: ["Torrent", "Torrent", "Torrent"], isP1: true}
			);
			return setsEqual(getSeqNumSet(p1EquipmentArbiterVildred), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "equipmentExampleBelian",
		filterStr: `p1.equipment("Belian", {Counter, Immunity,});`,
		eval: (battles, filteredBattles) => {
			const subset = filterEquipment(
				{battles, heroName: "Belian", targetEquipVec: ["Counter", "Immunity"], isP1: true}
			);
			return setsEqual(getSeqNumSet(subset), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "equipmentSingle",
		filterStr: `p2.equipment("Lone Wolf Peira", "Speed");`,
		eval: (battles, filteredBattles) => {
			const p2EquipmentLoneWolfPeira = filterEquipment(
				{battles, heroName: "Lone Wolf Peira", targetEquipVec: ["Speed"], isP1: false}
			);
			return setsEqual(getSeqNumSet(p2EquipmentLoneWolfPeira), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "artifactSingle",
		filterStr: `p1.artifact("Arbiter Vildred", "Alexa's Basket");`,
		eval: (battles, filteredBattles) => {
			const p1ArtifactArbiterVildred = filterArtifact(
				{battles, heroName: "Arbiter Vildred", artifactNames: ["Alexa's Basket"], isP1: true}
			);
			return setsEqual(getSeqNumSet(p1ArtifactArbiterVildred), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "artifactSet",
		filterStr: `p2.artifact("Abyssal Yufine", {"Elbris Ritual Sword", "Aurius"});`,
		eval: (battles, filteredBattles) => {
			const p2ArtifactAbyssalYufine = filterArtifact(
				{battles, heroName: "Abyssal Yufine", artifactNames: ["Elbris Ritual Sword", "Aurius"], isP1: false}
			);
			console.log(p2ArtifactAbyssalYufine);
			return setsEqual(getSeqNumSet(p2ArtifactAbyssalYufine), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "crEqual",
		filterStr: `p2.cr("Harsetti" = 100);`,
		eval: (battles, filteredBattles) => {
			const crHarsetti = filterCR({battles, crEvalFn: (cr) => cr === 100, heroName: "Harsetti"});
			const p2crHarsetti = filterPicks({battles: crHarsetti, heroName: "Harsetti", isP1: false});
			return setsEqual(getSeqNumSet(p2crHarsetti), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "crGreater",
		filterStr: `p1.cr("Amid", > , 95);`,
		eval: (battles, filteredBattles) => {
			const crAmid = filterCR({battles, crEvalFn: (cr) => cr > 95, heroName: "Amid"});
			const p1crAmid = filterPicks({battles: crAmid, heroName: "Amid", isP1: true});
			return setsEqual(getSeqNumSet(p1crAmid), getSeqNumSet(filteredBattles));
		}
	},

	// Global Filters
	{
		name: "last100",
		filterStr: "last-N(100);",
		eval: (battles, filteredBattles) => {
			battles = structuredClone(battles);
			battles = BattleManager.sortBattlesList(battles, false);
			filteredBattles = BattleManager.sortBattlesList(filteredBattles, false);
			const battlesTop100 = battles.slice(0, 100);
			return setsEqual(getSeqNumSet(battlesTop100), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "last10",
		filterStr: "last-N(10);",
		eval: (battles, filteredBattles) => {
			battles = structuredClone(battles);
			battles = BattleManager.sortBattlesList(battles, false);
			const battlesTop10 = battles.slice(0, 10);
			console.log(battlesTop10);
			return setsEqual(getSeqNumSet(battlesTop10), getSeqNumSet(filteredBattles));
		},
	},

	// Pure Syntax Examples
	{
		name: "semicolonChain",
		filterStr: `is-win = true; p2.league = "Champion"; last-N(100);`,
		eval: (battles, filteredBattles) => {
			battles = BattleManager.sortBattlesList(battles, false);
			const battlesTop100 = battles.slice(0, 100);
			const champSubset = filterColByVals(battlesTop100, COLUMNS_MAP.P2_LEAGUE, [LEAGUE_MAP.champion]);
			const winSubset = filterColByVals(champSubset, COLUMNS_MAP.WIN, [true]);
			return setsEqual(getSeqNumSet(winSubset), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "commasInOr",
		filterStr: `OR(p2.server = "Global", p2.server = "Asia");`,
		eval: (battles, filteredBattles) => {
			const globalAsia = filterColByVals(battles, COLUMNS_MAP.P2_SERVER, ["Global", "Asia"]);
			return setsEqual(getSeqNumSet(globalAsia), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "setWithStrings",
		filterStr: `p1.pick3 in {Zio, "Amid", "Lionheart Cermia"};`,
		eval: (battles, filteredbattles) => {
			const zioAmidLion = filterPick(battles, { heroNames: ["Zio", "Amid", "Lionheart Cermia"], pick: 3, isP1: true });
			return setsEqual(getSeqNumSet(zioAmidLion), getSeqNumSet(filteredbattles));
		},
	},
	{
		name: "parenthesesNot",
		filterStr: `NOT(is-first-turn = true);`,
		eval: (battles, filteredBattles) => {
			const notFirstTurn = filterColByVals(battles, COLUMNS_MAP.FIRST_TURN, [false]);
			return setsEqual(getSeqNumSet(notFirstTurn), getSeqNumSet(filteredBattles));
		},
	},

	{
		name: "nestedParentheses",
		filterStr: `AND(is-win = true, OR(p2.server = "Global", p2.server = "Korea"));`,
		eval: (battles, filteredBattles) => {
			const wins = filterColByVals(battles, COLUMNS_MAP.WIN, [true]);
			const globalWins = filterColByVals(wins, COLUMNS_MAP.P2_SERVER, ["Global"]);
			const koreaWins = filterColByVals(wins, COLUMNS_MAP.P2_SERVER, ["Korea"]);
			const merged = mergeBattles(globalWins, koreaWins);
			return setsEqual(getSeqNumSet(merged), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "braceHeroSet",
		filterStr: `p1.pick1 in {"Abyssal Yufine", "New Moon luna"};`,
		eval: (battles, filteredBattles) => {
			const yufineLuna = filterPick(battles, { heroNames: ["Abyssal Yufine", "New Moon Luna"], pick: 1, isP1: true });
			console.log(yufineLuna);
			return setsEqual(getSeqNumSet(yufineLuna), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "braceVictoryPoints",
		filterStr: `victory-points in {1646, 1668};`,
		eval: (battles, filteredBattles) => {
			const victoryPoints = filterColByVals(battles, COLUMNS_MAP.P1_POINTS, [1646, 1668]);
			return setsEqual(getSeqNumSet(victoryPoints), getSeqNumSet(filteredBattles));
		}
	},
	{
		name: "braceDateSet",
		filterStr: `date in {2025-01-01, 2025-01-05, 2025-01-07};`,
		eval: (battles, filteredBattles) => {
			const dates = filterDates(battles, ["2025-01-01", "2025-01-05", "2025-01-07"]);
			return setsEqual(getSeqNumSet(dates), getSeqNumSet(filteredBattles));
		},
	},
	{
		name: "trailingSetComma",
		filterStr: `p1.pick1 in { "Lone Wolf Peira", "Boss Arunka", };`,
		eval: (battles, fitleredBattles) => {
			const peiraArunka = filterPick(battles, { heroNames: ["Lone Wolf Peira", "Boss Arunka"], pick: 1, isP1: true });
			return setsEqual(getSeqNumSet(peiraArunka), getSeqNumSet(fitleredBattles));
		},
	},
];

export const STATS_TESTS: Test[] = [
	{
		name: "Total Win Rate",
		filterStr: "is-win = true;",
		eval: (battles: BattleType[], filteredBattles: BattleType[]) => {
			const filterResult = compWinrate(filteredBattles);
			const stats = genStats(battles, filteredBattles.length);
			const scriptResult = stats.wins / filteredBattles.length;
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Global Server Win Rate",
		filterStr: `p2.server = "Global"`,
		eval: (battles: BattleType[], filteredBattles: BattleType[]) => {
			const filterResult = compWinrate(filteredBattles);
			const globalBattles = battles.filter((b) => b[COLUMNS_MAP.P2_SERVER] === WORLD_CODE_TO_CLEAN_STR[WORLD_CODE_ENUM.GLOBAL]);
			const stats = genStats(globalBattles, globalBattles.length);
			const scriptResult = stats.wins / globalBattles.length;
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Champion Opponent Second Pick Win Rate",
		filterStr: `p2.league = "Champion"; is-win = true; is-first-pick = false`,
		eval: (battles: BattleType[], filteredBattles: BattleType[]) => {
			const champSubset = filterColByVals(battles, COLUMNS_MAP.P2_LEAGUE, [LEAGUE_MAP.champion]);
			const champSubsetSecondPick = filterColByFn(champSubset, COLUMNS_MAP.FIRST_PICK, (isFirstPick) => !isFirstPick);
			const filterResult = StatsBuilder.divideToPercentString(filteredBattles.length, champSubsetSecondPick.length);
			const stats = StatsBuilder.getPerformanceStats(battles)
			const champStats = stats.find((statsBundle) => statsBundle.label.toLowerCase().includes("champion"));
			if (!champStats) return [filterResult, "Champ Stats not found"];
			const scriptResult = champStats.sp_wr;
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Boss Arunka +/-",
		filterStr: `"Boss Arunka" in p1.picks;`,
		eval: (battles: BattleType[], filteredBattles: BattleType[]) => {
			const filterResult = compPlusMinus(filteredBattles);
			const bossArunkaBattles = battles.filter((b) => b[COLUMNS_MAP.P1_PICKS].includes("Boss Arunka"));
			const stats = genStats(bossArunkaBattles, bossArunkaBattles.length);
			const scriptResult = stats.plusMinus;
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Preban Harsetti",
		filterStr: `"harsetti" in p1.prebans`,
		eval: (battles: BattleType[], filteredBattles: BattleType[], heroDicts: HeroDicts) => {
			const filterResult = compPlusMinus(filteredBattles);
			const prebanStats = StatsBuilder.getPrebanStats(battles, heroDicts);
			const harsettiPrebanStats = prebanStats.find((p) => p.preban.toLowerCase() === "harsetti");
			let scriptResult: number;
			if (!harsettiPrebanStats) {
				scriptResult = 0; // player never prebanned Harsetti
			}
			else {
				scriptResult = harsettiPrebanStats["+/-"];
			}
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Preban Rinak Arunka",
		filterStr: `"boss arunka" in p1.prebans; "rinak" in p1.prebans;`,
		eval: (battles: BattleType[], filteredBattles: BattleType[], heroDicts: HeroDicts) => {
			let filterResult = compPlusMinus(filteredBattles) + compWinrate(filteredBattles);
			if (isNaN(filterResult)) filterResult = 0;
			const prebanStats = StatsBuilder.getPrebanStats(battles, heroDicts);
			const targetStats = prebanStats.find((p) => {
				const preban = p.preban.toLowerCase();
				return preban.includes("rinak") && preban.includes("boss arunka");
			});
			console.log("Got target stats:", targetStats);
			let scriptResult: number;
			if (!targetStats) {
				scriptResult = 0;
			}
			else {
				scriptResult = targetStats["+/-"] + targetStats.wins / targetStats.appearances;
			}
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Success Rate New Moon Luna",
		filterStr: `OR(
						AND(
							"New Moon Luna" in p1.picks,
							is-win = true,
						),
						p2.postban = "New Moon Luna"
					)
					`,
		eval(battles, filteredBattles) {
			const newMoonLuna = filterPicks({
				battles,
				heroName: "New Moon Luna",
				isP1: true
			})
			const filterResult = StatsBuilder.divideToPercentString(filteredBattles.length, newMoonLuna.length);
			const stats = StatsBuilder.queryStats(newMoonLuna, battles.length, "New Moon Luna");
			const scriptResult = stats["Success Rate"];
			return [filterResult, scriptResult];
		}
	}, 
	{
		name: "CR Stats Lone Wolf Peira",
		filterStr: `"lone wolf peira" in p1.picks; "lone wolf peira" != p2.postban;`,
		eval(battles, filteredBattles) {
			const filterResult = computeAvgCR(filteredBattles, "Lone Wolf Peira") + computeFirstTurnRate(filteredBattles, "Lone Wolf Peira");
			const loneWolfPeira = filterPicks({
				battles,
				heroName: "Lone Wolf Peira",
				isP1: true
			})
			const crStats = StatsBuilder.computeCRStats(loneWolfPeira, "Lone Wolf Peira");
			const scriptResult = crStats.avgCR + crStats.firstTurnRate;
			return [filterResult, scriptResult];
		}

	},
	{
		name: "Player CR Stats Zio",
		filterStr: `"zio" in p1.picks; "zio" != p2.postban;`,
		eval(battles, filteredBattles) {
			const filterResult = computeAvgCR(filteredBattles, "Zio") + computeFirstTurnRate(filteredBattles, "Zio");
			const zio = filterPicks({
				battles,
				heroName: "Zio",
				isP1: true
			})
			const crStats = StatsBuilder.computeCRStats(zio, "Zio");
			const scriptResult = crStats.avgCR + crStats.firstTurnRate;
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Enemy CR Stats Zio",
		filterStr: `"zio" in p2.picks; "zio" != p1.postban;`,
		eval(battles, filteredBattles) {
			const filterResult = computeAvgCR(filteredBattles, "Zio") + computeFirstTurnRate(filteredBattles, "Zio");
			const zio = filterPicks({
				battles,
				heroName: "Zio",
				isP1: false
			})
			const crStats = StatsBuilder.computeCRStats(zio, "Zio");
			const scriptResult = crStats.avgCR + crStats.firstTurnRate;
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Total Wins",
		filterStr: `is-win = true;`,
		eval(battles, filteredBattles) {
			const generalStats = StatsBuilder.getGeneralStats(battles);
			const scriptResult = generalStats.total_wins;
			const filterResult = filteredBattles.length;
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Second Pick Winrate",
		filterStr: `is-win = true; is-first-pick = false;`,
		eval(battles, filteredBattles) {
			const generalStats = StatsBuilder.getGeneralStats(battles);
			const scriptResult = generalStats.second_pick_winrate;
			const secondPickGames = filterColByFn(battles, COLUMNS_MAP.FIRST_PICK, (v) => !v);
			const filterResult = StatsBuilder.divideToPercentString(filteredBattles.length, secondPickGames.length);
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Max Turns",
		filterStr: "",
		eval(battles) {
			const generalStats = StatsBuilder.getGeneralStats(battles);
			const scriptResult = generalStats.max_turns;
			const filterResult = Math.max(...battles.map((b) => b[COLUMNS_MAP.TURNS]));
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Max Time",
		filterStr: "",
		eval(battles) {
			const generalStats = StatsBuilder.getGeneralStats(battles);
			const scriptResult = generalStats.max_time;
			const filterResult = StatsBuilder.secondsToTimeStr(
				Math.max(...battles.map((b) => b[COLUMNS_MAP.SECONDS]))
			);
			return [filterResult, scriptResult];
		}
	},
	{
		name: "Average PPG",
		filterStr: "",
		eval(battles) {
			const generalStats = StatsBuilder.getGeneralStats(battles);
			const scriptResult = generalStats.avg_ppg;
			
			const totalPoints = battles.reduce((acc, b) => acc + (b[COLUMNS_MAP.POINT_GAIN] || 0), 0);
			const filterResult = StatsBuilder.divideToString(totalPoints, battles.length);
			return [filterResult, scriptResult];
		}
	}
]


