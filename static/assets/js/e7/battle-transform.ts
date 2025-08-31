import HeroManager, { HeroDicts } from "./hero-manager.ts";
import ArtifactManager from "./artifact-manager.ts";
import {
	EQUIPMENT_SET_MAP,
	COLUMNS_MAP,
	WORLD_CODE_TO_CLEAN_STR,
} from "./references.ts";
import { toTitleCase } from "../str-functions.ts";
import type { BattlesObj, BattleType, BattleTypeNoPrimes, RawUploadBattle } from "./references.ts";

// takes in cleaned battle row (including from uploaded file or in formatBattleAsRow)
// and adds fields representing sets heroes as prime products
function addPrimeFields(battle: BattleType, HeroDicts: HeroDicts) {
	const getChampPrime = (name: string) =>
		HeroManager.getHeroByName(name, HeroDicts)?.prime ?? HeroDicts.Fodder.prime;

	battle[COLUMNS_MAP.P1_PICKS_PRIMES] =
		battle[COLUMNS_MAP.P1_PICKS].map(getChampPrime);

	battle[COLUMNS_MAP.P2_PICKS_PRIMES] =
		battle[COLUMNS_MAP.P2_PICKS].map(getChampPrime);

	battle[COLUMNS_MAP.P1_PREBANS_PRIMES] =
		battle[COLUMNS_MAP.P1_PREBANS].map(getChampPrime);

	battle[COLUMNS_MAP.P2_PREBANS_PRIMES] =
		battle[COLUMNS_MAP.P2_PREBANS].map(getChampPrime);
}

const P1 = "p1";
const P2 = "p2";

export type RawBattle = {
  date_time: string;
  season_name: string;
  season_code: string;
  seq_num: string;
  win: number;           // u8 -> number
  first_pick: number;    // u8 -> number
  turns: number;         // i16 -> number
  seconds: number;       // i16 -> number
  p1_id: number;         // i32 -> number
  p2_id: number;         // i32 -> number
  p1_server: string;
  p2_server: string;
  p1_league: string;
  p2_league: string;
  p1_prebans: string[];
  p2_prebans: string[];
  p1_picks: string[];
  p2_picks: string[];
  p1_mvp?: string;       // Option<String> -> optional
  p2_mvp?: string;
  p1_postban?: string;
  p2_postban?: string;
  p1_equipment: string[][];
  p2_equipment: string[][];
  cr_bar: [string, number][];  // Vec<(String, i8)>
  p1_artifacts: string[];
  p2_artifacts: string[];
  p1_point_delta: number; // i16 -> number
  p1_win_score: number;   // i16 -> number
}

// takes raw battle from array returned by rust battle array call to flask-server; formats into row to populate table
function formatBattleAsRow(raw: RawBattle, HeroDicts: HeroDicts, artifacts: Record<string, string>) {
	// Make functions used to convert the identifier strings in the E7 data into human readable names

	const getChampName = (code: string | undefined) =>
		HeroManager.getHeroByCode(code, HeroDicts)?.name ?? HeroDicts.Fodder.name;

	const getArtifactName = (code: string) =>
		ArtifactManager.convertCodeToName(code, artifacts) || "None";

	const checkBanned = (player: string, index: number) => {
		// used to check if artifact is null because banned or because not equipped
		if (player === P1) {
			return raw.p2_postban === raw.p1_picks[index];
		} else {
			return raw.p1_postban === raw.p2_picks[index];
		}
	};
	const formatArtifacts = (player: string, artiArr: string[]) =>
		artiArr.map((code, index) =>
			code ? getArtifactName(code) : checkBanned(player, index) ? "n/a" : "None"
		);
	function formatCRBar(crBar: ([string, number] | null)[]): [string, number][] {
		return crBar.map((entry) =>
			entry && entry.length == 2
				? [getChampName(entry[0]), entry[1]]
				: ["n/a", 0]
		);
	}

	// Fall back to the code if the equipment set is not defined in references
	const formatEquipment = (equipArr: string[][]) =>
		equipArr.map((heroEquipList) =>
			heroEquipList.map((equip) => EQUIPMENT_SET_MAP[equip] || equip)
		);

	const firstTurnHero = raw.cr_bar.find((entry) => entry[1] === 100);
	const p1TookFirstTurn = firstTurnHero
		? raw.p1_picks.includes(firstTurnHero[0])
		: false;

	const battle: BattleTypeNoPrimes = {
		[COLUMNS_MAP.SEASON]: raw.season_name || "None",
		[COLUMNS_MAP.SEASON_CODE]: raw.season_code || "None",
		[COLUMNS_MAP.DATE_TIME]: raw.date_time,
		[COLUMNS_MAP.SECONDS]: raw.seconds,
		[COLUMNS_MAP.TURNS]: raw.turns,
		[COLUMNS_MAP.SEQ_NUM]: raw.seq_num,
		[COLUMNS_MAP.P1_ID]: raw.p1_id.toString(),
		[COLUMNS_MAP.P1_SERVER]:
			WORLD_CODE_TO_CLEAN_STR[raw.p1_server] || raw.p1_server || "None",
		[COLUMNS_MAP.P2_ID]: raw.p2_id.toString(),
		[COLUMNS_MAP.P2_SERVER]:
			WORLD_CODE_TO_CLEAN_STR[raw.p2_server] || raw.p2_server || "None",
		[COLUMNS_MAP.P1_LEAGUE]: toTitleCase(raw.p1_league) || "None",
		[COLUMNS_MAP.P2_LEAGUE]: toTitleCase(raw.p2_league) || "None",
		[COLUMNS_MAP.P1_POINTS]: raw.p1_win_score,
		[COLUMNS_MAP.POINT_GAIN]: raw.p1_point_delta || null,
		[COLUMNS_MAP.WIN]: raw.win === 1 ? true : false,
		[COLUMNS_MAP.FIRST_PICK]: raw.first_pick === 1 ? true : false,
		[COLUMNS_MAP.FIRST_TURN]: p1TookFirstTurn ? true : false,
		[COLUMNS_MAP.FIRST_TURN_HERO]: firstTurnHero
			? getChampName(firstTurnHero[0])
			: "n/a",
		[COLUMNS_MAP.CR_BAR]: formatCRBar(raw.cr_bar),
		[COLUMNS_MAP.P1_PREBANS]: raw.p1_prebans.map(getChampName),
		[COLUMNS_MAP.P2_PREBANS]: raw.p2_prebans.map(getChampName),
		[COLUMNS_MAP.P1_PICKS]: raw.p1_picks.map(getChampName),
		[COLUMNS_MAP.P2_PICKS]: raw.p2_picks.map(getChampName),
		[COLUMNS_MAP.P1_POSTBAN]: getChampName(raw.p1_postban),
		[COLUMNS_MAP.P2_POSTBAN]: getChampName(raw.p2_postban),
		[COLUMNS_MAP.P1_EQUIPMENT]: formatEquipment(raw.p1_equipment),
		[COLUMNS_MAP.P2_EQUIPMENT]: formatEquipment(raw.p2_equipment),
		[COLUMNS_MAP.P1_ARTIFACTS]: formatArtifacts(P1, raw.p1_artifacts),
		[COLUMNS_MAP.P2_ARTIFACTS]: formatArtifacts(P2, raw.p2_artifacts),
		[COLUMNS_MAP.P1_MVP]: getChampName(raw.p1_mvp),
		[COLUMNS_MAP.P2_MVP]: getChampName(raw.p2_mvp),
	};

	// finally take the array hero array fields and compute the prime products after converting; will be used to compute statistics more easily
	addPrimeFields(battle as BattleType, HeroDicts);
	return battle;
}

function buildFormattedBattleMap(rawBattles: RawBattle[], HeroDicts: HeroDicts, artifacts: Record<string, string>) {
	artifacts = artifacts ?? ArtifactManager.getArtifactCodeToNameMap();
	let entries = [];
	for (const rawBattle of rawBattles) {
		let battle = formatBattleAsRow(rawBattle, HeroDicts, artifacts);
		entries.push([battle["Seq Num"], battle]);
	}
	return Object.fromEntries(entries);
}

function castRawUploadBattle(raw: RawUploadBattle): BattleTypeNoPrimes {
	return Object.fromEntries(
		Object.entries(raw).map(([column, value]) => [
			column,
			JSON.parse(value),
		])
	) as BattleTypeNoPrimes;
}

// takes output of CSV parse and parses the list rows and ensures types are correct
function parsedCSVToFormattedBattleMap(rawRowsArr: RawUploadBattle[], HeroDicts: HeroDicts): BattlesObj {
	const rows = rawRowsArr.map((row) => {
		const formattedRow = castRawUploadBattle(row);
		console.log("Formatted Row: ", formattedRow);
		addPrimeFields(formattedRow as BattleType, HeroDicts);
		return formattedRow;
	});
	return Object.fromEntries(rows.map((row) => [row[COLUMNS_MAP.SEQ_NUM], row])) as BattlesObj;
}

export { buildFormattedBattleMap, parsedCSVToFormattedBattleMap };
