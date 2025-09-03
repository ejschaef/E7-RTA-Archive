import { FIELD_EXTRACT_FN_MAP } from "./filter-parsing/field-extract-map";

/**
 * Returns a new RegExp object that matches if the input pattern matches the beginning of a string
 * and is followed by either a comma, closing parenthesis, whitespace, or the end of the string.
 *
 * Used for syntax highlighting in CodeMirror
 *
 * @param {RegExp} pattern - Pattern to pad with the above requirements.
 * @param {string} [flags="i"] - Flags to use in the resulting RegExp object. Defaults to case-insensitive matching.
 * @returns {RegExp} A new RegExp object that matches if the input pattern matches the beginning of a string
 *                   and is followed by either a comma, closing parenthesis, whitespace, or the end of the string.
 */
function padRegex(pattern: RegExp, flags = "i") {
	return new RegExp(`^(?:${pattern.source})(?=[,)\\s;]|$)`, flags);
}

function anchorExp(pattern: RegExp, flags = "i") {
	return new RegExp(`^(?:${pattern.source})$`, flags);
}

/**
 * Combines multiple regex patterns into a single regex that matches any of the given patterns.
 *
 * @param {RegExp[]} patterns - An array of regular expression objects to combine.
 * @param {string} [flags="i"] - The flags for the resulting RegExp object. Defaults to case-insensitive matching.
 * @returns {RegExp} A new RegExp object that matches if any of the supplied patterns match.
 * @throws {Error} If no patterns are provided.
 */
function orRegex(patterns: RegExp[], flags = "i") {
	if (patterns.length < 1)
		throw new Error("orRegex must have at least one pattern");
	let regExStr = `(?:${patterns[0].source})`;
	for (let i = 1; i < patterns.length; i++) {
		regExStr += `|(?:${patterns[i].source})`;
	}
	return new RegExp(regExStr, flags);
}

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const FIELD_WORDS = Object.keys(FIELD_EXTRACT_FN_MAP);

const FIELD_WORD_RE = new RegExp(
	`^(?:${FIELD_WORDS.map(escapeRegex).join("|")})`,
	"i"
);

const CLAUSE_FUNCTIONS = ["and", "or", "xor", "not"];

const GLOBAL_FUNCTIONS = ["last-n"];

const DIRECT_FUNCTIONS = [
	"p1.equipment",
	"p2.equipment",
	"p1.artifact",
	"p2.artifact",
	"p1.cr",
	"p2.cr",
];

const CLAUSE_FUNCTIONS_RE = new RegExp(
	`(?:${CLAUSE_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`,
	"i"
);
const GLOBAL_FUNCTIONS_RE = new RegExp(
	`(?:${GLOBAL_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`,
	"i"
);
const DIRECT_FUNCTIONS_RE = new RegExp(
	`(?:${DIRECT_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`,
	"i"
);

const FUNCTIONS_RE = orRegex([
	CLAUSE_FUNCTIONS_RE,
	GLOBAL_FUNCTIONS_RE,
	DIRECT_FUNCTIONS_RE,
]);

const STRING_RE = /.*/i; // matches any string
const DATE_RE = /\d{4}-\d{2}-\d{2}/;
const EMPTY_SET_RE = /\{\s*\}/;
const INT_RE = /-?\d+/;
const SEASON_RE = /season-[1-9]+[0-9]*f?|current-season|last-season/i;
const SEASON_CODE_RE = /pvp_rta_ss[1-9]+[0-9]*f?/i;

const GLOBAL_FILTER_RE = /last-n\(\d+\)/i;

const DATE_LITERAL_RE = new RegExp(`^${DATE_RE.source}$`, "i");
const INT_LITERAL_RE = /^-?\d+$/;
const BOOL_LITERAL_RE = /^(true|false)$/i;

const DATA_WORD_RE = new RegExp(`(?:${SEASON_RE.source})`, "i");

//consts without RE are used for injecting into regex patterns
const STR = STRING_RE.source;
const INT = INT_RE.source;
const DATE = DATE_RE.source;
const FIELD_WORD = FIELD_WORD_RE.source;
const DATA_WORD = DATA_WORD_RE.source;

const QUOTED_STRING_RE = /"[^"]*"|'[^']*'/i;

const STRING_LITERAL_RE = anchorExp(QUOTED_STRING_RE);

const QUOTED_STR = QUOTED_STRING_RE.source;

const SET_ELEMENT_RE = new RegExp(`(?:${QUOTED_STR}|${STR}|${DATE})`, "i");

const DATAFIELD_RE = new RegExp(`(?:${FIELD_WORD}|${DATA_WORD})`, "i");

const SETELT = SET_ELEMENT_RE.source;

const SET_RE = new RegExp(
	`\\{\\s*(?:${SETELT}\\s*)(?:,\\s*${SETELT}\\s*)*,?\\s*\\}|${EMPTY_SET_RE.source}`,
	"i"
);

const RANGE_RE = new RegExp(
	`${INT}\\.\\.\\.=?${INT}|${DATE}\\.\\.\\.=?${DATE}`
);
const RANGE_LITERAL_RE = new RegExp(`^${RANGE_RE.source}$`);

const FUNCTION_CALL_RE = /\(.*\)/i;

// used by CodeMirror for syntax highlighting
function tokenMatchInner(stream: any) {
	if (stream.match(FUNCTIONS_RE)) {
		// console.log("Matched stream as clause:", stream);
		return "keyword";
	}
	if (stream.match(/\s+(?:!=|<|>|=|>=|<=|in|!in)(?=\s+)/i)) {
		// console.log("Matched stream as operator:", stream);
		return "operator";
	}
	if (
		stream.match(
			new RegExp(`[a-z0-9."'}=)-]${DATAFIELD_RE.source}(?=[,)\\s;]|$)`, "i")
		)
	) {
		// console.log("Matched stream as field with preceding fragment:", stream);
		return null;
	}

	if (stream.match(padRegex(FIELD_WORD_RE))) {
		// console.log("Matched stream as Data Field:", stream);
		return "field";
	}
	if (stream.match(padRegex(DATA_WORD_RE))) {
		// console.log("Matched stream as Data Field:", stream);
		return "declared-data";
	}
	if (stream.match(padRegex(QUOTED_STRING_RE))) {
		// console.log("Matched stream as string:", stream);
		return "string";
	}
	if (stream.match(padRegex(SET_RE))) {
		// console.log("Matched stream as set:", stream);
		return "set";
	}
	if (stream.match(padRegex(RANGE_RE))) {
		// console.log("Matched stream as range:", stream);
		return "range";
	}
	if (stream.match(/[^(,\s;.=0-9\-]+\d+/i)) {
		// console.log("Matched stream as non-num null", stream);
		return null;
	}
	if (stream.match(padRegex(INT_RE))) {
		// console.log("Matched stream as number:", stream);
		return "declared-data";
	}
	if (stream.match(padRegex(DATE_RE))) {
		// console.log("Matched stream as date:", stream);
		return "declared-data";
	}
	if (stream.match(/(?:^|\s)(?:true|false)(?=[,)\s;]|$)/i)) {
		// console.log("Matched stream as bool:", stream);
		return "declared-data";
	}
	if (stream.match(/[\(\)\{\}\;\,]/)) {
		// console.log("Matched stream as bracket:", stream);
		return "bracket";
	}
	stream.next();
	// console.log("Matched stream as null:", stream);
	return null;
}
function tokenMatch(stream: any) {  // CodeMirror.StringStream
	const result = tokenMatchInner(stream);
	return result;
}

let RegExps = {
	STRING_RE: STRING_RE,
	DATE_RE: DATE_RE,
	INT_RE: INT_RE,
	EMPTY_SET_RE: EMPTY_SET_RE,
	SET_ELEMENT_RE: SET_ELEMENT_RE,
	SET_RE: SET_RE,
	SET_LITERAL_RE: anchorExp(SET_RE),

	STRING_LITERAL_RE: STRING_LITERAL_RE,
	DATE_LITERAL_RE: DATE_LITERAL_RE,
	INT_LITERAL_RE: INT_LITERAL_RE,
	BOOL_LITERAL_RE: BOOL_LITERAL_RE,

	RANGE_RE: RANGE_RE,
	RANGE_LITERAL_RE: RANGE_LITERAL_RE,

	SEASON_RE: SEASON_RE,
	SEASON_LITERAL_RE: anchorExp(SEASON_RE),

	SEASON_CODE_RE: SEASON_CODE_RE,
	SEASON_CODE_LITERAL_RE: anchorExp(SEASON_CODE_RE),

	DATA_WORD_RE: DATA_WORD_RE,
	DATA_WORD_LITERAL_RE: anchorExp(DATA_WORD_RE),

	FIELD_WORD_RE: FIELD_WORD_RE,
	FIELD_WORD_LITERAL_RE: anchorExp(FIELD_WORD_RE),

	DATAFIELD_RE: DATAFIELD_RE,

	GLOBAL_FILTER_RE: GLOBAL_FILTER_RE,

	ANCHORED_STR_LITERAL_RE: anchorExp(STRING_LITERAL_RE),

	CLAUSE_FUNCTIONS_RE: CLAUSE_FUNCTIONS_RE,
	DIRECT_FUNCTIONS_RE: DIRECT_FUNCTIONS_RE,
	GLOBAL_FUNCTIONS_RE: GLOBAL_FUNCTIONS_RE,
	FUNCTIONS_RE: FUNCTIONS_RE,

	FUNCTION_CALL_RE: FUNCTION_CALL_RE,

	padRegex: padRegex,
	anchorExp: anchorExp,
	tokenMatch: tokenMatch,
	orRegex: orRegex,
	escapeRegex: escapeRegex,
};

export { RegExps };
