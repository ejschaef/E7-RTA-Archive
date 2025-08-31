import { BattleType, COLUMNS_MAP, WORLD_CODE_ENUM, WORLD_CODE_TO_CLEAN_STR } from "../e7/references"
import StatsBuilder from "../e7/stats-builder"


export type StatsTest = {
    name: string,
    filterStr: string,
    eval: (battles: BattleType[], filteredBattles: BattleType[]) => readonly [number, number]
}

const genStats = StatsBuilder.computeGenericStats;

const compWins = (battles: BattleType[]) => 
    battles.reduce((acc, b) => acc + +b["Win"], 0);

const compWinrate = (battles: BattleType[]) => 
    compWins(battles) / battles.length;

const compPlusMinus = (battles: BattleType[]) =>
    2 * compWins(battles) - battles.length;

export const STATS_TESTS: StatsTest[] = [
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
        name: "Boss Arunka +/-",
        filterStr: `"Boss Arunka" in p1.picks;`,
        eval: (battles: BattleType[], filteredBattles: BattleType[]) => {
            const filterResult = compPlusMinus(filteredBattles);
            const bossArunkaBattles = battles.filter((b) => b[COLUMNS_MAP.P1_PICKS].includes("Boss Arunka"));
            const stats = genStats(bossArunkaBattles, bossArunkaBattles.length);
            const scriptResult = stats.plusMinus;
            return [filterResult, scriptResult];
        }
    }
]


