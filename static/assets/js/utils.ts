import Fuse from "fuse.js";
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
    if (customConfig) {
        fuse = new Fuse(strings, { ...config, ...customConfig });
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


// TODO: move to battle transform after typescript migration
export function convertBattlesToCSV(arr: BattleType[]): string {
    const headers = CSVHeaders;
    const csvRows = [];

    // add headers
    csvRows.push(headers.map(h => `"${h}"`).join(","));

    // add rows
    for (const obj of arr) {
        const values = headers.map(h => {
            let v = obj[h] ?? "";
            if (Array.isArray(v)) v = JSON.stringify(v).replace(/"/g, '""');
            return `"${v}"`;
        });
        csvRows.push(values.join(","));
    }
    return csvRows.join("\n");
}

export function currentTimestamp() {
    return new Date().toISOString();
}

export function downloadCSV(csv: string, filename: string) {
    const BOM = "\uFEFF";
    const csvFile = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

export function openUrlInNewTab(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
}