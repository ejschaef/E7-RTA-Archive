import HeroManager from "../hero-manager.js";
import Futils from "./filter-utils.js";
import { RegExps } from "../regex.js";
import SeasonManager from "../season-manager.js";
import ArtifactManager from "../artifact-manager.js";
import { ACCEPTED_CHARS, PRINT_PREFIX } from "./filter-parse-references.js";
import { FieldType, INT_FIELDS, SET_FIELDS } from "./field-type.js";
import { parseDataType, DataType, TYPES } from "./declared-data-types.js";
import { FN_MAP, XOR, NOT, lastN } from "./functions.js";
import { OPERATOR_MAP } from "./operators.js";

function validateChars(str, charSet, objName) {
	for (let char of str) {
		if (!charSet.has(char)) {
			throw new Futils.SyntaxException(
				`Invalid character within <${objName}> ; ' ${char} ' is not allowed; got string: '${str}'`
			);
		}
	}
}

function preParse(str) {
	str = str.replace(/[\n\t\r]/g, " ").replace(/\s+/g, " "); // replace newlines with spaces and remove multiple spaces
	validateChars(str, ACCEPTED_CHARS, "Main Filter String");
	str = str.toLowerCase();
	return str;
}

class BaseFilter {
	constructor(str, fn) {
		this.str = str;
		this.fn = fn;
	}
	call(battle) {
		return this.fn(battle);
	}
	asString(prefix = "") {
		return `${prefix}${this.str}`;
	}
}

function tryParseFilterElement(leftOrRight, strValue, filterStr, REFS) {
	let parsedValue = null;
	try {
		if (strValue in FieldType.FIELD_EXTRACT_FN_MAP) {
			parsedValue = new FieldType(strValue);
		} else {
			parsedValue = parseDataType(strValue, REFS);
		}
	} catch (e) {
		console.error(e);
		throw new Futils.SyntaxException(
			`Could not parse ${leftOrRight} side of filter; got: "${strValue}" from filter: [${filterStr}]; error: ${e.message}`
		);
	}
	return parsedValue;
}

class FilterSyntaxParser {
	static #INTERNAL_KEY = Symbol("internal");

	constructor(key) {
		if (key !== FilterSyntaxParser.#INTERNAL_KEY) {
			throw new Error(
				"Cannot instantiate FilterSyntaxParser directly; use createAndParse method instead."
			);
		}
	}

	static getEmptyFilters() {
		return { localFilters: [], globalFilters: [] };
	}

	static async createAndParse(string, HM = null, SeasonDetails = null) {
		console.log("Initialized parsing of string:", string);
		const parser = new FilterSyntaxParser(FilterSyntaxParser.#INTERNAL_KEY);
		HM = HM || (await HeroManager.getHeroManager());
		SeasonDetails = SeasonDetails || (await SeasonManager.getSeasonDetails());
		parser.rawString = string;
		parser.HM = HM;
		parser.ARTIFACT_LOWERCASE_STRINGS_MAP =
			await ArtifactManager.getArtifactLowercaseNameMap();
		console.log("Got Artifact Lowercase Strings map", parser.ARTIFACT_LOWERCASE_STRINGS_MAP);
		console.log(parser.ARTIFACT_LOWERCASE_STRINGS_MAP);
		parser.SeasonDetails = SeasonDetails;
		parser.REFS = {
			HM: parser.HM,
			ARTIFACT_LOWERCASE_STRINGS_MAP: parser.ARTIFACT_LOWERCASE_STRINGS_MAP,
			SeasonDetails: parser.SeasonDetails,
		};
		parser.preParsedString = preParse(string);
		parser.globalFilters = [];
		parser.filters = parser.parseFilters(parser.preParsedString);
		console.log("Got Filters\n");
		console.log(parser.asString());
		return parser;
	}

	asString() {
		const filters = [...this.filters.localFilters];
		filters.push(...this.filters.globalFilters);
		return `[\n${filters
			.map((filter) => filter.asString(PRINT_PREFIX))
			.join(";\n")}\n]`;
	}

	parseGlobalFilterFn(globalFilterFn, str) {
		const pattern = RegExps.anchorExp(RegExps.VALID_GLOBAL_FILTER_RE);
		if (!pattern.test(str)) {
			throw new Futils.SyntaxException(
				`Invalid global filter format; must follow the case insensitive regex format "${pattern.source}" ; got: '${str}'`
			);
		}
		const [delim, enclosureLevel] = [",", 1];
		const args = Futils.tokenizeWithNestedEnclosures(
			str,
			delim,
			enclosureLevel
		);
		if (globalFilterFn === lastN) {
			return { localFilters: [], globalFilters: [new lastN(args)] };
		} else {
			throw new Futils.SyntaxException(
				`Global filter function ${globalFilterFn.str} not mapped in parseGlobalFilterFn`
			);
		}
	}

	parseClauseFn(clauseFn, str) {
		console.log("Parsing clause fn:", clauseFn.str, str);
		const [delim, enclosureLevel] = [",", 1];
		const argArr = Futils.tokenizeWithNestedEnclosures(
			str,
			delim,
			enclosureLevel
		).filter((s) => s.length > 0); // account for trailing commas
		console.log("Got argArr:", argArr);
		if (clauseFn === XOR && argArr.length < 2) {
			throw new Futils.SyntaxException(
				`XOR clause must have at least two arguments; got: ${argArr.length} arguments from string: "${str}"`
			);
		} else if (clauseFn === NOT && argArr.length !== 1) {
			throw new Futils.SyntaxException(
				`NOT clause must have exactly one argument; got: ${argArr.length} arguments from string: "${str}"`
			);
		}
		const fns = argArr.reduce((acc, arg) => {
			acc.localFilters.push(...this.parseFilters(arg).localFilters);
			acc.globalFilters.push(...this.parseFilters(arg).globalFilters);
			return acc;
		}, FilterSyntaxParser.getEmptyFilters());
		if (fns.globalFilters.length > 0) {
			throw new Futils.SyntaxException(
				`Global filters not allowed in clause functions; got: ${fns.globalFilters} from string: "${str}"`
			);
		}
		if (clauseFn === NOT && fns.localFilters.length !== 1) {
			throw new Futils.SyntaxException(
				`NOT clause must have exactly one argument; got: ${fns.length} arguments from string: "${str}"`
			);
		}
		return { localFilters: [new clauseFn(fns)], globalFilters: [] };
	}

	parseDirectFn(directFn, str) {
		return {
			localFilters: [directFn.fromFilterStr(str, this.REFS)],
			globalFilters: [],
		};
	}

	parseBaseFilter(str) {
		console.log("Parsing base filter:", str);
		const [delim, enclosureLevel, trim] = [" ", 0, true];
		const tokens = Futils.tokenizeWithNestedEnclosures(
			str,
			delim,
			enclosureLevel,
			trim
		);

		console.log("Got tokens: ", tokens, `; Length: ${tokens.length}`);

		// must be of form ['X', operator, 'Y']
		if (!(tokens.length === 3)) {
			throw new Futils.SyntaxException(
				`Invalid base filter format; all filters must be of the form: ['X', operator, 'Y']; got tokens: [${tokens.join(
					", "
				)}]`
			);
		}
		let [left, operator, right] = tokens;

		// Validate operator
		if (!OPERATOR_MAP[operator]) {
			throw new Futils.SyntaxException(
				`Invalid operator in base filter; got: "${operator}" as the operator in filter: [${str}]`
			);
		}
		const opFn = OPERATOR_MAP[operator];

		// try to converty to field types and data types
		left = tryParseFilterElement(
			"left",
			left,
			str,
			this.REFS,
			this.SeasonDetails
		);
		right = tryParseFilterElement(
			"right",
			right,
			str,
			this.REFS,
			this.SeasonDetails
		);

		// validate filter
		if (operator === "in" || operator === "!in") {
			if (!(right instanceof TYPES.Set || right instanceof TYPES.Range)) {
				if (!(right instanceof FieldType) || !SET_FIELDS.has(right.str)) {
					throw new Futils.TypeException(
						`When using any 'in' or '!in' operator, the right side of the operator must be a Set, Range, or a Field composed of a set (i.e. p1.picks, p2.prebans, etc.); error found in filter: '${str}'`
					);
				}
			}
		}

		if (right instanceof TYPES.Range) {
			if (right.data.type === "Date") {
				if (!left.str.includes("date")) {
					throw new Futils.TypeException(
						`When using a Date Range, the left side of the operator must be a date field; ${left.str} is not a date field; error found in filter: '${str}'`
					);
				}
			} else if (right.data.type === "Int") {
				if (!INT_FIELDS.has(left.str)) {
					throw new Futils.TypeException(
						`When using an Int Range, the left side of the operator must be an integer field; ${left.str} is not an integer field; error found in filter: '${str}'`
					);
				}
			}
		}

		if (right instanceof DataType && left instanceof DataType) {
			throw new Futils.SyntaxException(
				`Either left or right side of filter must be a data field (a property of a battle); both ${left} and ${right} are user declared data types in filter: "${str}"`
			);
		}

		// make filter
		let filterFn = null;
		if (left instanceof DataType) {
			filterFn = (battle) => {
				return opFn(left.data, right.extractData(battle));
			};
		} else if (right instanceof DataType) {
			filterFn = (battle) => {
				return opFn(left.extractData(battle), right.data);
			};
		} else {
			filterFn = (battle) => {
				return opFn(left.extractData(battle), right.extractData(battle));
			};
		}
		const cleanFilterStr = `${left.asString()} ${operator} ${right.asString()}`;
		const filter = new BaseFilter(cleanFilterStr, filterFn);
		console.log("Returning base local filter", [
			filter.asString(),
		]);
		return { localFilters: [filter], globalFilters: [] };
	}

	parseFilters(str) {
		console.log(`Parsing filter string: "${str || this.preParsedString}"`);

		if (str === "") {
			console.log("Empty filter string; Returning empty filters");
			return FilterSyntaxParser.getEmptyFilters();
		}
		str = str.trim();
		let split = str.split(";").filter((s) => s.length > 0);

		for (let splitStr of split) {
			let charCounts = Futils.getCharCounts(splitStr);
			if (charCounts["("] !== charCounts[")"]) {
				throw new Futils.SyntaxException(
					`Imbalanced parentheses in following string: "${splitStr}"`
				);
			} else if (charCounts["{"] !== charCounts["}"]) {
				throw new Futils.SyntaxException(
					`Imbalanced braces ('{', '}') in following string: "${splitStr}"`
				);
			}
		}

		if (split.length > 1) {
			console.log(`Processing <${split.length}> filters; filters: ${split}`);
			return split.reduce((acc, arg) => {
				acc.localFilters.push(...this.parseFilters(arg).localFilters);
				acc.globalFilters.push(...this.parseFilters(arg).globalFilters);
				return acc;
			}, FilterSyntaxParser.getEmptyFilters());
		}
		const filterString = split[0].trim();
		if (filterString.length < 4) {
			throw new Futils.SyntaxException(
				`Filter string cannot be valid (less than 4 characters); got filter string: [${filterString}]`
			);
		}
		const splitFilterString = filterString.split("(");
		const fn = FN_MAP[splitFilterString[0]];
		console.log("Trying to look for Fn ; got string:", filterString);
		if (!fn) {
			console.log("Did not find Fn; dispatching to base filter parser");
			return this.parseBaseFilter(filterString);
		} else if (RegExps.VALID_CLAUSE_FUNCTIONS_RE.test(filterString)) {
			console.log("Found clause fn; dispatching to clause fn parser");
			return this.parseClauseFn(fn, filterString);
		} else if (RegExps.VALID_GLOBAL_FUNCTIONS_RE.test(filterString)) {
			console.log(
				"Found global filter fn; dispatching to global filter fn parser"
			);
			return this.parseGlobalFilterFn(fn, filterString);
		} else if (RegExps.VALID_DIRECT_FUNCTIONS_RE.test(filterString)) {
			return this.parseDirectFn(fn, filterString);
		} else {
			throw new Error(
				`could not parse filter string as Fn: "${str}" ; did not map to any known function ; check filter-syntax page`
			);
		}
	}
}

export default FilterSyntaxParser;
