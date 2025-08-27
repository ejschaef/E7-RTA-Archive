/* 
This script is used to export the current data selected by user (without filters applied) as a JSON file.
Additional data like the user is also exported.

It also has functions to parse uploaded JSON files back into the original format.
*/

import { ContentManager } from "./content-manager";
import { BattleType, COLUMNS_MAP, RawUploadBattle, WORLD_CODE_LOWERCASE_TO_CLEAN_STR, WORLD_CODE_TO_CLEAN_STR } from "./e7/references";
import { User } from "./e7/user-manager";
import { ExportColumns } from "./e7/references";
import { validateUserFormat } from "./e7/user-manager";

type ExportData = {
    user: User,
    filterStr?: string
    battles: ExportedBattles,
}

type ExportedBattles = {
    headers: typeof ExportColumns,
    rows: Array<Array<string>>
}

function convertBattlesToExportFormat(battles: BattleType[]): ExportedBattles {
    const headers = ExportColumns;
    const rows = battles.map(battle => ExportColumns.map(key => JSON.stringify(battle[key])));
    return { headers, rows };
}

function constructJSON(user: User, battlesList: BattleType[], filterStr?: string): ExportData {
    const exportData: ExportData = {
        user,
        filterStr,
        battles: {headers: [], rows: []},
    }
    exportData.battles = convertBattlesToExportFormat(Object.values(battlesList));
    return exportData;
}

function validateUploadedBattles(data: unknown): data is ExportedBattles {
    if (!data || typeof data !== "object") {
        return false;
    }

    if (!("headers" in data) || !Array.isArray(data.headers)) {
        throw new Error("Invalid upload: missing headers field");
    }

    if (data.headers.length !== ExportColumns.length) {
        throw new Error(`Invalid upload: expected ${ExportColumns.length} headers, got ${data.headers.length}`);
    }

    for (let i = 0; i < ExportColumns.length; i++) {
        if (ExportColumns[i] !== data.headers[i]) {
            throw new Error(`Invalid upload: headers do not match at index ${i}; expected ${ExportColumns[i]}, got ${data.headers[i]}`);
        }
    }

    if (!("rows" in data) || !Array.isArray(data.rows)) {
        throw new Error("Invalid upload: missing rows field or rows is not an array");
    }

    if (data.rows.length === 0) {
        throw new Error("Invalid upload: uploaded data has no battles");
    }

    for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        if (row.length !== ExportColumns.length) {
            throw new Error(`Invalid upload: expected ${ExportColumns.length} columns per row, got ${row.length} at index ${i}`);
        }
    }

    return true;
}


function downloadExportJSON(filename: string, data: ExportData) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}


async function triggerDownload() {
    const user = await ContentManager.UserManager.getUser();
    if (!user) {
        throw new Error("User not found; cannot export data without an active user");
    }
    const stats = await ContentManager.ClientCache.getStats();
    const filterStr = await ContentManager.ClientCache.getFilterStr() || undefined;
    const filtersAppliedStr = stats.areFiltersApplied ? " Filtered" : "";

    let battlesList = stats.areFiltersApplied ? Object.values(stats.filteredBattlesObj) : stats.battles;
    battlesList = battlesList || [];

    const data = await constructJSON(user, battlesList, filterStr);

    const timestamp = new Date().toISOString().split("T")[0] || "";
	const fileName = `${user.name} (${user.id})${filtersAppliedStr} ${timestamp}`;
    downloadExportJSON(fileName, data);
}


function validateUploadedFile(file: File, extension: string = ".json", maxMB: number = 60) {
    if (!file.name.endsWith(".json")) {
        throw new Error("File must be .json");
    }
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
        throw new Error(
            `File must be smaller than ${maxMB}mb, got ${
                file.size / (1024 * 1024)
            }mb File.`
        );
    }
}

function validateFileContent(data: unknown): data is ExportData {
    if (!data || typeof data !== "object") {
        throw new Error("Invalid upload: data is null, undefined, or not an object");
    }
    if (!("user" in data)) {
        throw new Error("Invalid upload: missing 'user' field");
    }
    validateUserFormat(data.user)
    if (!("battles" in data)) {
        throw new Error("Invalid upload: missing 'battles' field");
    }
    validateUploadedBattles(data.battles);
    return true;
}


async function parseJSON(file: File): Promise<ExportData> {
    const jsonStr = await file.text();
    validateUploadedFile(file);
    const data = JSON.parse(jsonStr) as ExportData;
    console.log("Parsed JSON:", data);
    validateFileContent(data);
    return data;
}


function validateRawBattles(rawBattles: RawUploadBattle[]) {
    const p1IdSet = new Set(rawBattles.map(battle => battle[COLUMNS_MAP.P1_ID]));
    const p1ServerSet = new Set(rawBattles.map(battle => battle[COLUMNS_MAP.P1_SERVER]));
    if (p1IdSet.size !== 1) {
        throw new Error(`Invalid upload: Multiple P1 IDs found in upload: {${Array.from(p1IdSet).join(", ")}}`);
    }

    if (p1ServerSet.size !== 1) {
        throw new Error(`Invalid upload: Multiple P1 Servers found in upload: {${Array.from(p1ServerSet).join(", ")}}`);
    }

    const server = p1ServerSet.values().next().value?.replace(/"|'/g, "");
    if (!server || !Object.values(WORLD_CODE_TO_CLEAN_STR).includes(server)) {
        throw new Error(`Invalid upload: Invalid P1 Server found in upload: '${server}'`);
    }
    return true;
}

function restructureParsedUploadBattles(battles: ExportedBattles): RawUploadBattle[] {
    const rawBattlesList = [];
    for (const battle of battles.rows) {
        const battleObj: any = {};
        ExportColumns.forEach((header, i) => {
            battleObj[header] = battle[i];
        })
        rawBattlesList.push(battleObj as RawUploadBattle);
    }
    validateRawBattles(rawBattlesList);
    return rawBattlesList;
}

export const ExportImportFns = {
    triggerDownload,
    parseJSON,
    restructureParsedUploadBattles
}

