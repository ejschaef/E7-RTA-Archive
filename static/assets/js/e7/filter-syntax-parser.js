import { LEAGUE_MAP, WORLD_CODE_TO_CLEAN_STR } from './references.js';
import HeroManager from './hero-manager.js';
import Futils from './filter-utils.js';
import { RegExps } from './regex.js';
import SeasonManager from './season-manager.js';

const ACCEPTED_CHARS = new Set(`'"(),-.=; ><!1234567890{}` + `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`);
const PRINT_PREFIX = "   ";

// must handle both regular sets and ranges
function inOperatorFn(a, b) {
    const bStr = typeof b === "object" ? JSON.stringify(b) : `${b}`;
    if (b instanceof Set ) {
        return b.has(a);
    } 
    // handle ranges
    else if (typeof b === "object" && b !== null && !Array.isArray(b) && ['start', 'end', 'endInclusive', 'type'].every(key => b.hasOwnProperty(key))) {
        return a >= b.start && (b.endInclusive ? a <= b.end : a < b.end);
    } 
    
    // handles fields that are arrays (ie p1.picks)
    else if (Array.isArray(b)) {
        return b.includes(a);
    }

    else {
        throw new Error(`Invalid match pattern for 'in' operators; got: '${a}' and '${bStr}' (${b.constructor.name})`);
    }
}

const OPERATOR_MAP = {
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
    '=': (a, b) => a === b,
    'in': (a, b) => inOperatorFn(a, b),
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
    '!=': (a, b) => a !== b,
    '!in': (a, b) => !inOperatorFn(a, b),
};

function validateChars(str, charSet, objName) {
    for (let char of str) {
        if (!charSet.has(char)) {
            throw new Futils.SyntaxException(`Invalid character within <${objName}> ; ' ${char} ' is not allowed; got string: '${str}'`);
        }
    }
}

function preParse(str) {
    str = str.replace(/[\n\t\r]/g, " ").replace(/\s+/g, " "); // replace newlines with spaces and remove multiple spaces
    validateChars(str, ACCEPTED_CHARS, "Main Filter String");
    str = str.toLowerCase();
    return str;
}

const INT_FIELDS = new Set(["victory-points"]);

// Fields that will extract arrays and can be used with the 'in' operators
const SET_FIELDS = new Set(["prebans", "p1.picks", "p2.picks", "p1.prebans", "p2.prebans"]);

class FieldType {

    // FNS that take in a clean format battle and return the appropriate data
    static FIELD_EXTRACT_FN_MAP = {
        'date'    : battle => battle["Date/Time"] ? new Date(`${battle["Date/Time"]?.slice(0, 10)}T00:00:00`) : "N/A",
        'is-first-pick'      : battle => battle["First Pick"] ? 1 : 0,
        'is-win'            : battle => battle["Win"] ? 1 : 0,
        'victory-points' : battle => battle["P1 Points"],
        'p1.picks'       : battle => battle["P1 Picks"],
        'p2.picks'       : battle => battle["P2 Picks"],
        'p1.prebans'      : battle => battle["P1 Prebans"],
        'p2.prebans'      : battle => battle["P2 Prebans"],
        'p1.postban'     : battle => battle["P1 Postban"],
        'p2.postban'     : battle => battle["P2 Postban"],
        'prebans'        : battle => [...battle["P1 Prebans"], ...battle["P2 Prebans"]],
        'p1.pick1'       : battle => battle["P1 Picks"][0],
        'p1.pick2'       : battle => battle["P1 Picks"][1],
        'p1.pick3'       : battle => battle["P1 Picks"][2],
        'p1.pick4'       : battle => battle["P1 Picks"][3],
        'p1.pick5'       : battle => battle["P1 Picks"][4],
        'p2.pick1'       : battle => battle["P2 Picks"][0],
        'p2.pick2'       : battle => battle["P2 Picks"][1],
        'p2.pick3'       : battle => battle["P2 Picks"][2],
        'p2.pick4'       : battle => battle["P2 Picks"][3],
        'p2.pick5'       : battle => battle["P2 Picks"][4],
        'p1.league'      : battle => LEAGUE_MAP[battle["P1 League"]],
        'p2.league'      : battle => LEAGUE_MAP[battle["P2 League"]],
        'p1.server'      : battle => battle["P1 Server"],
        'p2.server'      : battle => battle["P2 Server"],
    }

    constructor (str) {
        const fn = FieldType.FIELD_EXTRACT_FN_MAP[str];
        if (!fn) {
            throw new Futils.ValidationError(`Invalid field type: '${str}'; valid types are: ${Object.keys(FieldType.FIELD_EXTRACT_FN_MAP).join(', ')}`);
        } else {
            console.log("Found valid field type: ", str);
        }
        this.str = str;
        this.extractData = fn;
    }

    toString() {
        return this.str;
    }
}

class DataType {

    constructor(str, HM=null) {
        this.rawString = str;
        this.data = this.getData(str, HM);
    }
    toString() {
        return `${this.data}`;
    }
}



class StringType extends DataType {

    getData(str, HM) {
        str = str.replace(/'/g, "").replace(/"/g, "");
        str = str.trim();
        if (!RegExps.VALID_STRING_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid string; all string content must start with a letter followed by either num, hyphen or period ( case insensitive regex: ${RegExps.VALID_STRING_LITERAL_RE.source} ); got: '${str}'`);
        } 
        str = str.replace(/"|'/g, "");
        const hero = HeroManager.getHeroByName(str, HM);
        const league = LEAGUE_MAP[str];
        const server = Object.values(WORLD_CODE_TO_CLEAN_STR).find(server => server.toLowerCase() === str);
        if (!(hero || league || server)) {
            throw new Futils.SyntaxException(`Invalid string; All strings must either be a valid hero, league name, or server; got: '${str}'`);
        } 
        return hero ? hero.name : league ? league : server;
    }

    toString() {
        return `"${this.data}"`;
    }
}

class DateType extends DataType {

    getData(str, _HM=null) {
        return Futils.parseDate(str);
    } 

    toString() {
        return `${this.data}`;
    }  
}

class IntType extends DataType {

    getData(str, _HM=null) {
        if (!RegExps.VALID_INT_LITERAL_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid integer; must be a number; got: '${str}'`);
        }
        const parsedInt = parseInt(str);
        if (isNaN(parsedInt)) {
            throw new Futils.SyntaxException(`Invalid integer; must be a number; got: '${str}'`);
        }
        return parsedInt;
    }
    toString() {
        return `${this.data}`;
    }
}

class BoolType extends DataType {

    getData(str, _HM=null) {
        if (!RegExps.VALID_BOOL_LITERAL_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid boolean; must be 'true' or 'false'; got: '${str}'`);
        }
        return str === "true" ? 1 : 0;

    }
    toString() {
        return `${this.data ? "true" : "false"}`;
    }
}

class RangeType extends DataType {

    getData(str, _HM=null) {
        let split = str.split("...");
        if (split.length !== 2) {
            throw new Futils.SyntaxException(`Invalid range; ranges must be of the format x...y or x...=y ; got more than two values when splitting string: '${str}'`);
        } 
        let [start, end] = split;
        let endInclusive = false;
        if (end.includes("=")) {
            end = end.replace("=", "");
            endInclusive = true;
        }   
        let output = {
            start: null,
            end: null,
            endInclusive : endInclusive
        };
        if (RegExps.VALID_DATE_LITERAL_RE.test(start)) {
            output.start = Futils.tryConvert(Futils.parseDate, "Date", start, `Could not convert '${start}' to Date in declared range: '${str}'`);
            output.end = Futils.tryConvert(Futils.parseDate, "Date", end, `Could not convert '${end}' to Date in declared range: '${str}' ; Ranges must have homogenous types`);
            if (output.start > output.end) {
                throw new Futils.SyntaxException(`Invalid range; start date must be on or before end date; ${output.start} > ${output.end}`);
            }
            output.type = "Date";
        } else if (RegExps.VALID_INT_LITERAL_RE.test(start)) {
            output.start = Futils.tryConvert(i => new IntType(i), "Int", start, `Could not convert '${start}' to Int in declared range: '${str}'`).data;
            output.end = Futils.tryConvert(i => new IntType(i), "Int", end, `Could not convert '${end}' to Int in declared range: '${str}' ; Ranges must have homogenous types`).data;
            if (output.start > output.end) {
                throw new Futils.SyntaxException(`Invalid range; start integer must be equal to or less than end integer; ${output.start} > ${output.end}`);
            }
            output.type = "Int";
        } else {
            throw new Futils.SyntaxException(`Invalid range; must be of the format x...y or x...=y ; got: '${str}'`);
        }
        console.log(`Built Range: ${JSON.stringify(output)}`);
        return output;
    }
    toString() {
        const rangeSymb = this.data.endInclusive ? "...=" : "...";
        if (this.data.type === "Date") {
            return `${this.data.start.toISOString()}${rangeSymb}${this.data.end.toISOString()})`;
        } else if (this.data.type === "Int") {
            return `${this.data.start}...${rangeSymb}${this.data.end}`;
        } else {
            return `Error Converting Range to String => < ${this.data.start}...${rangeSymb}${this.data.end} >`;
        }
        
    }
}

class SetType extends DataType {

    getData(str, HM) {
        if (!RegExps.VALID_SET_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid set; must be in the format: { element1, element2,... }, where elements have either string format or date format; ( case insensitive regex: ${RegExps.VALID_SET_RE.source} ) (Just chat gpt this one bro); got: '${str}'`);
        }
        const elements = str.replace(/^\{|\}$/g, "").split(",")
        .map(e => e.trim())
        .filter(e => e !== "")
        .map(elt => {
            if (RegExps.VALID_STRING_RE.test(elt)) {
                return new StringType(elt, HM);
            } else if (RegExps.VALID_DATE_LITERAL_RE.test(elt)) {
                return new DateType(elt);
            } else {
                throw new Futils.SyntaxException(`Invalid set element; must be a string or date; got: '${elt}'`);
            }
        });
        console.log("GOT ELEMENTS: ", elements);
        let types = new Set();
        for (const element of elements) {
            types.add(element.constructor.name);
        }
        types = [...types];
        console.log("GOT TYPES: ", types);
        if (types.size > 1) {
            throw new Futils.SyntaxException(`Invalid set; all set elements must have the same data type; got: types: [${types.join(", ")}]`);
        }
        this.Type = types[0];
        return new Set(elements.map(data => data.data));
    }
    toString() {
        return `{${this.data.map(data => data.toString()).join(", ")}}`;
    }
}

function parseKeywordAsDataType(str, sourceData) {
    if (RegExps.VALID_SEASON_LITERAL_RE.test(str)) {
        const toStr = (date) => date.toISOString().slice(0, 10);
        if (sourceData.SeasonDetails.length < 1) {
            throw new Error(`Did not recieve any season details; failed on: '${str}'`);
        }
        else if (str === "current-season") {
            const [start, end] = sourceData.SeasonDetails.find(season => season["Status"] === "Active").range;
            return new RangeType(`${toStr(start)}...=${toStr(end === "N/A" ? new Date() : end)}`);
        } else {
            const seasonNum = Number(str.split("-")[1]);
            const season = sourceData.SeasonDetails.find(season => season["Season Number"] === seasonNum);
            if (!season) {
                throw new Error(`Invalid season specified; ${seasonNum} is not a valid season number; failed on str: '${str}'`);
            }
            const [start, end] = season.range;
            return new RangeType(`${toStr(start)}...=${toStr(end)}`);
        }
    }
}

function parseDataType(str, HM, SeasonDetails) {
    console.log(`Trying to Parse DataType: ${str}`);
    if (RegExps.VALID_STRING_LITERAL_RE.test(str)) {
        console.log("Parsing as StringType");
        return new StringType(str, HM);
    } else if (RegExps.VALID_DATE_LITERAL_RE.test(str)) {
        console.log("Parsing as DateType");
        return new DateType(str);
    } else if (RegExps.VALID_INT_LITERAL_RE.test(str)) {
        console.log("Parsing as IntType");
        return new IntType(str);
    } else if (RegExps.VALID_BOOL_LITERAL_RE.test(str)) {
        console.log("Parsing as BoolType");
        return new BoolType(str);
    } else if (/\{.*\}/.test(str)) {
        console.log("Parsing as SetType");
        return new SetType(str, HM);
    } else if (RegExps.VALID_RANGE_LITERAL_RE.test(str)) {
        console.log("Parsing as RangeType");
        return new RangeType(str);
    } else if (RegExps.VALID_DATA_WORD_LITERAL_RE.test(str)) {
        console.log("Parsing as DataWord");
        return parseKeywordAsDataType(str, { SeasonDetails });
    } else {
        console.log("Failed to parse DataType");
        if (RegExps.VALID_STRING_LITERAL_RE.test(`'${str}'`)) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; did you forget to wrap string literals in double or single quotes?`);
        } else if (str.includes("'") && str.includes('"')) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; did you encase in mismatching quote types?`);
        } else if (str.includes('.=') || str.includes("..")) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; were you trying to use a range? Ranges must be of the format x...y or x...=y and may only be int-int or date-date`);
        }
        throw new Futils.SyntaxException(`Invalid DataType declaration; could not parse to valid Field or Declared Data Type; got: '${str}'`);
    }
}

class Fn {

    constructor() {}

    call(battle) {
        throw new Error(`Base class ${this.constructor.name} does not implement the 'call' method. Implement this method in a subclass.`);
    }
}

class globalFilterFn extends Fn {

    constructor() {
        super();
    }

    toString(prefix = "") {
        return `${prefix}${this.str}`;
    }
}


class lastN extends globalFilterFn {

    constructor(args) {
        super();
        this.name = "last-N";
        if (args.length !== 1) {
            throw new Futils.SyntaxException(`${this.name} expects 1 argument, got ${args.length}`);
        } 
        const num = Number(args[0]);
        if (!Number.isInteger(num)) {
            throw new Futils.TypeException(`${this.name} expects an integer argument, could not parse '${args[0]}' as integer`);
        }
        this.str = `${this.name}(${num})`;
        this.n = num
    }

    call (battles) {
        battles.sort((b1, b2) => b1["Seq Num"] - b2["Seq Num"]);
        return battles.slice(-this.n);
    }
}


class ClauseFn extends Fn {

    constructor(fns) {
        super();
        this.fns = fns
        console.log("Clause Fn constructor got fns:", fns);
    }

    toString(prefix = "") {
        let output = '';
        const newPrefix = prefix + PRINT_PREFIX;
        this.fns.localFilters.forEach(fn => output += `${fn.toString(newPrefix)},\n`);
        console.log("Clause Fn toString got output:", output);
        return `${prefix}${this.str}(\n${output.trimEnd()}\n${prefix})`;
    }
}

class AND extends ClauseFn {
    constructor(fns) {
        super(fns);
        this.str = "AND";
    }
    call (battle) {
        return this.fns.localFilters.every(fn => fn.call(battle));
    }
}

class OR extends ClauseFn {
    constructor(fns) {
        super(fns);
        this.str = "OR";
    }
    call (battle) {
        return this.fns.localFilters.some(fn =>{
            return fn.call(battle);
        });
    }
}

class XOR extends ClauseFn {
    constructor(fns) {
        super(fns);
        this.str = "XOR";
    }
    call (battle) {
        let result = false;
        // Cascading XOR
        for (let fn of this.fns.localFilters) {
            result = (!result && fn.call(battle)) || (result && !fn.call(battle));
        }
        return result;
    }
}

class NOT extends ClauseFn {
    constructor(fns) {
        super(fns);
        this.str = "NOT";
    }
    call (battle) {
        return !this.fns.localFilters[0].call(battle);
    }
}

const FN_MAP = {
    and: AND,
    or: OR,
    xor: XOR,
    not: NOT,
    "last-n": lastN,
}

const CLAUSE_FNS = new Set([AND, OR, XOR, NOT]);
const GLOBAL_FILTER_FNS = new Set([lastN]);

class BaseFilter {
    constructor(str, fn) {
        this.str = str;
        this.fn = fn;
    }
    call(battle) {
        return this.fn(battle);
    }
    toString(prefix = "") {
        return `${prefix}${this.str}`;
    }
}

function tryParseFilterElement(leftOrRight, strValue, filterStr, HM, SeasonDetails) {
    let parsedValue = null;
    try {
        if (strValue in FieldType.FIELD_EXTRACT_FN_MAP) {
            parsedValue = new FieldType(strValue);
        } else {
            parsedValue = parseDataType(strValue, HM, SeasonDetails);
        }
    } catch (e) {
        for (let key in FieldType.FIELD_EXTRACT_FN_MAP) {
            if (strValue.includes(key) || key.includes(strValue)) {
                throw new Futils.SyntaxException(`Could not parse ${leftOrRight} side of filter; got: "${strValue}" from filter: [${filterStr}], did you mean to use '${key}' as a field instead?`);
            }
        }
        console.error(e);
        throw new Futils.SyntaxException(`Could not parse ${leftOrRight} side of filter; got: "${strValue}" from filter: [${filterStr}]; error: ${e.message}`);
    }
    return parsedValue;
}

class FilterSyntaxParser {

    static #INTERNAL_KEY = Symbol("internal");

    constructor(key) {
        if (key !== FilterSyntaxParser.#INTERNAL_KEY) {
            throw new Error("Cannot instantiate FilterSyntaxParser directly; use createAndParse method instead.");
        }
    }

    static getEmptyFilters() {
        return {localFilters: [], globalFilters: []};
    }

    static async createAndParse(string, HM = null, SeasonDetails = null) {
        console.log("Initialized parsing of string:", string);
        const parser = new FilterSyntaxParser(FilterSyntaxParser.#INTERNAL_KEY);
        HM = HM || await HeroManager.getHeroManager();
        SeasonDetails = SeasonDetails || await SeasonManager.getSeasonDetails();
        parser.rawString = string;
        parser.HM = HM;
        parser.SeasonDetails = SeasonDetails;
        parser.preParsedString = preParse(string);
        parser.globalFilters = [];
        parser.filters = parser.parseFilters(parser.preParsedString);
        console.log("Got Filters\n");
        console.log(parser.toString());
        return parser;
    }

    toString() {
        const filters = [...this.filters.localFilters];
        filters.push(...this.filters.globalFilters);
        return `[\n${filters.map(filter => filter.toString(PRINT_PREFIX)).join(";\n")}\n]`;
    }

    parseGlobalFilterFn(globalFilterFn, str) {
        const pattern = RegExps.anchorExp(RegExps.VALID_GLOBAL_FILTER_RE);
        if (!pattern.test(str)) {
            throw new Futils.SyntaxException(`Invalid global filter format; must follow the case insensitive regex format "${pattern.source}" ; got: '${str}'`);
        }
        const [delim, enclosureLevel] = [",", 1];
        const args = Futils.tokenizeWithNestedEnclosures(str, delim, enclosureLevel);
        if (globalFilterFn === lastN) {
            return {localFilters: [], globalFilters: [new lastN(args)]};
        } else {
            throw new Futils.SyntaxException(`Global filter function ${globalFilterFn.str} not mapped in parseGlobalFilterFn`);
        }
    }

    parseClauseFn(clauseFn, str) {
        console.log("Parsing clause fn:", clauseFn.name, str);
        const [delim, enclosureLevel] = [",", 1];
        const argArr = Futils.tokenizeWithNestedEnclosures(str, delim, enclosureLevel);
        console.log("Got argArr:", argArr);
        if (clauseFn === XOR && argArr.length < 2) {
            throw new Futils.SyntaxException(`XOR clause must have at least two arguments; got: ${argArr.length} arguments from string: "${str}"`);
        } else if (clauseFn === NOT && argArr.length !== 1) {
            throw new Futils.SyntaxException(`NOT clause must have exactly one argument; got: ${argArr.length} arguments from string: "${str}"`);
        }
        const fns = argArr.reduce((acc, arg) => {
            acc.localFilters.push(...this.parseFilters(arg).localFilters); 
            acc.globalFilters.push(...this.parseFilters(arg).globalFilters);
            return acc
        }, FilterSyntaxParser.getEmptyFilters());
        if (fns.globalFilters.length > 0) {
            throw new Futils.SyntaxException(`Global filters not allowed in clause functions; got: ${fns.globalFilters} from string: "${str}"`);
        }
        if (clauseFn === NOT && fns.localFilters.length !== 1) {
            throw new Futils.SyntaxException(`NOT clause must have exactly one argument; got: ${fns.length} arguments from string: "${str}"`);
        }
        return {localFilters: [new clauseFn(fns)], globalFilters: []};
    }

    parseBaseFilter(str) {
        console.log("Parsing base filter:", str);
        const HM = this.HM;
        const [delim, enclosureLevel, trim] = [" ", 0, true];
        const tokens = Futils.tokenizeWithNestedEnclosures(str, delim, enclosureLevel, trim);

        console.log("Got tokens: ", tokens, `; Length: ${tokens.length}`);

        // must be of form ['X', operator, 'Y']
        if (!(tokens.length === 3)) {
            throw new Futils.SyntaxException(`Invalid base filter format; all filters must be of the form: ['X', operator, 'Y']; got tokens: [${tokens.join(", ")}]`);
        }
        let [left, operator, right] = tokens;

        // Validate operator
        if (!OPERATOR_MAP[operator]) {
            throw new Futils.SyntaxException(`Invalid operator in base filter; got: "${operator}" as the operator in filter: [${str}]`);
        }
        const opFn = OPERATOR_MAP[operator];

        // try to converty to field types and data types
        left = tryParseFilterElement("left", left, str, HM, this.SeasonDetails);
        right = tryParseFilterElement("right", right, str, HM, this.SeasonDetails);

        // validate filter
        if (operator === "in" || operator === "!in") {
            if (!(right instanceof SetType || right instanceof RangeType)) {
                if(!(right instanceof FieldType) || !(SET_FIELDS.has(right.str))) {
                    throw new Futils.TypeException(`When using any 'in' or '!in' operator, the right side of the operator must be a Set, Range, or a Field composed of a set (i.e. p1.picks, p2.prebans, etc.); error found in filter: '${str}'`);
                }
            }
        }

        if (right instanceof RangeType) {
            if (right.data.type === "Date") {
                if (!(left.str.includes('date'))) {
                    throw new Futils.TypeException(`When using a Date Range, the left side of the operator must be a date field; ${left.str} is not a date field; error found in filter: '${str}'`);
                }
            } else if (right.data.type === "Int") {
                if (!(INT_FIELDS.has(left.str))) {
                    throw new Futils.TypeException(`When using an Int Range, the left side of the operator must be an integer field; ${left.str} is not an integer field; error found in filter: '${str}'`);
                }
            }
        }

        if (right instanceof DataType && left instanceof DataType) {
            throw new Futils.SyntaxException(`Either left or right side of filter must be a data field (a property of a battle); both ${left} and ${right} are user declared data types in filter: "${str}"`);
        }

        // make filter
        let filterFn = null;
        if (left instanceof DataType) {
            filterFn = (battle) => { return opFn(left.data, right.extractData(battle)); };
        } else if (right instanceof DataType) {
            filterFn = (battle) => { return opFn(left.extractData(battle), right.data); };
        } else {
            filterFn = (battle) => { return opFn(left.extractData(battle), right.extractData(battle)); };
        }
        console.log("Returning base local filter", [new BaseFilter(str, filterFn).toString()]);
        return {localFilters: [new BaseFilter(str, filterFn)], globalFilters: []};
    }

    parseFilters(str) {
        console.log(`Parsing filter string: "${str || this.preParsedString}"`);

        if (str === "") {
            console.log("Empty filter string; Returning empty filters");
            return FilterSyntaxParser.getEmptyFilters();
        }
        str = str.trim();
        let split = str.split(";").filter(s => s.length > 0);

        for (let splitStr of split) {
            let charCounts = Futils.getCharCounts(splitStr);
            if (charCounts["("] !== charCounts[")"]) {
                throw new Futils.SyntaxException(`Imbalanced parentheses in following string: "${splitStr}"`);
            } else if (charCounts["{"] !== charCounts["}"]) {
                throw new Futils.SyntaxException(`Imbalanced braces ('{', '}') in following string: "${splitStr}"`);
            } else if ((charCounts["\""] || 0) % 2 !== 0) {
                throw new Futils.SyntaxException(`Imbalanced double quotes in following string: "${splitStr}"`);
            } else if ((charCounts["'"] || 0) % 2 !== 0) {
                console.log("Imbalanced single quotes in following string:", splitStr, "; got:", charCounts["'"]);
                throw new Futils.SyntaxException(`Imbalanced single quotes in following string: "${splitStr}"`);
            }
        }
        

        if (split.length > 1) {
            console.log(`Processing <${split.length}> filters; filters: ${split}`);
            return split.reduce((acc, arg) => {
                acc.localFilters.push(...this.parseFilters(arg).localFilters); 
                acc.globalFilters.push(...this.parseFilters(arg).globalFilters);
                return acc
            }, FilterSyntaxParser.getEmptyFilters());
        }
        const filterString = split[0];
        if (filterString.length < 4) {
            throw new Futils.SyntaxException(`Filter string cannot be valid (less than 4 characters); got filter string: [${filterString}]`);
        }
        const splitFilterString = filterString.split("(");
        const fn = FN_MAP[splitFilterString[0]];
        console.log("Trying to look for Fn ; got:", splitFilterString[0], "from string:", filterString);
        if (!fn) {
            console.log("Did not find Fn; dispatching to base filter parser");
            return this.parseBaseFilter(filterString);
        } else if (CLAUSE_FNS.has(fn)) {
            console.log("Found clause fn; dispatching to clause fn parser");
            return this.parseClauseFn(fn, filterString);
        } else if (GLOBAL_FILTER_FNS.has(fn)) {
            console.log("Found global filter fn; dispatching to global filter fn parser");
            return this.parseGlobalFilterFn(fn, filterString);
        } else {
            throw new Error(`could not parse filter string as Fn: "${str}" ; did not map to any defined pattern`);
        }
    }
}

export default FilterSyntaxParser;