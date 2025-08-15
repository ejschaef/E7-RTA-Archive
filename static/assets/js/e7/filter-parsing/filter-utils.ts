import { RegExps } from "../regex.ts";
import { BattleType } from "../references.ts";

class SyntaxException extends Error {
	constructor(message: string) {
		super(message); // Pass message to base Error
		this.name = "Filter Syntax Exception"; // Set error name
	}
}

class TypeException extends Error {
	constructor(message: string) {
		super(message); // Pass message to base Error
		this.name = "Filter Type Exception"; // Set error name
	}
}

class ValidationError extends Error {
	constructor(message: string) {
		super(message); // Pass message to base Error
		this.name = "Filter Validation Error"; // Set error name
	}
}

const ENCLOSURE_MAP: Record<string, string> = {
	"(": ")",
	"{": "}",
	'"': '"',
	"'": "'",
};

const ENCLOSURE_IGNORE: Record<string, string> = {
	// if we are in a string enclosure, don't look for other quotes
	"'": '"',
	'"': "'",
};

const REVERSE_ENCLOSURE_MAP: Record<string, string> = Object.fromEntries(
	Object.entries(ENCLOSURE_MAP)
		.filter(([k, v]) => k !== v)
		.map(([k, v]) => [v, k])
);

/**
 * Tokenize a string into an array of strings, ignoring any enclosures up to a given level.
 * @param {string} input - The string to tokenize.
 * @param {string} [splitChars=" "] - The characters to split on.
 * @param {number} [enclosureLevel=0] - The level of enclosure to ignore.
 * @param {boolean} [trim=true] - Whether to trim the tokens.
 * @returns {string[]} An array of strings, each representing a token in the input string.
 * @throws {SyntaxException} If there is an unbalanced closing character in the input string.
 * @throws {Error} If there are any unresolved characters from the enclosure stack after tokenizing.
 */
function tokenizeWithNestedEnclosures(
	input: string,
	splitChars = " ",
	enclosureLevel = 0,
	trim = true
): string[] {
	const tokens: string[] = [];
	let current = "";
	let stack: string[] = [];

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		//console.log(`Processing char ${char} at position ${i}; current string: ${current}; tokens: ${tokens}`);

		if (splitChars.includes(char) && stack.length === enclosureLevel) {
			if (current) {
				tokens.push(trim ? current.trim() : current);
				current = "";
			}
		} else {
			if (REVERSE_ENCLOSURE_MAP[char]) {
				// found a closing brace or parenthesis
				const expected = REVERSE_ENCLOSURE_MAP[char];
				if (stack.length > enclosureLevel) {
					current += char;
				}
				if (stack[stack.length - 1] === expected) {
					stack.pop();
				} else {
					const charCounts: Record<string, number> = getCharCounts(input);
					if (
						(charCounts["'"] || 0) % 2 !== 0 ||
						(charCounts['"'] || 0) % 2 !== 0
					) {
						throw new SyntaxException(
							`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}' ; if a str type has quote characters in it, wrap it in the opposite quote character.`
						);
					} else {
						throw new SyntaxException(
							`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}'`
						);
					}
				}
			} else {
				if (stack.length >= enclosureLevel) {
					// we are beyond the level of enclosure we are ignoring so add to current string
					current += char;
				}
				if (
					ENCLOSURE_MAP[char] &&
					(!ENCLOSURE_IGNORE[char] ||
						stack[stack.length - 1] !== ENCLOSURE_IGNORE[char])
				) {
					if (
						stack[stack.length - 1] === ENCLOSURE_MAP[char] && // matching quote to end the enclosure
						char === ENCLOSURE_MAP[char]
					) {
						stack.pop();
					} else {
						stack.push(char); // add new enclosure level
					}
				}
			}
		}
	}

	if (stack.length > 0) {
		throw new Error(
			`Unbalanced enclosures in input string; unresolved characters from enclosure stack: [ ${stack.join(
				", "
			)} ]`
		);
	}

	if (current) {
		tokens.push(trim ? current.trim() : current);
	}

	return tokens;
}

function getCharCounts(str: string): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const char of str) {
		counts[char] = (counts[char] || 0) + 1;
	}
	return counts;
}

function parseDate(dateStr: string): Date {
	if (!RegExps.DATE_LITERAL_RE.test(dateStr)) {
		throw new SyntaxException(
			`Invalid date; must be in the format: YYYY-MM-DD ( regex: ${RegExps.DATE_LITERAL_RE.source} ); got: '${dateStr}'`
		);
	}

	const isoDateStr = dateStr.split(" ")[0];
	const date = new Date(`${isoDateStr}T00:00:00`);

	// Check if valid date
	if (isNaN(date.getTime())) {
		throw new SyntaxException(
			`Invalid date; could not be parsed as a valid date; got: '${dateStr}'`
		);
	}

	// Check if parsed date matches passed in string
	const dateString = date.toISOString().split("T")[0];
	const [year, month, day] = dateString.split("-").map(Number);
	if (
		date.getFullYear() !== year ||
		date.getMonth() + 1 !== month ||
		date.getDate() !== day
	) {
		throw new SyntaxException(
			`Invalid date; parsed date: ${date.toISOString()} does not match passed in string: ${isoDateStr}`
		);
	}

	console.log(`Parsed date: ${date.toISOString()} ; ${date.constructor.name}`);
	return date;
}

function tryConvert<U, T>(convertFnc: (u: U) => T, typeName: string, value: U, errMSG: string | null = null): T {
	if (errMSG === null) {
		errMSG = `Could not convert ${value} to ${typeName}`;
	}
	try {
		return convertFnc(value);
	} catch (err: any) {
		throw new TypeException(`${errMSG}: ${err.message}`);
	}
}

function trimSurroundingQuotes(str: string): string {
	return str.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

let Futils = {
	SyntaxException: SyntaxException,
	TypeException: TypeException,
	ValidationError: ValidationError,
	getCharCounts: getCharCounts,
	tokenizeWithNestedEnclosures: tokenizeWithNestedEnclosures,
	parseDate: parseDate,
	tryConvert: tryConvert,
	trimSurroundingQuotes: trimSurroundingQuotes,
};

export default Futils;
