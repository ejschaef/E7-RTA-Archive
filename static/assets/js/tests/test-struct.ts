import { HeroDicts } from "../e7/hero-manager";
import { BattleType } from "../e7/references";

export const NOT_IMPLEMENTED = "~NotImplemented~" as const;

export type Test = {
    name: string;
    filterStr: string;
    eval: (battles: BattleType[], filteredBattles: BattleType[], heroDicts: HeroDicts) 
        => readonly [number, number] | readonly [string, string] | boolean | typeof NOT_IMPLEMENTED;
};
