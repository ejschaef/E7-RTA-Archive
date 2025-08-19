
import { BattleType, CSVHeaders } from "./e7/references";

export function toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function strArrToCountMap(strArr: string[]): Record<string, number> {
    let acc: Record<string, number> = {};
    return strArr.reduce((acc, elt) => {
        acc[elt] = (acc[elt] || 0) + 1;
        return acc;
    }, acc);
}