import HeroManager from "./hero-manager.js";
import ArtifactManager from "./artifact-manager.js";
import { EQUIPMENT_SET_MAP, 
    COLUMNS_MAP, 
    WORLD_CODE_TO_CLEAN_STR, 
    ARRAY_COLUMNS, 
    BOOLS_COLS, 
    INT_COLUMNS,
    TITLE_CASE_COLUMNS
} from "./references.js";
import { toTitleCase } from "../utils.js";

// takes in cleaned battle row (including from uploaded file or in formatBattleAsRow) 
// and adds fields representing sets heroes as prime products
function addPrimeFields(battle, HM) {
    const getChampPrime = name => HeroManager.getHeroByName(name, HM)?.prime ?? HM.Fodder.prime;
    const product = (acc, prime) => acc * prime;

    battle[COLUMNS_MAP.P1_PICKS_PRIMES] = battle[COLUMNS_MAP.P1_PICKS].map(getChampPrime);
    battle[COLUMNS_MAP.P2_PICKS_PRIMES] = battle[COLUMNS_MAP.P2_PICKS].map(getChampPrime);
    battle[COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] = battle[COLUMNS_MAP.P1_PICKS_PRIMES].reduce(product, 1);
    battle[COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] = battle[COLUMNS_MAP.P2_PICKS_PRIMES].reduce(product, 1);
    battle[COLUMNS_MAP.P1_PREBANS_PRIMES] = battle[COLUMNS_MAP.P1_PREBANS].map(getChampPrime);
    battle[COLUMNS_MAP.P2_PREBANS_PRIMES] = battle[COLUMNS_MAP.P2_PREBANS].map(getChampPrime);
    battle[COLUMNS_MAP.P1_PREBANS_PRIME_PRODUCT] = battle[COLUMNS_MAP.P1_PREBANS_PRIMES].reduce(product, 1);
    battle[COLUMNS_MAP.P2_PREBANS_PRIME_PRODUCT] = battle[COLUMNS_MAP.P2_PREBANS_PRIMES].reduce(product, 1);
}

const P1 = "p1";
const P2 = "p2";

// takes raw battle from array returned by rust battle array call to flask-server; formats into row to populate table
function formatBattleAsRow(raw, HM, artifacts) {

    // Make functions used to convert the identifier strings in the E7 data into human readable names

    const getChampName = code => HeroManager.getHeroByCode(code, HM)?.name ?? HM.Fodder.name;
    
    const getArtifactName = code => ArtifactManager.convertCodeToName(code, artifacts) || "None";

    const checkBanned = (player, index) => { // used to check if artifact is null because banned or because not equipped
        if (player === P1) {
            return raw.p2_postban === raw.p1_picks[index];
        } else {
            return raw.p1_postban === raw.p2_picks[index];
        }
    }
    const formatArtifacts = (player, artiArr) => artiArr.map((code, index) => code ? getArtifactName(code) : checkBanned(player, index) ? "n/a" : "None");
    const formatCRBar = crBar => crBar.map(entry => entry && entry.length == 2 ? [getChampName(entry[0]), entry[1]] : ["n/a", 0]);

    // Fall back to the code if the equipment set is not defined in references
    const formatEquipment = equipArr => equipArr.map(heroEquipList => heroEquipList.map(equip => EQUIPMENT_SET_MAP[equip] || equip));

    const firstTurnHero = raw.cr_bar.find(entry => entry[1] === 100);
    const p1TookFirstTurn = firstTurnHero ? raw.p1_picks.includes(firstTurnHero[0]) : false;

    const battle = {
        [COLUMNS_MAP.SEASON]: raw.season_name || "None",
        [COLUMNS_MAP.DATE_TIME]: raw.date_time,
        [COLUMNS_MAP.SECONDS]: raw.seconds,
        [COLUMNS_MAP.TURNS]: raw.turns,
        [COLUMNS_MAP.SEQ_NUM]: raw.seq_num,
        [COLUMNS_MAP.P1_ID]: raw.p1_id.toString(),
        [COLUMNS_MAP.P1_SERVER]: WORLD_CODE_TO_CLEAN_STR[raw.p1_server] || raw.p1_server || "None",
        [COLUMNS_MAP.P2_ID]: raw.p2_id.toString(),
        [COLUMNS_MAP.P2_SERVER]: WORLD_CODE_TO_CLEAN_STR[raw.p2_server] || raw.p2_server || "None",
        [COLUMNS_MAP.P1_LEAGUE]: toTitleCase(raw.p1_league) || "None",
        [COLUMNS_MAP.P2_LEAGUE]: toTitleCase(raw.p2_league) || "None",
        [COLUMNS_MAP.P1_POINTS]: raw.p1_win_score || null,
        [COLUMNS_MAP.POINT_GAIN]: raw.p1_point_delta || null,
        [COLUMNS_MAP.WIN]: raw.win === 1 ? true : false,
        [COLUMNS_MAP.FIRST_PICK]: raw.first_pick === 1 ? true : false,
        [COLUMNS_MAP.CR_BAR]: formatCRBar(raw.cr_bar),
        [COLUMNS_MAP.FIRST_TURN]: p1TookFirstTurn ? true : false,
        [COLUMNS_MAP.FIRST_TURN_HERO]: firstTurnHero ? getChampName(firstTurnHero[0]) : "n/a",
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
    addPrimeFields(battle, HM)
    return battle;
}

function buildFormattedBattleMap(rawBattles, HeroManager, artifacts) {
    artifacts = artifacts ?? ArtifactManager.getArtifacts();
    return Object.fromEntries(rawBattles.map(rawBattle => {
        let battle = formatBattleAsRow(rawBattle, HeroManager, artifacts);
        return [battle["Seq Num"], battle];
    }));
}


// takes output of CSV parse and parses the list rows and ensures types are correct
function parsedCSVToFormattedBattleMap(rawRowsArr, HM) {
    const rows = rawRowsArr.map(row => {
        for (const col of ARRAY_COLUMNS) {
            row[col] = JSON.parse(row[col]);
        }
        for (const col of BOOLS_COLS) {
            row[col] = row[col].toLowerCase() === "true";
        }
        for (const col of INT_COLUMNS) {
            row[col] = Number(row[col].replace("'", ""));
        }
        for (const col of TITLE_CASE_COLUMNS) {
            row[col] = toTitleCase(row[col]);
        }
        addPrimeFields(row, HM);
        return row;
    });
    return Object.fromEntries(rows.map(row => [row["Seq Num"], row]));
}

export { buildFormattedBattleMap, parsedCSVToFormattedBattleMap };