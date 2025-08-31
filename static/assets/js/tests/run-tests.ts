import { ContentManager } from "../content-manager";
import { runFilterTests } from "./filter-tests";
import { runStatsTests } from "./stats-tests";

export async function runTests() {
    const battles = await ContentManager.BattleManager.getBattles();
    if (!battles) {
        console.error("No battles found for stats tests");
        return;
    }
    const battlesList = Object.values(battles);
    if (battlesList.length !== 108) {
        console.error("Test Suite requires test file that expects 108 battles");
        return;
    }
    const heroDicts = await ContentManager.HeroManager.getHeroDicts();
    await runFilterTests(battlesList, heroDicts);
    await runStatsTests(battlesList, heroDicts);
}

