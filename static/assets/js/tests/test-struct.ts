import { BattleType } from "../e7/references";

export const NOT_IMPLEMENTED = "~NotImplemented~" as const;

export type Test = {
    name: string;
    filterStr: string;
    eval: (battles: BattleType[], filteredBattles: BattleType[]) => readonly [number, number] | boolean | typeof NOT_IMPLEMENTED;
};
