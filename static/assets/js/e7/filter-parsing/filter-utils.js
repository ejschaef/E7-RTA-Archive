import { RegExps } from "../regex.js";

class SyntaxException extends Error {
	constructor(message) {
		super(message); // Pass message to base Error
		this.name = "Filter Syntax Exception"; // Set error name
	}
}

class TypeException extends Error {
	constructor(message) {
		super(message); // Pass message to base Error
		this.name = "Filter Type Exception"; // Set error name
	}
}

class ValidationError extends Error {
	constructor(message) {
		super(message); // Pass message to base Error
		this.name = "Filter Validation Error"; // Set error name
	}
}

//should only be called on strings of the form 'str(...)' or 'num(...)' etc. the string must end with the enclosure char, otherwise it will throw a SyntaxException.
function retrieveEnclosure(string, open_char = "(", close_char = ")") {
	if (open_char === close_char) {
		throw new Error(
			`Enclosure characters must be different: ${open_char} = ${close_char}`
		);
	}
	let started = false;
	let count = 0;
	let output = "";
	for (const [index, char] of [...string].entries()) {
		if (char === open_char) {
			count += 1;
			if (!started) {
				started = true;
				continue;
			}
		} else if (char === close_char) {
			count -= 1;
		}
		if (count === 0 && started) {
			if (index != string.length - 1) {
				throw new SyntaxException(
					`Enclosure should not be resolved before end of string; resolved at index: ${index}; input string: ${string}`
				);
			}
			return output;
		} else if (count < 0) {
			throw new SyntaxException(
				`Unbalanced enclosure at index: ${index} of input string: ${string}; balance of "${open_char}...${close_char}" enclosures became negative.`
			);
		} else if (started) {
			output += char;
		}
	}
	if (!started) {
		throw new SyntaxException(
			`Enclosure of type ${open_char}...${close_char} not found in string; input string: ${string}`
		);
	} else if (count > 0) {
		throw new SyntaxException(
			`Enclosure could not be resolved; too many '${close_char}'; balance = +{count}; input string {string}`
		);
	}
}

// retrieves comma separated arguments from a string; used for clause operators; input should be of the form 'fn(arg1, arg2,...)' where fn is a clause fn
function retrieveArgs(string) {
	let open_parenthese_count = 0;
	const args = [];
	let arg = "";
	for (const char of string) {
		if (char === "(") {
			open_parenthese_count += 1;
			if (open_parenthese_count === 1) {
				continue;
			}
		} else if (char === ")") {
			open_parenthese_count -= 1;
		}
		if (open_parenthese_count === 1 && char === ",") {
			args.push(arg.trim());
			arg = "";
		} else if (open_parenthese_count >= 1) {
			arg += char;
		}
	}
	if (arg.trim()) {
		args.push(arg.trim());
	}
	return args;
}

const ENCLOSURE_MAP = {
	"(": ")",
	"{": "}",
	'"': '"',
	"'": "'",
};

const ENCLOSURE_IGNORE = {
	// if we are in a string enclosure, don't look for other quotes
	"'": '"',
	'"': "'",
};

const REVERSE_ENCLOSURE_MAP = Object.fromEntries(
	Object.entries(ENCLOSURE_MAP)
		.filter(([k, v]) => k !== v)
		.map(([k, v]) => [v, k])
);

function tokenizeWithNestedEnclosures(
	input,
	splitChars = " ",
	enclosureLevel = 0,
	trim = true
) {
	const tokens = [];
	let current = "";
	let stack = [];

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
					const charCounts = getCharCounts(input);
					if ((charCounts["'"] || 0) % 2 !== 0 || (charCounts['"'] || 0) % 2 !== 0) {
						throw new SyntaxException(
							`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}' ; if a str type has quote characters in it, wrap it in the opposite quote character.`
						)
					} else {
						throw new SyntaxException(
							`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}'`
						)
					}
				}
			} else {
				if (stack.length >= enclosureLevel) {
					// we are beyond the level of enclosure we are ignoring so add to current string
					current += char;
				}
				if (
					ENCLOSURE_MAP[char] && 
            (
              !ENCLOSURE_IGNORE[char] ||
              (stack[stack.length - 1] !== ENCLOSURE_IGNORE[char])
            )
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

function getCharCounts(str) {
	const counts = {};
	for (const char of str) {
		counts[char] = (counts[char] || 0) + 1;
	}
	return counts;
}

function parseDate(dateStr) {
	if (!RegExps.VALID_DATE_LITERAL_RE.test(dateStr)) {
		throw new SyntaxException(
			`Invalid date; must be in the format: YYYY-MM-DD ( regex: ${RegExps.VALID_DATE_LITERAL_RE.source} ); got: '${dateStr}'`
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

function tryConvert(convertFnc, typeName, value, errMSG = null) {
	if (errMSG === null) {
		errMSG = `Could not convert ${value} to ${typeName}`;
	}
	try {
		return convertFnc(value);
	} catch (err) {
		throw new TypeException(`${errMSG}: ${err.message}`);
	}
}

function trimSurroundingQuotes(str) {
	return str.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

let Futils = {
	SyntaxException: SyntaxException,
	TypeException: TypeException,
	ValidationError: ValidationError,
	retrieveEnclosure: retrieveEnclosure,
	retrieveArgs: retrieveArgs,
	getCharCounts: getCharCounts,
	tokenizeWithNestedEnclosures: tokenizeWithNestedEnclosures,
	parseDate: parseDate,
	tryConvert: tryConvert,
	trimSurroundingQuotes: trimSurroundingQuotes,
};

export default Futils;
