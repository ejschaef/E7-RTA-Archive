import HeroManager from "../hero-manager.js";
import Futils from "./filter-utils.ts";
import { RegExps } from "../regex.js";
import SeasonManager from "../season-manager.js";
import ArtifactManager from "../artifact-manager.js";
import ClientCache from "../../cache-manager.js";
import { ACCEPTED_CHARS, PRINT_PREFIX } from "./filter-parse-references.ts";
import { FieldType, INT_FIELDS, SET_FIELDS } from "./field-type.ts";
import { parseDataType, DataType, TYPES } from "./declared-data-types.ts";
import { FN_MAP, XOR, NOT, lastN, ClauseFn, GlobalFilterFn, ClauseFnClass, DirectFn, DirectFnClass, GlobalFilterFnClass } from "./functions.ts";
import { OPERATOR_MAP } from "./operators.ts";
import { FilterContainer, BaseFilterElement, FilterRefs } from "./filter-ts-types.ts";
import { BattleType } from "../references.ts";

function validateChars(str: string, charSet: Set<string>, objName: string): void {
	for (let char of str) {
		if (!charSet.has(char)) {
			throw new Futils.SyntaxException(
				`Invalid character within <${objName}> ; ' ${char} ' is not allowed; got string: '${str}'`
			);
		}
	}
}

function preParse(str: string): string {
	str = str.replace(/[\n\t\r]/g, " ").replace(/\s+/g, " "); // replace newlines with spaces and remove multiple spaces
	validateChars(str, ACCEPTED_CHARS, "Main Filter String");
	str = str.toLowerCase();
	return str;
}

class BaseFilter {
	str: string;
	fn: (b: BattleType) => boolean;
	constructor(str: string, fn: (b: BattleType) => boolean) {
		this.str = str;
		this.fn = fn;
	}
	call(battle: BattleType) {
		return this.fn(battle);
	}
	asString(prefix = "") {
		return `${prefix}${this.str}`;
	}
}

function tryParseFilterElement(leftOrRight: string, strValue: string, filterStr: string, REFS: FilterRefs): BaseFilterElement {
	let parsedValue = null;
	try {
		if (strValue in FieldType.FIELD_EXTRACT_FN_MAP) {
			parsedValue = new FieldType(strValue);
		} else {
			parsedValue = parseDataType(strValue, REFS);
		}
	} catch (e: any) {
		console.error(e);
		throw new Futils.SyntaxException(
			`Could not parse ${leftOrRight} side of filter; got: "${strValue}" from filter: [${filterStr}]; error: ${e.message}`
		);
	}
	return parsedValue;
}



function validateBaseFilter(left: BaseFilterElement, opStr: string, right: BaseFilterElement, str: string) {
	// validate filter
	if (opStr === "in" || opStr === "!in") {
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
			if (!left.str?.includes("date")) {
				throw new Futils.TypeException(
					`When using a Date Range, the left side of the operator must be a date field; ${left.str} is not a date field; error found in filter: '${str}'`
				);
			}
		} else if (right.data.type === "Int") {
			if (!INT_FIELDS.has(left.str ?? "")) {
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
}

class FilterSyntaxParser {
	static #INTERNAL_KEY = Symbol("internal");

	filters: FilterContainer;
	REFS: FilterRefs;
	rawString: string;
	preParsedString: string;

	constructor(key: Symbol) {
		if (key !== FilterSyntaxParser.#INTERNAL_KEY) {
			throw new Error(
				"Cannot instantiate FilterSyntaxParser directly; use createAndParse method instead."
			);
		}
		this.filters = FilterSyntaxParser.getEmptyFilters();
		this.REFS = {
			HM: null,
			ARTIFACT_LOWERCASE_STRINGS_MAP: {},
			SeasonDetails: [],
		}
		this.rawString = "";
		this.preParsedString = "";
	}

	static getEmptyFilters(): FilterContainer {
		return { localFilters: [], globalFilters: [] };
	}

	static async getFiltersFromCache(HM: any) {
		const filterStr = await ClientCache.getFilterStr();
		if (!filterStr) {
			return FilterSyntaxParser.getEmptyFilters();
		}
		const seasonDetails = await SeasonManager.getSeasonDetails();
		const parser = await FilterSyntaxParser.createAndParse(
			filterStr,
			HM,
			seasonDetails
		);
		return parser.filters;
	}

	async addReferences(HM = null, SeasonDetails = null) {
		HM = HM || (await HeroManager.getHeroManager());
		if (HM === null) throw new Error("Hero Manager could not be retrieved to parse filters.");
		SeasonDetails = SeasonDetails || (await SeasonManager.getSeasonDetails());
		if (SeasonDetails === null) throw new Error("Season Details could not be retrieved to parse filters.");
		const ARTIFACT_LOWERCASE_STRINGS_MAP =
			await ArtifactManager.getArtifactLowercaseNameMap();
		this.REFS = {
			HM: HM,
			ARTIFACT_LOWERCASE_STRINGS_MAP: ARTIFACT_LOWERCASE_STRINGS_MAP,
			SeasonDetails: SeasonDetails,
		};
	}

	static async createAndParse(string: string, HM = null, SeasonDetails = null) {
		console.log("Initialized parsing of string:", string);
		const parser = new FilterSyntaxParser(FilterSyntaxParser.#INTERNAL_KEY);
		parser.rawString = string;
		await parser.addReferences(HM, SeasonDetails);
		parser.preParsedString = preParse(string);
		parser.filters = parser.parseFilters(parser.preParsedString);
		console.log("Got Filters\n");
		console.log(parser.asString());
		return parser;
	}

	asString() {
		const filters = [
			...this.filters.globalFilters,
			...this.filters.localFilters,
		];
		return `[\n${filters
			.map((filter) => filter.asString(PRINT_PREFIX))
			.join(";\n")}\n]`;
	}

	parseGlobalFilterFn(globalFilterFnClass: GlobalFilterFnClass<GlobalFilterFn>, str: string) {
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
		return { localFilters: [], globalFilters: [new globalFilterFnClass(args)] };
	}


	parseClauseFn<T extends ClauseFn>(clauseFnClass: ClauseFnClass<T>, str: string) {
		console.log("Parsing clause fn:", str);
		const [delim, enclosureLevel] = [",", 1];
		const argArr = Futils.tokenizeWithNestedEnclosures(
			str,
			delim,
			enclosureLevel
		).filter((s) => s.length > 0); // account for trailing commas
		console.log("Got argArr:", argArr);
		if (clauseFnClass instanceof XOR && argArr.length < 2) {
			throw new Futils.SyntaxException(
				`XOR clause must have at least two arguments; got: ${argArr.length} arguments from string: "${str}"`
			);
		} else if (clauseFnClass instanceof NOT && argArr.length !== 1) {
			throw new Futils.SyntaxException(
				`NOT clause must have exactly one argument; got: ${argArr.length} arguments from string: "${str}"`
			);
		}
		const fns: FilterContainer = argArr.reduce((acc, arg) => {
			acc.localFilters.push(...this.parseFilters(arg).localFilters);
			acc.globalFilters.push(...this.parseFilters(arg).globalFilters);
			return acc;
		}, FilterSyntaxParser.getEmptyFilters());
		if (fns.globalFilters.length > 0) {
			throw new Futils.SyntaxException(
				`Global filters not allowed in clause functions; got: ${fns.globalFilters} from string: "${str}"`
			);
		}
		if (clauseFnClass instanceof NOT && fns.localFilters.length !== 1) {
			throw new Futils.SyntaxException(
				`NOT clause must have exactly one argument; got: ${fns.localFilters.length} arguments from string: "${str}"`
			);
		}
		return { localFilters: [new clauseFnClass(fns)], globalFilters: [] };
	}

	parseDirectFn<T extends DirectFn>(directFn: DirectFnClass<T>, str: string): FilterContainer {
		return {
			localFilters: [directFn.fromFilterStr(str, this.REFS)],
			globalFilters: [],
		};
	}

	parseBaseFilter(str: string): FilterContainer {
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
		let [left, opStr, right] = tokens;

		// Validate operator
		if (!OPERATOR_MAP[opStr]) {
			throw new Futils.SyntaxException(
				`Invalid operator in base filter; got: "${opStr}" as the operator in filter: [${str}]`
			);
		}
		const opFn = OPERATOR_MAP[opStr];

		// try to converty to field types and data types
		const leftParsed = tryParseFilterElement(
			"left",
			left,
			str,
			this.REFS,
		);
		const rightParsed = tryParseFilterElement(
			"right",
			right,
			str,
			this.REFS,
		);

		// validate filter
		validateBaseFilter(leftParsed, opStr, rightParsed, str);

		// make filter
		let filterFn = null;
		if (leftParsed instanceof DataType && rightParsed instanceof FieldType) {
			filterFn = (battle: BattleType) => {
				return opFn(leftParsed.data, rightParsed.extractData(battle));
			};
		} else if (leftParsed instanceof FieldType && rightParsed instanceof DataType) {
			filterFn = (battle: BattleType) => {
				return opFn(leftParsed.extractData(battle), rightParsed.data);
			};
		} else if (leftParsed instanceof FieldType && rightParsed instanceof FieldType) {
			filterFn = (battle: BattleType) => {
				return opFn(leftParsed.extractData(battle), rightParsed.extractData(battle));
			};
		} else {
			throw new Error("Unreachable code reached when parsing base filter");
		}
		const cleanFilterStr = `${leftParsed.asString()} ${opStr} ${rightParsed.asString()}`;
		const filter = new BaseFilter(cleanFilterStr, filterFn);
		console.log("Returning base local filter", [filter.asString()]);
		return { localFilters: [filter], globalFilters: [] };
	}

	parseFilters(str: string): FilterContainer {
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
		const fnStr = splitFilterString[0];
		console.log(`Trying to look for Fn ${fnStr} ; got string:`, filterString);
		
		if (FN_MAP.CLAUSE_FNS[fnStr]) {
			console.log("Found clause fn; dispatching to clause fn parser");
			return this.parseClauseFn(FN_MAP.CLAUSE_FNS[fnStr], filterString);
		} 
		
		else if (FN_MAP.GLOBAL_FNS[fnStr]) {
			console.log("Found global filter fn; dispatching to global filter fn parser");
			return this.parseGlobalFilterFn(FN_MAP.GLOBAL_FNS[fnStr], filterString);
		} 
		
		else if (FN_MAP.DIRECT_FNS[fnStr]) {
			return this.parseDirectFn(FN_MAP.DIRECT_FNS[fnStr], filterString);
		} 
		
		else {
			console.log("Did not find Fn; dispatching to base filter parser");
			return this.parseBaseFilter(filterString);
		} 
	}
}

export default FilterSyntaxParser;
