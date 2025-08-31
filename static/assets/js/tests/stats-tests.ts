import { ContentManager } from "../content-manager";
import { FilterParser, Filters } from "../e7/filter-parsing/filter-parser";
import { StatsTest, STATS_TESTS } from "./stats-test-definitions";
import { CONSOLE_LOGGER, LOG_CATEGORIES } from "../console-logging";
import type { HeroDicts } from "../e7/hero-manager";
import type { BattleType } from "../e7/references";

async function genStatsTest(test: StatsTest, battles: BattleType[], heroDicts: HeroDicts) {
    CONSOLE_LOGGER.bindCategory(LOG_CATEGORIES.TEST);
    try {
        const parser: FilterParser = await FilterParser.fromFilterStr(test.filterStr, heroDicts);
        const filters: Filters = parser.getFilters();
        const filteredBattles: BattleType[] = await ContentManager.BattleManager.applyFilters(battles, filters);
        const [filterResult, scriptResult] = test.eval(battles, filteredBattles);
        if (!(filterResult === scriptResult)) {
            console.error(`Test: "${test.name}" Failed; Filter Result: ${filterResult}; Script Result: ${scriptResult}; `, battles, filteredBattles);
            return;
        }
    } catch (e) {
        console.error(`Test: "${test.name}" Failed: `, e);
        return;
    }
    CONSOLE_LOGGER.unbindCategory();
    console.log(`Test: "${test.name}" Passed`);
}


export async function runStatsTests(battles: BattleType[], heroDicts: HeroDicts) {
    console.log("\n===================RUNNING STATS TESTS===================\n");
    const battlesList = Object.values(battles);
    for (const test of STATS_TESTS) {
        await genStatsTest(test, battlesList, heroDicts);
    }
}