import { FilterParser, Filters } from "../e7/filter-parsing/filter-parser";
import type { BattleType } from "../e7/references";
import { FilterTestPacket, FilterTestDefinitions } from "./filter-test-definitions";
import { CONSOLE_LOGGER, LOG_CATEGORIES } from "../console-logging";
import { applyFilters } from "../e7/battle-manager";
import type { HeroDicts } from "../e7/hero-manager";

function genFilterBehaviorTest(filterTestPacket: FilterTestPacket, battlesList: BattleType[], heroDicts: HeroDicts): (suppressLogs?: boolean) => Promise<void> {
    return async () => {
        let passed = false;
        let filteredBattles: BattleType[] = [];
        CONSOLE_LOGGER.bindCategory(LOG_CATEGORIES.TEST);
        try {
            const parser: FilterParser = await FilterParser.fromFilterStr(filterTestPacket.filterStr, heroDicts);
            const filters: Filters = parser.getFilters();
            filteredBattles = await applyFilters(battlesList, filters);
            passed = filterTestPacket.validationFn(filteredBattles);
        } catch (e) {
            passed = false;
            console.error(`Test: "${filterTestPacket.name}" Behavior threw error: `, e);
        }
        CONSOLE_LOGGER.unbindCategory();
        if (!passed) {
            console.error(`Test: "${filterTestPacket.name}" Behavior Failed: `, battlesList, filteredBattles);
        } else {
            console.log(`Test: "${filterTestPacket.name}" Behavior Passed`);
        }
    }
}

function genParseTest(filterTestPacket: FilterTestPacket, battlesList: BattleType[], heroDicts: HeroDicts): ParseTest {
    return async () => {
        CONSOLE_LOGGER.bindCategory(LOG_CATEGORIES.TEST);
        try {
            const parser: FilterParser = await FilterParser.fromFilterStr(filterTestPacket.filterStr, heroDicts);
            const filters: Filters = parser.getFilters();
            await applyFilters(battlesList, filters);
        } catch (e) {
            console.error(`Test: "${filterTestPacket.name}" Failed: `, e);
            return;
        }
        CONSOLE_LOGGER.unbindCategory();
        console.log(`Test: "${filterTestPacket.name}" Parse Passed`);
    }
}

type ParseTest = (suppressLogs?: boolean) => Promise<void>;


export async function runFilterTests(battlesList: BattleType[], heroDicts: HeroDicts) {

    if (!battlesList || battlesList.length === 0) {
        console.error("No battles found for filter tests!");
        return;
    }

    const PARSE_TESTS: ParseTest[] = Object.values(
        FilterTestDefinitions).map((filterTestPacket) => genParseTest(filterTestPacket, battlesList, heroDicts)
    );


    console.log("\n===================RUNNING PARSE TESTS===================\n");
    for (const test of PARSE_TESTS) {
        await test();
    }

    const genBehaviorTest = (filterTestPacket: FilterTestPacket) => genFilterBehaviorTest(filterTestPacket, battlesList, heroDicts);

    const BEHAVIOR_TESTS = [
        genBehaviorTest(FilterTestDefinitions.last100),
        genBehaviorTest(FilterTestDefinitions.last10),
        genBehaviorTest(FilterTestDefinitions.nestedParentheses),
        genBehaviorTest(FilterTestDefinitions.braceHeroSet),
        genBehaviorTest(FilterTestDefinitions.braceDateSet),
        genBehaviorTest(FilterTestDefinitions.braceVictoryPoints),
        genBehaviorTest(FilterTestDefinitions.trailingSetComma),
        genBehaviorTest(FilterTestDefinitions.commasInOr),
        genBehaviorTest(FilterTestDefinitions.parenthesesNot),
        genBehaviorTest(FilterTestDefinitions.setWithStrings),
    ]

    console.log("\n===================RUNNING BEHAVIOR TESTS===================\n");
    for (const test of BEHAVIOR_TESTS) {
        await test();
    }
}