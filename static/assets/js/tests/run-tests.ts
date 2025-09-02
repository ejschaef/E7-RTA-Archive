import { ContentManager } from "../content-manager";
import { FilterParser, Filters } from "../e7/filter-parsing/filter-parser";
import { STATS_TESTS, FilterTests } from "./test-definitions";
import { NOT_IMPLEMENTED, Test } from "./test-struct";
import { CONSOLE_LOGGER, LOG_CATEGORIES } from "../console-logging";
import type { HeroDicts } from "../e7/hero-manager";
import type { BattleType } from "../e7/references";

const bar = () => console.log("------------------------------------------------")

async function runEvalTest(test: Test, battles: BattleType[], heroDicts: HeroDicts) {
    CONSOLE_LOGGER.bindCapture(test.name);
    const testResult = await performTest(test, battles, heroDicts);
    CONSOLE_LOGGER.unbindCapture();
    if (testResult) {
        console.log(`Test: "${test.name}" Passed`);
    } else {
        bar();
        console.log("Captured Logs:");
        const captures = CONSOLE_LOGGER.captures[test.name];
        for (const capture of captures) {
            console.log(...capture);
        }
        bar();
    }
}

async function performTest(test: Test, battles: BattleType[], heroDicts: HeroDicts): Promise<boolean> {
    try {
        const parser: FilterParser = await FilterParser.fromFilterStr(test.filterStr, heroDicts);
        const filters: Filters = parser.getFilters();
        const filteredBattles: BattleType[] = await ContentManager.BattleManager.applyFilters(battles, filters);
        const result = test.eval(battles, filteredBattles, heroDicts);
        if (Array.isArray(result)) {
            const [filterResult, scriptResult] = result;
            if (!(filterResult === scriptResult)) {
                console.error(`Test: "${test.name}" Failed; Filter Result: ${filterResult}; Script Result: ${scriptResult}; `, battles, filteredBattles);
                return false;
            }
        } else if (typeof result === "boolean") {
            if (!result) {
                console.error(`Test: "${test.name}" Failed; `, battles, filteredBattles);
                return false;
            }
        } else if (result === NOT_IMPLEMENTED) {
            console.warn(`Test: "${test.name}" Not Implemented; `);
            return false;
        }
        return true;
    } catch (e) {
        console.error(`Test: "${test.name}" Failed: `, e);
        return false;
    }
}

async function runParseTest(test: Test, battles: BattleType[], heroDicts: HeroDicts) {
    CONSOLE_LOGGER.bindCategory(LOG_CATEGORIES.TEST);
    try {
        const parser: FilterParser = await FilterParser.fromFilterStr(test.filterStr, heroDicts);
        const filters: Filters = parser.getFilters();
        await ContentManager.BattleManager.applyFilters(battles, filters);
    } catch (e) {
        console.error(`Test: "${test.name}" Failed: `, e);
        return;
    }
    CONSOLE_LOGGER.unbindCategory();
    console.log(`Test: "${test.name}" Passed`);
}


export async function runStatsTests(battles: BattleType[], heroDicts: HeroDicts) {
    console.log("\n=======RUNNING STATS TESTS=======\n");
    const battlesList = Object.values(battles);
    for (const test of STATS_TESTS) {
        await runEvalTest(test, battlesList, heroDicts);
    }
}

export async function runFilterBehaviorTests(battles: BattleType[], heroDicts: HeroDicts) {
    console.log("\n=======RUNNING FILTER BEHAVIOR TESTS=======\n");
    const battlesList = Object.values(battles);
    for (const test of FilterTests) {
        await runEvalTest(test, battlesList, heroDicts);
    }
}

export async function runFilterParseTests(battles: BattleType[], heroDicts: HeroDicts) {
    console.log("\n=======RUNNING FILTER PARSE TESTS=======\n");
    const battlesList = Object.values(battles);
    for (const test of FilterTests) {
        await runParseTest(test, battlesList, heroDicts);
    }
}

export async function runTests() {
    const battles = await ContentManager.BattleManager.getBattles();
    if (!battles) {
        console.error("No battles found for stats tests");
        return;
    }
    const battlesList = Object.values(battles);
    const heroDicts = await ContentManager.HeroManager.getHeroDicts();
    await runFilterParseTests(battlesList, heroDicts);
    await runFilterBehaviorTests(battlesList, heroDicts);
    await runStatsTests(battlesList, heroDicts);
}

