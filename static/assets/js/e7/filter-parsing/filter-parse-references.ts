import { EQUIPMENT_SET_MAP } from "../references.ts";


export const ACCEPTED_CHARS = new Set(
	`'"(),_-.=; ><!1234567890{}` +
	`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`
);
export const PRINT_PREFIX = "   ";

export const EQUIPMENT_LOWERCASE_STRINGS_MAP = Object.fromEntries(
	Object.values(EQUIPMENT_SET_MAP).map((v) => [v.toLowerCase(), v])
);

export type FilterReferences = {
    SEASON_DETAILS: any[];
    HM: any;
    ARTIFACT_LOWERCASE_STRINGS_MAP: { [x: string]: string };
}
