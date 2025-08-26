import { toTitleCase } from "../str-functions";

export const LANGUAGES = {
	CODES: {
		DE: "de",
		KO: "ko",
		PT: "pt",
		TH: "th",
		ZH_TW: "zh-TW",
		JA: "ja",
		EN: "en",
		FR: "fr",
		ZH_CN: "zh-CN",
		ES: "es",
	},

	NAMES: {
		DE: "German",
		KO: "Korean",
		PT: "Portuguese",
		TH: "Thai",
		ZH_TW: "Chinese (Traditional, Taiwan)",
		JA: "Japanese",
		EN: "English",
		FR: "French",
		ZH_CN: "Chinese (Simplified, China)",
		ES: "Spanish",
	}
} as const;

export type LanguageCode = typeof LANGUAGES.CODES[keyof typeof LANGUAGES.CODES];
export type LanguageName = typeof LANGUAGES.NAMES[keyof typeof LANGUAGES.NAMES];

export const WORLD_CODES: Set<string> = new Set([
	"world_kor",
	"world_global",
	"world_jpn",
	"world_asia",
	"world_eu",
]);

export const WORLD_CODE_ENUM = {
	GLOBAL: "world_global",
	KOR: "world_kor",
	JPN: "world_jpn",
	ASIA: "world_asia",
	EU: "world_eu",
};

export const WORLD_CODE_TO_CLEAN_STR: Record<string, string> = {
	[WORLD_CODE_ENUM.GLOBAL]: "Global",
	[WORLD_CODE_ENUM.KOR]: "Korea",
	[WORLD_CODE_ENUM.JPN]: "Japan",
	[WORLD_CODE_ENUM.ASIA]: "Asia",
	[WORLD_CODE_ENUM.EU]: "Europe",
};

export const CLEAN_STR_TO_WORLD_CODE: Record<string, string> = {
	[WORLD_CODE_TO_CLEAN_STR.world_global]: WORLD_CODE_ENUM.GLOBAL,
	[WORLD_CODE_TO_CLEAN_STR.world_kor]: WORLD_CODE_ENUM.KOR,
	[WORLD_CODE_TO_CLEAN_STR.world_jpn]: WORLD_CODE_ENUM.JPN,
	[WORLD_CODE_TO_CLEAN_STR.world_asia]: WORLD_CODE_ENUM.ASIA,
	[WORLD_CODE_TO_CLEAN_STR.world_eu]: WORLD_CODE_ENUM.EU,
};

export const WORLD_CODE_LOWERCASE_TO_CLEAN_STR: Record<string, string> =
	Object.fromEntries(Object.values(WORLD_CODE_TO_CLEAN_STR).map((v) => [v.toLowerCase(), v]));

export const EQUIPMENT_SET_MAP: Record<string, string> = {
	set_speed: "Speed",
	set_acc: "Hit",
	set_cri: "Critical",
	set_res: "Resist",
	set_def: "Defense",
	set_att: "Attack",
	set_max_hp: "Health",
	set_cri_dmg: "Destruction",
	set_coop: "Unity",
	set_immune: "Immunity",
	set_rage: "Rage",
	set_vampire: "Lifesteal",
	set_shield: "Protection",
	set_revenge: "Revenge",
	set_penetrate: "Penetration",
	set_torrent: "Torrent",
	set_counter: "Counter",
	set_scar: "Injury",
};

export const ONE_DAY: number = 1000 * 60 * 60 * 24;

export const LEAGUE_MAP: Record<string, number> = {
	bronze: 0,
	silver: 1,
	gold: 2,
	master: 3,
	challenger: 4,
	champion: 5,
	warlord: 6,
	emperor: 7,
	legend: 8,
};

export const LEAGUE_TO_CLEAN_STR =
	Object.fromEntries(Object.keys(LEAGUE_MAP).sort((a, b) => LEAGUE_MAP[a] - LEAGUE_MAP[b]).map((k) => [k, toTitleCase(k)]));

export const COLUMNS_MAP = {
	SEASON: "Season",
	SEASON_CODE: "Season Code",
	DATE_TIME: "Date/Time",
	SECONDS: "Seconds",
	TURNS: "Turns",
	SEQ_NUM: "Seq Num",
	P1_ID: "P1 ID",
	P1_SERVER: "P1 Server",
	P2_ID: "P2 ID",
	P2_SERVER: "P2 Server",
	P1_LEAGUE: "P1 League",
	P2_LEAGUE: "P2 League",
	P1_POINTS: "P1 Points",
	POINT_GAIN: "Point Gain",
	WIN: "Win",
	FIRST_PICK: "First Pick",
	FIRST_TURN: "First Turn",
	FIRST_TURN_HERO: "First Turn Hero",
	CR_BAR: "CR Bar",
	P1_PREBANS: "P1 Prebans",
	P2_PREBANS: "P2 Prebans",
	P1_PICKS: "P1 Picks",
	P2_PICKS: "P2 Picks",
	P1_POSTBAN: "P1 Postban",
	P2_POSTBAN: "P2 Postban",
	P1_EQUIPMENT: "P1 Equipment",
	P2_EQUIPMENT: "P2 Equipment",
	P1_ARTIFACTS: "P1 Artifacts",
	P2_ARTIFACTS: "P2 Artifacts",
	P1_MVP: "P1 MVP",
	P2_MVP: "P2 MVP",
	P1_PICKS_PRIMES: "P1 Picks Primes",
	P1_PICKS_PRIME_PRODUCT: "P1 Picks Prime Product",
	P2_PICKS_PRIMES: "P2 Picks Primes",
	P2_PICKS_PRIME_PRODUCT: "P2 Picks Prime Product",
	P1_PREBANS_PRIMES: "P1 Prebans Primes",
	P1_PREBANS_PRIME_PRODUCT: "P1 Prebans Prime Product",
	P2_PREBANS_PRIMES: "P2 Prebans Primes",
	P2_PREBANS_PRIME_PRODUCT: "P2 Prebans Prime Product",
} as const;

export type ColumnKey = keyof typeof COLUMNS_MAP;
export type ColumnHeader = typeof COLUMNS_MAP[ColumnKey];

export const CSVHeaders: ColumnHeader[] = Object.values(COLUMNS_MAP).filter(h => !h.toLowerCase().includes("prime"));

export type BattleType = {
	[COLUMNS_MAP.SEASON]: string;
	[COLUMNS_MAP.SEASON_CODE]: string;
	[COLUMNS_MAP.DATE_TIME]: string;
	[COLUMNS_MAP.SECONDS]: number;
	[COLUMNS_MAP.TURNS]: number;
	[COLUMNS_MAP.SEQ_NUM]: string;
	[COLUMNS_MAP.P1_ID]: string;
	[COLUMNS_MAP.P1_SERVER]: string;
	[COLUMNS_MAP.P2_ID]: string;
	[COLUMNS_MAP.P2_SERVER]: string;
	[COLUMNS_MAP.P1_LEAGUE]: string;
	[COLUMNS_MAP.P2_LEAGUE]: string;
	[COLUMNS_MAP.P1_POINTS]: number;
	[COLUMNS_MAP.POINT_GAIN]: number | null;
	[COLUMNS_MAP.WIN]: boolean;
	[COLUMNS_MAP.FIRST_PICK]: boolean;
	[COLUMNS_MAP.FIRST_TURN]: boolean;
	[COLUMNS_MAP.FIRST_TURN_HERO]: string;
	[COLUMNS_MAP.CR_BAR]: Array<[string, number]>;
	[COLUMNS_MAP.P1_PREBANS]: string[];
	[COLUMNS_MAP.P2_PREBANS]: string[];
	[COLUMNS_MAP.P1_PICKS]: string[];
	[COLUMNS_MAP.P2_PICKS]: string[];
	[COLUMNS_MAP.P1_POSTBAN]: string;
	[COLUMNS_MAP.P2_POSTBAN]: string;
	[COLUMNS_MAP.P1_EQUIPMENT]: Array<Array<string>>;
	[COLUMNS_MAP.P2_EQUIPMENT]: Array<Array<string>>;
	[COLUMNS_MAP.P1_ARTIFACTS]: string[];
	[COLUMNS_MAP.P2_ARTIFACTS]: string[];
	[COLUMNS_MAP.P1_MVP]: string;
	[COLUMNS_MAP.P2_MVP]: string;
	[COLUMNS_MAP.P1_PICKS_PRIMES]: number[];
	[COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT]: number;
	[COLUMNS_MAP.P2_PICKS_PRIMES]: number[];
	[COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT]: number;
	[COLUMNS_MAP.P1_PREBANS_PRIMES]: number[];
	[COLUMNS_MAP.P1_PREBANS_PRIME_PRODUCT]: number;
	[COLUMNS_MAP.P2_PREBANS_PRIMES]: number[];
	[COLUMNS_MAP.P2_PREBANS_PRIME_PRODUCT]: number;
};

export type BattleTypeNoPrimes = Omit<
  BattleType,
  | typeof COLUMNS_MAP.P1_PICKS_PRIMES
  | typeof COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT
  | typeof COLUMNS_MAP.P2_PICKS_PRIMES
  | typeof COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT
  | typeof COLUMNS_MAP.P1_PREBANS_PRIMES
  | typeof COLUMNS_MAP.P1_PREBANS_PRIME_PRODUCT
  | typeof COLUMNS_MAP.P2_PREBANS_PRIMES
  | typeof COLUMNS_MAP.P2_PREBANS_PRIME_PRODUCT
>;

export type BattleTypeNoPrimesColums = keyof BattleTypeNoPrimes;

export type RawUploadBattle = {
  [K in keyof BattleTypeNoPrimes]: string;
};

export const ARRAY_COLUMNS = [
	COLUMNS_MAP.P1_EQUIPMENT,
	COLUMNS_MAP.P2_EQUIPMENT,
	COLUMNS_MAP.P1_ARTIFACTS,
	COLUMNS_MAP.P2_ARTIFACTS,
	COLUMNS_MAP.CR_BAR,
	COLUMNS_MAP.P1_PREBANS,
	COLUMNS_MAP.P2_PREBANS,
	COLUMNS_MAP.P1_PICKS,
	COLUMNS_MAP.P2_PICKS,
] as const;

export const BOOLS_COLS = [
	COLUMNS_MAP.FIRST_PICK,
	COLUMNS_MAP.FIRST_TURN,
	COLUMNS_MAP.WIN,
] as const;

export const INT_COLUMNS = [
	COLUMNS_MAP.SECONDS,
	COLUMNS_MAP.TURNS,
	COLUMNS_MAP.P1_POINTS,
	COLUMNS_MAP.POINT_GAIN,
] as const;

export const TITLE_CASE_COLUMNS = [
	COLUMNS_MAP.P1_LEAGUE,
	COLUMNS_MAP.P2_LEAGUE,
] as const;

export const HERO_STATS_COLUMN_MAP: Record<string, string> = {
	HERO_NAME: "Hero Name",
	BATTLES: "Battles",
	PICK_RATE: "Pick Rate",
	WINS: "Wins",
	WIN_RATE: "Win rate",
	POSTBANS: "Postbans",
	POSTBAN_RATE: "Postban Rate",
	SUCCESS_RATE: "Success Rate", // success rate indicates a win or a postban
	PLUS_MINUS: "+/-",
	POINT_GAIN: "Point Gain",
	AVG_CR: "Avg CR",
	FIRST_TURNS: "First Turns",
	FIRST_TURN_RATE: "First Turn Rate",
};

export const E7_STOVE_HOME_URL: string = "https://epic7.onstove.com"
export const E7_GG_HOME_URL: string = E7_STOVE_HOME_URL + "/gg"

/**
 * Generates a list of all prime numbers up to and including the given limit.
 *
 * Uses the Sieve of Eratosthenes algorithm to generate the list.
 *
 * Primes are used to represent as prime identifier allowing us to represent a set as a product of primes
 *
 * @param {number} limit - The upper limit of the prime numbers to generate. Must be a positive integer.
 * @returns {number[]} - A list of all prime numbers up to and including the given limit.
 */
function getPrimes(limit: number): number[] {
	const sieve = new Uint8Array(limit + 1);
	const primes = [];
	for (let i = 2; i <= limit; i++) {
		if (!sieve[i]) {
			primes.push(i);
			for (let j = i * i; j <= limit; j += i) {
				sieve[j] = 1;
			}
		}
	}
	return primes;
}

export const PRIMES: number[] = getPrimes(30000);
