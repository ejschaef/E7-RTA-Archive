import { EQUIPMENT_SET_MAP } from "../references.js";

export const ACCEPTED_CHARS = new Set(
	`'"(),-.=; ><!1234567890{}` +
		`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`
);
export const PRINT_PREFIX = "   ";

export const EQUIPMENT_LOWERCASE_STRINGS_SET = new Set(
	Object.values(EQUIPMENT_SET_MAP).map((eq) => eq.toLowerCase())
);
