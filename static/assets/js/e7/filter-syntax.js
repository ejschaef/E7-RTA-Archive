import { LEAGUE_MAP } from './references.js';
import HeroManager from './hero-manager.js';
import Futils from './filter-utils.js';
import { RegExps } from './regex.js';
import SeasonManager from './season-manager.js';

const ACCEPTED_CHARS = new Set(`'"(),-.=; ><!1234567890{}` + `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`);
const PRINT_PREFIX = "   ";

// must handle both regular sets and ranges
function inOperatorFn(a, b) {
    const bStr = typeof b === "object" ? JSON.stringify(b) : `${b}`;
    if (b instanceof Set) {
        return b.has(a);
    } 
    // handle ranges
    else if (typeof b === "object" && b !== null && !Array.isArray(b) && ['start', 'end', 'endInclusive', 'type'].every(key => b.hasOwnProperty(key))) {
        a = b.type === "Date" ? new Date(`${a}T00:00:00`) : a;
        return a >= b.start && (b.endInclusive ? a <= b.end : a < b.end);
    }
    else {
        throw new Error(`Invalid match pattern for 'in' operators; got: '${a}' and '${bStr}'`);
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
    str = str.replace(/\n/g, "").replace(/\t/g, "").replace(/\r/g, ""); //remove newlines, tabs, and carriage returns
    str = str.replace(/ {2,}/g, ""); // remove two or more spaces
    validateChars(str, ACCEPTED_CHARS, "Main Filter String");
    str = str.toLowerCase();
    return str;
}

const INT_FIELDS = new Set(["victory-points"]);

class FieldType {

    // FNS that take in a clean format battle and return the appropriate data
    static FIELD_EXTRACT_FN_MAP = {
        'date'    : battle => battle["Date/Time"]?.slice(0, 10) || "N/A",
        'firstpick'      : battle => battle["Firstpick"] === "True" ? 1 : 0,
        'win'            : battle => battle["Win"] === "W" ? 1 : 0,
        'victory-points' : battle => battle["P1 Points"],
        'p1.picks'       : battle => battle["P1 Picks"],
        'p2.picks'       : battle => battle["P2 Picks"],
        'p1.prebans'      : battle => battle["P1 Prebans"],
        'p2.prebans'      : battle => battle["P2 Prebans"],
        'p1.postban'     : battle => battle["P1 Postban"],
        'p2.postban'     : battle => battle["P2 Postban"],
        'p1.pick1'       : battle => battle["P1 Pick 1"],
        'p1.pick2'       : battle => battle["P1 Pick 2"],
        'p1.pick3'       : battle => battle["P1 Pick 3"],
        'p1.pick4'       : battle => battle["P1 Pick 4"],
        'p1.pick5'       : battle => battle["P1 Pick 5"],
        'p2.pick1'       : battle => battle["P2 Pick 1"],
        'p2.pick2'       : battle => battle["P2 Pick 2"],
        'p2.pick3'       : battle => battle["P2 Pick 3"],
        'p2.pick4'       : battle => battle["P2 Pick 4"],
        'p2.pick5'       : battle => battle["P2 Pick 5"],
        'p1.league'      : battle => battle["P1 League"],
        'p2.league'      : battle => battle["P2 League"],
    }

    constructor (str) {
        const fn = FieldType.FIELD_EXTRACT_FN_MAP[str];
        if (!fn) {
            throw new Futils.ValidationError(`Invalid field type: '${str}'; valid types are: ${Object.keys(FieldType.FIELD_EXTRACT_FN_MAP).join(', ')}`);
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
            throw new Futils.SyntaxException(`Invalid string; all string content must start with a letter followed by either num, hyphen or period ( regex: ${RegExps.VALID_STRING_LITERAL_RE.source} ); got: '${str}'`);
        } 
        str = str.replace(/"|'/g, "");
        const hero = HeroManager.getHeroByName(str, HM);
        const league = LEAGUE_MAP[str];
        if (!hero && !league) {
            throw new Futils.SyntaxException(`Invalid string; All strings must either be a valid hero or league name; got: '${str}'`);
        } 
        return hero ? hero.prime : league;
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
        return `${this.data}`;
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
            throw new Futils.SyntaxException(`Invalid set; must be in the format: { element1, element2,... }, where elements have either string format or date format; ( regex: ${RegExps.VALID_SET_RE.source} ) (Just chat gpt this one bro); got: '${str}'`);
        }
        const elements = str.replace(/^\{|\}$/g, "").split(",").map(element => {
            const trimmedElement = element.trim();
            if (RegExps.VALID_STRING_RE.test(trimmedElement)) {
                return new StringType(trimmedElement, HM);
            } else if (RegExps.VALID_DATE_LITERAL_RE.test(trimmedElement)) {
                return new DateType(trimmedElement);
            } else {
                throw new Futils.SyntaxException(`Invalid set element; must be a string or date; got: '${trimmedElement}'`);
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
        if (sourceData.SeasonDetails.length < 1) {
            throw new Error(`Did not recieve any season details; failed on: '${str}'`);
        }
        else if (str === "current-season") {}
            const [start, end] = sourceData.SeasonDetails[0].range;
            return new RangeType(`${start.toISOString()}...=${end.toISOString()}`);
        } else {
            const seasonNum = Number(str.split("-")[1]);
            const [start, end] = sourceData.SeasonDetails.find(season => season["Season Number"] === seasonNum).range;
            return new RangeType(`${start.toISOString()}...=${end.toISOString()}`);
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
        if (RegExps.VALID_STRING_LITERAL_RE.test(`'${str}'`)) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; did you forget to wrap string literals in double or single quotes?`);
        } else if (str.includes("'") && str.includes('"')) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; did you encase in mismatching quote types?`);
        } else if (str.includes('.=') || str.includes("..")) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; were you trying to use a range? Ranges must be of the format x...y or x...=y and may only b int-int or date-date`);
        }
        throw new Futils.SyntaxException(`Invalid DataType declaration; could not parse to valid Field, set, or primitive type; got: '${str}'`);
    }
}


class ClauseFn {

    constructor(fns) {
        this.fns = fns
    }

    call(battle) {
        throw new Error(`Base class ${this.constructor.name} does not implement the 'call' method. Implement this method in a subclass.`);
    }

    toString(prefix = "") {
        let output = '';
        this.fns.forEach(fn => output += `${prefix}${prefix}${fn.toString(PRINT_PREFIX)};\n`);
        return `${prefix}${this.str}(\n${output.trimEnd()}\n${prefix})`;
    }
}

class AND extends ClauseFn {
    constructor(fns) {
        super(fns);
        this.str = "AND";
    }
    call (battle) {
        return this.fns.every(fn => fn.call(battle));
    }
}

class OR extends ClauseFn {
    constructor(fns) {
        super(fns);
        this.str = "OR";
    }
    call (battle) {
        return this.fns.some(fn =>{
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
        return this.fns.some(fn => fn.call(battle)) && !this.fns.every(fn => fn.call(battle));
    }
}

class NOT extends ClauseFn {
    constructor(fns) {
        if (!fns.length === 1) {
            throw new Futils.SyntaxException(`NOT clause must have exactly one argument; got: ${fns.length}`);
        }
        super(fns);
        this.str = "NOT";
    }
    call (battle) {
        return !this.fns[0].call(battle);
    }
}

const CLAUSE_FN_MAP = {
    and: AND,
    or: OR,
    xor: XOR,
    not: NOT,
}

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

class FilterSyntaxParser {

    static #INTERNAL_KEY = Symbol("internal");

    constructor(key) {
        if (!key === FilterSyntaxParser.#INTERNAL_KEY) {
            throw new Error("Cannot instantiate FilterSyntaxParser directly; use createAndParse method instead.");
        }
    }

    static async createAndParse(string, HM = null, SeasonDetails = null) {
        const parser = new FilterSyntaxParser(FilterSyntaxParser.#INTERNAL_KEY);
        HM = HM || await HeroManager.getHeroManager();
        SeasonDetails = SeasonDetails || await SeasonManager.getSeasonDetails();
        parser.rawString = string;
        parser.HM = HM;
        parser.SeasonDetails = SeasonDetails;
        parser.preParsedString = preParse(string);
        let charCounts = Futils.getCharCounts(parser.preParsedString);
        if (charCounts["("] !== charCounts[")"]) {
            throw new Futils.SyntaxException(`Imbalanced parentheses in filter string: "${str}"`);
        }
        parser.filters = parser.parseFilters(parser.preParsedString);
        return parser;
    }

    toString() {
        return `[\n${this.filters.map(filter => filter.toString(PRINT_PREFIX)).join(";\n")}\n]`;
    }

    parseClauseFn(clauseFn, str) {
        console.log("Parsing clause fn:", clauseFn.name, str);
        const [delim, enclosureLevel] = [",", 1];
        const argArr = Futils.tokenizeWithNestedEnclosures(str, delim, enclosureLevel);
        console.log("Got argArr:", argArr);
        const fns = argArr.reduce((acc, arg) => {
            acc.push(...this.parseFilters(arg)); 
            return acc
        }, []);
        if (clauseFn === NOT && fns.length !== 1) {
            throw new Futils.SyntaxException(`NOT clause must have exactly one argument; got: ${fns.length} from string: "${str}"`);
        }
        return [new clauseFn(fns)]
    }

    parseBaseFilter(str) {
        console.log("Parsing base filter:", str);
        const HM = this.HM;
        const [delim, enclosureLevel, trim] = [" ", 0, true];
        const tokens = Futils.tokenizeWithNestedEnclosures(str, delim, enclosureLevel, trim);

        console.log("Got tokens: ", tokens);

        // must be of form ['X', operator, 'Y']
        if (!tokens.length === 3) {
            throw new Futils.SyntaxException(`Invalid base filter format; all filters must be of the form: ['X', operator, 'Y']; got tokens: [${tokens.join(", ")}]`);
        }
        let [left, operator, right] = tokens;

        // Validate operator
        if (!OPERATOR_MAP[operator]) {
            throw new Futils.SyntaxException(`Invalid operator in base filter; got: "${operator} as operator in filter: "${str}"`);
        }
        const opFn = OPERATOR_MAP[operator];

        // try to converty to field types and data types
        try {
            if (left in FieldType.FIELD_EXTRACT_FN_MAP) {
                left = new FieldType(left);
            } else {
                left = parseDataType(left, HM, this.SeasonDetails);
            }
        } catch (e) {
            throw new Futils.SyntaxException(`Could not parse left side of filter; got: "${left}" from filter: "${str}", error: ${e.message}`);
        }
        try {
            if (right in FieldType.FIELD_EXTRACT_FN_MAP) {
                right = new FieldType(right);
            } else {
                right = parseDataType(right, HM, this.SeasonDetails);
            }
        } catch (e) {
            throw new Futils.SyntaxException(`Could not parse right side of filter; got: "${right}" from filter: "${str}", error: ${e.message}`);
        }

        // validate filter
        if (operator === "in" || operator === "!in") {
            if (!(right instanceof SetType || right instanceof RangeType)) {
                if(!right instanceof FieldType || ! right.str in ["p1.picks", "p2.picks", "p1.prebans", "p2.prebans"]) {
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
        console.log("Returning base filter", [new BaseFilter(str, filterFn).toString()]);
        return [new BaseFilter(str, filterFn)];
    }

    parseFilters(str) {
        console.log(`Parsing filter string: "${str || this.preParsedString}"`);

        if (str === "") {
            console.log("Empty filter string; Returning empty array");
            return [];
        }
        str = str.trim();
        let split = str.split(";").filter(s => s.length > 0);
        if (split.length > 1) {
            console.log(`Processing <${split.length}> filters; filters: ${split}`);
            return split.reduce((acc, filterStr) => { 
                console.log(`Parsing component filter string: "${filterStr}"`);
                acc.push(...this.parseFilters(filterStr));
                return acc;
            }, []);
        }
        const filterString = split[0];
        if (filterString.length < 4) {
            throw new Futils.SyntaxException(`Filter string cannot be valid (less than 4 characters); got filter string: "${filterString}"`);
        }
        const splitFilterString = filterString.split("(");
        let clauseFn = CLAUSE_FN_MAP[splitFilterString[0]];
        return clauseFn ? this.parseClauseFn(clauseFn, filterString) : this.parseBaseFilter(filterString);
    }
}

export default FilterSyntaxParser;