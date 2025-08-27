import { FilterParser, Filters } from "../e7/filter-parsing/filter-parser";
import { BattleType } from "../e7/references";
import { GlobalFilter, StandardFilter } from "../e7/filter-parsing/functions";
import { FilterTestPacket, FilterTestDefinitions } from "./filter-test-definitions";
import { BATTLES, heroDicts } from "./test-required-objects";
import { LogCapture } from "./log-capture";

async function applyFilters(battleList: BattleType[], filters: Filters) {
    const localFilterList = filters.filter((f) => f instanceof StandardFilter);
    const globalFilterList = filters.filter((f) => f instanceof GlobalFilter);

    // apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
    for (let filter of globalFilterList) {
        console.log(`Applying global filter: ${filter.asString()}`);
        battleList = filter.call(battleList);
    }

    // apply local filters (filters that can be resolved on each battle without context of other battles)
    for (let filter of localFilterList) {
        console.log(`Applying local filter: ${filter.asString()}`);
        battleList = battleList.filter((b) => {
            // console.log(`Filtering battle: ${b["Seq Num"]}; ${filter.call(b) ? "included" : "excluded"}`);
            return filter.call(b);
        });
    }
    return battleList;
}

function genFilterBehaviorTest(filterTestPacket: FilterTestPacket): (suppressLogs?: boolean) => Promise<void> {
    return async (suppressLogs = false) => {
        const logCapturer = new LogCapture();
        if (suppressLogs) logCapturer.redirect();
        let passed = false;
        let filteredBattles: BattleType[] = [];
        try {
            const parser: FilterParser = await FilterParser.fromFilterStr(filterTestPacket.filterStr, heroDicts);
            const filters: Filters = parser.getFilters();
            filteredBattles = await applyFilters(BATTLES, filters);
            passed = filterTestPacket.validationFn(filteredBattles);
        } catch (e) {
            passed = false;
            console.error(`Test: "${filterTestPacket.name}" Behavior threw error: `, e);
        }
        logCapturer.restore();  
        if (!passed) {
            if (suppressLogs) console.log(logCapturer.logString);
            console.error(`Test: "${filterTestPacket.name}" Behavior Failed: `, BATTLES, filteredBattles);
        } else {
            console.log(`Test: "${filterTestPacket.name}" Behavior Passed`);
        }     
    }
}

function genParseTest(filterTestPacket: FilterTestPacket): ParseTest {
    return async (suppressLogs = false) => {
        const logCapturer = new LogCapture();
        if (suppressLogs) logCapturer.redirect();
        try {
            const parser: FilterParser = await FilterParser.fromFilterStr(filterTestPacket.filterStr, heroDicts);
            const filters: Filters = parser.getFilters();
            await applyFilters(BATTLES, filters);
            logCapturer.restore();
            console.log(`Test: "${filterTestPacket.name}" Parse Passed`);
        } catch (e) {
            if (suppressLogs) console.log(logCapturer.flushAndRestore());
            console.error(`Test: "${filterTestPacket.name}" Failed: `, e);
        }
        logCapturer.restore();
    }
}

type ParseTest = (suppressLogs?: boolean) => Promise<void>;

const PARSE_TESTS: ParseTest[] = Object.values(FilterTestDefinitions).map((filterTestPacket) => genParseTest(filterTestPacket));


const BEHAVIOR_TESTS = [
    genFilterBehaviorTest(FilterTestDefinitions.last100),
    genFilterBehaviorTest(FilterTestDefinitions.last10),
]

const SUPPRESS_LOGS = true;

export async function runFilterTests() {
    if (!BATTLES || BATTLES.length === 0) {
        console.error("No battles found for filter tests!");
        return;
    }
    console.log("\n===================RUNNING PARSE TESTS===================\n");
    for (const test of PARSE_TESTS) {
        await test(SUPPRESS_LOGS);
    }
    console.log("\n===================RUNNING BEHAVIOR TESTS===================\n");
    for (const test of BEHAVIOR_TESTS) {
        await test(SUPPRESS_LOGS);
    }
}