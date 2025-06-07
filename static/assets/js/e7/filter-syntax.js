import { LEAGUE_MAP } from './references.js';
import HeroManager from './hero-manager.js';
import Futils from './filter-utils.js';

const ACCEPTED_CHARS = new Set(`'"(),-.=; <>1234567890{}` + `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`);
const PRINT_PREFIX = "   ";

const OPERATOR_MAP = {
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
    '=': (a, b) => a === b,
    'in': (a, b) => b.includes(a),
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
    '<>': (a, b) => a !== b,
    '<>in': (a, b) => !b.includes(a),
};

function validateChars(str, charSet, objName) {
    for (let char of str) {
        if (!charSet.has(char)) {
            throw new Futils.SyntaxException(`Invalid character within <${objName}>: '${char}' not allowed; got string: '${str}'`);
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

class FieldType {

    // FNS that take in a clean format battle and return the appropriate data
    static FIELD_EXTRACT_FN_MAP = {
        'battle-date'    : battle => battle["Date/Time"]?.slice(0, 12) || "N/A",
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

const VALID_STRING_RE = /[a-z][a-z0-9\. ]*/;
const VALID_DATE_RE = /\d{4}-\d{2}-\d{2}/;
const EMPTY_SET_RE = /\{\s*\}/;
const SET_ELEMENT_RE =  new RegExp(`(?:"${VALID_STRING_RE.source}"|'${VALID_STRING_RE.source}'|${VALID_STRING_RE.source}|${VALID_DATE_RE.source})`);
const VALID_SET_RE = new RegExp(`^\\{\\s*(?:${SET_ELEMENT_RE.source}\\s*,\\s*)+(?:${SET_ELEMENT_RE.source}\\s*,?\\s*)\\}$|^${EMPTY_SET_RE.source}$`);

const VALID_STRING_LITERAL_RE = new RegExp(`^"${VALID_STRING_RE.source}"$|^'${VALID_STRING_RE.source}'$`);
const VALID_DATE_LITERAL_RE = new RegExp(`^${VALID_DATE_RE.source}$`);
const VALID_INT_LITERAL_RE = /^\d+$/;
const VALID_BOOL_LITERAL_RE = /^(true|false)$/;

class StringType extends DataType {

    getData(str, HM) {
        if (!VALID_STRING_LITERAL_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid string; all string content must start with a letter followed by either num, hyphen or period ( regex: ${this.PATTERN.source} ); make sure to use '-' instead of spaces; got: '${str}'`);
        } 
        str = str.replace(/"|'/g, "");
        const heroName = HeroManager.getHeroByName(str, HM);
        const league = LEAGUE_MAP[str];
        if (!heroName && !league) {
            throw new Futils.SyntaxException(`Invalid string; All strings must either be a valid hero or league name; got: '${str}'`);
        } 
        return heroName ? heroName : league;
    }

    toString() {
        return `"${this.data}"`;
    }
}

class DateType extends DataType {

    getData(str, _=null) {
        if (!VALID_DATE_LITERAL_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid date; must be in the format: YYYY-MM-DD ( regex: ${this.PATTERN.source} ); got: '${str}'`);
        }
        return str;
    } 

    toString() {
        return `Date(${this.data})`;
    }  
}

class IntType extends DataType {

    getData(str, _=null) {
        const parsedInt = parseInt(str);
        if (isNaN(parsedInt)) {
            throw new Futils.SyntaxException(`Invalid integer; must be a number; got: '${str}'`);
        }
        return parsedInt;
    }
    toString() {
        return `Int(${this.data})`;
    }
}

class BoolType extends DataType {

    getData(str, _=null) {
        if (!VALID_BOOL_LITERAL_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid boolean; must be 'true' or 'false'; got: '${str}'`);
        }
        return str === "true" ? 1 : 0;

    }
    toString() {
        return `Bool(${this.data})`;
    }
}

class SetType extends DataType {

    getData(str, HM) {
        if (!VALID_SET_RE.test(str)) {
            throw new Futils.SyntaxException(`Invalid set; must be in the format: { element1, element2,... }, where elements have either string format or date format; ( regex: ${VALID_SET_RE.source} ) (Just chat gpt this one bro); got: '${str}'`);
        }
        const elements = str.replace(/^\{|\}$/g, "").split(",").map(element => {
            const trimmedElement = element.trim();
            if (VALID_STRING_RE.test(trimmedElement)) {
                return new StringType(trimmedElement, HM);
            } else if (VALID_DATE_RE.test(trimmedElement)) {
                return new DateType(trimmedElement);
            } else {
                throw new Futils.SyntaxException(`Invalid set element; must be a string or date; got: '${trimmedElement}'`);
            }
        });
        let types = new Set();
        for (const element of elements) {
            types.add(element.constructor.name);
        }
        types = [...types];
        if (types.size > 1) {
            throw new Futils.SyntaxException(`Invalid set; all set elements must have the same data type; got: types: [${types.join(", ")}]`);
        }
        this.Type = types[0];
        return elements.map(data => data.data);
    }
    toString() {
        return `{${this.data.map(data => data.toString()).join(", ")}}`;
    }
}

function parseDataType(str, HM) {
    console.log(`Trying to Parse DataType: ${str}`);
    if (VALID_STRING_LITERAL_RE.test(str)) {
        console.log("Parsing as StringType");
        return new StringType(str, HM);
    } else if (VALID_DATE_LITERAL_RE.test(str)) {
        console.log("Parsing as DateType");
        return new DateType(str);
    } else if (VALID_INT_LITERAL_RE.test(str)) {
        console.log("Parsing as IntType");
        return new IntType(str);
    } else if (VALID_BOOL_LITERAL_RE.test(str)) {
        console.log("Parsing as BoolType");
        return new BoolType(str);
    } else if (VALID_SET_RE.test(str)) {
        console.log("Parsing as SetType");
        return new SetType(str, HM);
    } else {
        if (VALID_STRING_LITERAL_RE.test(`'${str}'`)) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; did you forget to wrap string literals in double or single quotes?`);
        } else if (str.includes("'") && str.includes('"')) {
            throw new Futils.SyntaxException(`Invalid DataType declaration; got: '${str}'; did you encase in mismatching quote types?`);
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
        return this.fns.some(fn => fn.call(battle));
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

const CLAUSE_FN_MAP = {
    and: AND,
    or: OR,
    xor: XOR,
}

class BaseFilter {
    constructor(str, fn) {
        this.str = str;
        this.fn = fn;
    }
    call(battle) {
        return this.fn.call(battle);
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

    static async createAndParse(string, HM = null ) {
        const parser = new FilterSyntaxParser(FilterSyntaxParser.#INTERNAL_KEY);
        HM = HM || await HeroManager.getHeroManager();
        parser.rawString = string;
        parser.HM = HM;
        parser.preParsedString = preParse(string);
        parser.filters = parser.parseFilters(parser.preParsedString);
        return parser;
    }

    toString() {
        return `[\n${this.filters.map(filter => filter.toString(PRINT_PREFIX)).join(";\n")}\n]`;
    }

    parseClauseFn(clauseFn, str) {
        console.log("Parsing clause fn:", clauseFn, str);
        const argArr = Futils.retrieveArgs(str);
        const fns = argArr.map(arg => this.parseBaseFilter(arg));
        return [new clauseFn(fns)]
    }

    parseBaseFilter(str) {
        console.log("Parsing base filter:", str);
        const HM = this.HM;
        const tokens = Futils.tokenizeWithNestedEnclosures(str);

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
                left = parseDataType(left, HM);
            }
        } catch (e) {
            throw new Futils.SyntaxException(`Could not parse left side of filter; got: "${left}" from filter: "${str}", error: ${e.message}`);
        }
        try {
            if (right in FieldType.FIELD_EXTRACT_FN_MAP) {
                right = new FieldType(right);
            } else {
                right = parseDataType(right, HM);
            }
        } catch (e) {
            throw new Futils.SyntaxException(`Could not parse right side of filter; got: "${right}" from filter: "${str}", error: ${e.message}`);
        }

        // validate filter
        if (operator === "in" || operator === "<>in") {
            if (!right instanceof SetType) {
                if(!right instanceof FieldType || ! right.str in ["p1.picks", "p2.picks", "p1.prebans", "p2.prebans"]) {
                    throw new Futils.SyntaxException(`When using any 'in' or '<>in' operator, the right side of the operator must be a Set or a Field composed of a set (p1.picks, p2.prebans, etc.); error found in filter: '${str}'`);
                }
            }
        }

        // make filter
        let filterFn = null;
        if (left instanceof DataType) {
            filterFn = (battle) => { return opFn(left.extractData(battle), right); };
        } else if (right instanceof DataType) {
            filterFn = (battle) => { return opFn(left, right.extractData(battle)); };
        } else {
            filterFn = (battle) => { return opFn(left.extractData(battle), right.extractData(battle)); };
        }
        console.log("Returning base filter", [new BaseFilter(str, filterFn).toString()]);
        return [new BaseFilter(str, filterFn)];
    }

    parseFilters(str=null) {
        console.log(`Parsing filter string: "${str || this.preParsedString}"`);
        if (!str) {
            str = this.preParsedString;
            let charCounts = Futils.getCharCounts(str);
            if (charCounts["("] !== charCounts[")"]) {
                throw new Futils.SyntaxException(`Imbalanced parentheses in filter string: "${str}"`);
            }
        }
        if (!str) {
            return [];
        }
        str = str.trim();
        let split = str.split(";");
        if (split.length > 1) {
            return split.reduce((acc, filterStr) => { 
                console.log(`Parsing nested filter string: "${filterStr}"`);
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