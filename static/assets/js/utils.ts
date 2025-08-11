import Fuse from "fuse.js";

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

export function arrToCountMap<T>(arr: T[]): Record<string, number> {
    let acc: Record<string, number> = {};
    return arr.reduce((acc, elt) => {
        const key = `${elt}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, acc);
}

export function getStrMatches(str: string, strings: string[], numMatches: number | null = null, customConfig: any = null) {
    const config = { 
        includeScore: true, 
        threshold: 0.3,
    }
    let fuse = null;
    if ( customConfig) {
        fuse = new Fuse(strings, {...config, ...customConfig});
    } else {
        fuse = new Fuse(strings, config);
    }
    const result = fuse.search(str);
    if (numMatches !== null) {
        return result.slice(0, numMatches);
    }
    return result;
}


export const Safe = {

    unwrapHtmlElt: function (eltID: string): HTMLElement {
        const elt = document.getElementById(eltID);
        if (elt === null) {
            throw new Error(`Could not find element with ID ${eltID}`);
        }
        return elt;
    },

    setText: function (eltID: string, text: string): void {
        const elt = this.unwrapHtmlElt(eltID);
        elt.textContent = text;
    },

}