import { BattleType } from "../e7/references";
import { BATTLES } from "./test-required-objects";
import { COLUMNS_MAP } from "../e7/references";
import { SEQ_NUM_RESULTS } from "./filter-test-results";

const hundredthDateTime = BATTLES.slice(-100)[0][COLUMNS_MAP.DATE_TIME];
const tenthDateTime = BATTLES.slice(-10)[0][COLUMNS_MAP.DATE_TIME];

console.log("Last-N DateTimes:", hundredthDateTime, tenthDateTime);


function getSeqNumArray(battles: BattleType[]): number[] {
	return battles.map((b) => Number(b[COLUMNS_MAP.SEQ_NUM]));
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


export type FilterTestPacket = {
	name: string;
	filterStr: string;
	validationFn: (battles: BattleType[]) => boolean;
};

const FilterTestDefinitions: { [key: string]: FilterTestPacket } = {
	// Base Filters - Boolean
	isWinTrue: {
		name: "isWinTrue",
		filterStr: "is-win = true;",
		validationFn: () => false,
	},
	notFirstPick: {
		name: "notFirstPick",
		filterStr: "is-first-pick != false;",
		validationFn: () => false,
	},

	// Base Filters - Integer
	highVictoryPoints: {
		name: "highVictoryPoints",
		filterStr: "victory-points > 2500;",
		validationFn: () => false,
	},
	shortBattle: {
		name: "shortBattle",
		filterStr: "turns <= 10;",
		validationFn: () => false,
	},
	negativePointGain: {
		name: "negativePointGain",
		filterStr: "point-gain < 0;",
		validationFn: () => false,
	},

	// Base Filters - Date
	after2025Aug: {
		name: "after2025Aug",
		filterStr: "date >= 2025-08-01;",
		validationFn: () => false,
	},
	july2025Range: {
		name: "july2025Range",
		filterStr: "date in 2025-07-01...2025-07-31;",
		validationFn: () => false,
	},

	// Base Filters - String
	p2LeagueChampion: {
		name: "p2LeagueChampion",
		filterStr: `p2.league = "champion";`,
		validationFn: () => false,
	},
	notZioFirstTurn: {
		name: "notZioFirstTurn",
		filterStr: `first-turn-hero != 'Zio';`,
		validationFn: () => false,
	},
	p1serverGlobal: {
		name: "p1serverGlobal",
		filterStr: `p1.server = "Global";`,
		validationFn: () => false,
	},
	p2serverGlobal: {
		name: "p2serverGlobal",
		filterStr: `p2.server = "Global";`,
		validationFn: () => false,
	},

	// Base Filters - Set Membership
	rinakInPrebans: {
		name: "rinakInPrebans",
		filterStr: `"Rinak" in prebans;`,
		validationFn: () => false,
	},
	peiraNotInP2Picks: {
		name: "peiraNotInP2Picks",
		filterStr: `"Lone Wolf Peira" !in p2.picks;`,
		validationFn: () => false,
	},
	pick1InSet: {
		name: "pick1InSet",
		filterStr: `p1.pick1 in { "Lone Wolf Peira", "Boss Arunka"};`,
		validationFn: () => false,
	},

	// Base Filters - Range
	victoryPointsRange: {
		name: "victoryPointsRange",
		filterStr: "victory-points in 2400...=2600;",
		validationFn: () => false,
	},
	dateNotInRange: {
		name: "dateNotInRange",
		filterStr: "date !in 2025-07-15...=2025-07-31;",
		validationFn: () => false,
	},

	// Clause Functions
	andExample: {
		name: "andExample",
		filterStr: `AND(is-win = true, p2.league = "Champion", victory-points > 2400);`,
		validationFn: () => false,
	},
	orExample: {
		name: "orExample",
		filterStr: `OR(p2.server = "Global", p2.server = "Asia", p2.server = "Europe");`,
		validationFn: () => false,
	},
	xorExample: {
		name: "xorExample",
		filterStr: `XOR(is-first-pick = true, is-first-turn = true);`,
		validationFn: () => false,
	},
	notExample: {
		name: "notExample",
		filterStr: `NOT(is-win = true);`,
		validationFn: () => false,
	},
	notPickExample: {
		name: "notPickExample",
		filterStr: `NOT(p1.pick1 = "Arbiter Vildred");`,
		validationFn: () => false,
	},

	// Nested Clauses
	nestedAndOr: {
		name: "nestedAndOr",
		filterStr: `AND(OR(is-win = true, point-gain > 0), NOT(p2.league = "challenger"));`,
		validationFn: () => false,
	},

	// Direct Functions
	equipmentExample: {
		name: "equipmentExample",
		filterStr: `p1.equipment("Arbiter Vildred", {Torrent, Torrent, Immunity});`,
		validationFn: () => false,
	},
	equipmentSingle: {
		name: "equipmentSingle",
		filterStr: `p2.equipment("Lone Wolf Peira", "Speed");`,
		validationFn: () => false,
	},
	artifactSingle: {
		name: "artifactSingle",
		filterStr: `p1.artifact("Arbiter Vildred", "Alexa's Basket");`,
		validationFn: () => false,
	},
	artifactSet: {
		name: "artifactSet",
		filterStr: `p2.artifact("Abyssal Yufine", {"Elbris Ritual Sword", "Aurius"});`,
		validationFn: () => false,
	},
	crEqual: {
		name: "crEqual",
		filterStr: `p2.cr("Harsetti" = 100);`,
		validationFn: () => false,
	},
	crGreater: {
		name: "crGreater",
		filterStr: `p1.cr("Amid", > , 95);`,
		validationFn: () => false,
	},

	// Global Filters
	last100: {
		name: "last100",
		filterStr: "last-N(100);",
		validationFn: (battles) => battles.length === 100 && battles[0][COLUMNS_MAP.DATE_TIME] === hundredthDateTime,
	},
	last10: {
		name: "last10",
		filterStr: "last-N(10);",
		validationFn: (battles) => battles.length === 10 && battles[0][COLUMNS_MAP.DATE_TIME] === tenthDateTime,
	},

	// Pure Syntax Examples
	semicolonChain: {
		name: "semicolonChain",
		filterStr: `is-win = true; p2.league = "Champion"; last-N(100);`,
		validationFn: () => false,
	},
	commasInOr: {
		name: "commasInOr",
		filterStr: `OR(p2.server = "Global", p2.server = "Asia");`,
		validationFn: (battles: BattleType[]) => arraysEqual(getSeqNumArray(battles), SEQ_NUM_RESULTS.commasInOr),
	},
	setWithStrings: {
		name: "setWithStrings",
		filterStr: `p1.pick3 in {Zio, "Amid", "Lionheart Cermia"};`,
		validationFn: (battles: BattleType[]) => arraysEqual(getSeqNumArray(battles), SEQ_NUM_RESULTS.setWithStrings),
	},
	parenthesesNot: {
		name: "parenthesesNot",
		filterStr: `NOT(is-first-turn = true);`,
		validationFn: (battles: BattleType[]) => arraysEqual(getSeqNumArray(battles), SEQ_NUM_RESULTS.parenthesesNot),
	},

	nestedParentheses: {
		name: "nestedParentheses",
		filterStr: `AND(is-win = true, OR(p2.server = "Global", p2.server = "Korea"));`,
		validationFn: (battles: BattleType[]) => arraysEqual(getSeqNumArray(battles), SEQ_NUM_RESULTS.nestedParentheses),
	},
	braceHeroSet: {
		name: "braceHeroSet",
		filterStr: `p1.pick1 in {"Abyssal Yufine", "New Moon luna"};`,
		validationFn: (battles: BattleType[]) => arraysEqual(getSeqNumArray(battles), SEQ_NUM_RESULTS.braceHeroSet),
	},
	braceVictoryPoints: {
		name: "braceVictoryPoints",
		filterStr: `victory-points in {1646, 1668};`,
		validationFn: (battles: BattleType[]) => arraysEqual(getSeqNumArray(battles), SEQ_NUM_RESULTS.braceVictoryPoints),
	},
	braceDateSet: {
		name: "braceDateSet",
		filterStr: `date in {2025-01-01, 2025-01-05, 2025-01-07};`,
		validationFn: (battles: BattleType[]) => getSeqNumArray(battles).length === 0,
	},
	trailingSetComma: {
		name: "trailingSetComma",
		filterStr: `p1.pick1 in { "Lone Wolf Peira", "Boss Arunka", };`,
		validationFn: (battles: BattleType[]) => arraysEqual(getSeqNumArray(battles), SEQ_NUM_RESULTS.trailingSetComma),
	},
};

export { FilterTestDefinitions };
