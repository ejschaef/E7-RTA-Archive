import { LEAGUE_MAP } from './references.js';
import HeroManager from './hero-manager.js';
import Futils from './filter-utils.js';

const ACCEPTED_CHARS = new Set('(),-.=; <>1234567890{}' + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
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
    KIND = "FieldType";

    // FNS that take in a clean format battle and return the appropriate data
    FIELD_EXTRACT_FN_MAP = {
        'battle-date'    : battle => battle["Date/Time"]?.slice(0, 12) || "N/A",
        'firstpick'      : battle => battle["Firstpick"] === "True" ? 1 : 0,
        'win'            : battle => battle["Win"] === "W" ? 1 : 0,
        'victory-points' : battle => battle["P1 Points"],
        'p1.picks'       : battle => battle["P1 Picks"],
        'p2.picks'       : battle => battle["P2 Picks"],
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
        const fn = this.FIELD_EXTRACT_FN_MAP[str];
        if (!fn) {
            throw new Futils.ValidationError(`Invalid field type: '${str}'; valid types are: ${Object.keys(this.FIELD_EXTRACT_FN_MAP).join(', ')}`);
        }
        this.extractData = fn;
    }
}

class DataType {

    KIND = "DataType";

    constructor(str, HM=null) {
        this.rawString = str;
        this.data = this.getData(str, HM=null);
    }
    toString() {
        return `${this.data}`;
    }
}

const VALID_STRING_RE = /[a-z][a-z0-9\.\-]*/;
const VALID_DATE_RE = /\d{4}-\d{2}-\d{2}/;
const EMPTY_SET_RE = /^\{\s*\}$/;
const SET_ELEMENT_RE = `(?:${VALID_STRING_RE.source}|${VALID_DATE_RE.source})`;
const VALID_SET_RE = new RegExp(`^\\{\\s*(?:${SET_ELEMENT_RE}\\s*,\\s*)+(?:${SET_ELEMENT_RE}\\s*,?\\s*)\\}$|${EMPTY_SET_RE.source}`);

class StringType extends DataType {

    PATTERN = new RegExp(`^${VALID_STRING_RE.source}$`);

    getData(str, HM) {
        if (!this.PATTERN.test(str)) {
            throw new Futils.SyntaxException(`Invalid string; all string content must start with a letter followed by either num, hyphen or period ( regex: ${this.PATTERN.source} ); make sure to use '-' instead of spaces; got: '${str}'`);
        } 
        const str = str.replace(/-/g, " ");
        const heroName = HeroManager.getHeroByName(str, HM, fallbackToFodder = false);
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

    PATTERN = new RegExp(`^${VALID_DATE_RE.source}$`);

    getData(str, _=null) {
        if (!this.PATTERN.test(str)) {
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
        if (str !== "true" && str !== "false") {
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


class ClauseFn {

    STR = "Not Implemented for Base Class";

    constructor(fns) {
        this.fns = fns;
    }

    call(battle) {
        throw new Error(`Base class ${this.constructor.name} does not implement the 'call' method. Implement this method in a subclass.`);
    }

    toString(prefix = "") {
        let output = '';
        this.fns.map(fn => output += `${fn.toString()},\n`);
        return `${prefix}${this.STR}(\n${output.trimEnd()}${prefix})`;
    }
}

class AND extends ClauseFn {
    STR = "AND";
    call (battle) {
        return this.fns.every(fn => fn.call(battle));
    }
}

class OR extends ClauseFn {
    STR = "OR";
    call (battle) {
        return this.fns.some(fn => fn.call(battle));
    }
}

class XOR extends ClauseFn {
    STR = "XOR";
    call (battle) {
        return this.fns.some(fn => fn.call(battle)) && !this.fns.every(fn => fn.call(battle));
    }
}

const CLAUSE_FN_MAP = {
    and: AND,
    or: OR,
    xor: XOR,
}

function validateBaseFilterSplit(split) {
    if (split.length !== 3) {
        throw new Futils.SyntaxException(`Invalid base filter format; all filters must be of the form: ['X', operator, 'Y']; got: "${split}"`);
    }
    if (!OPERATOR_MAP[split[1]]) {
        throw new Futils.SyntaxException(`Invalid operator in base filter; got: "${split[1]} as operator in filter: "${split}"`);
    }
}

class FilterSyntaxParser {
    async createParser(string, HM = HeroManager.getHeroManager() ) {
        const parser = new FilterSyntaxParser();
        parser.rawString = string;
        parser.HM = HM;
        parser.preParsedString = preParse(string);
    }

    parseClauseFn(clauseFn, str) {
        const argArr = Futils.retrieveArgs(str);
        const fns = argArr.map(arg => this.parseFilter(arg));
        return [new clauseFn(fns)]
    }

    parseBaseFilter(str) {
        str = str.trim();
        const counts = Futils.getCharCounts(str);
        if (counts["("] > 1 || counts[")"] > 1) {
            throw new Futils.SyntaxException(`Can only pass one declared data type in a base filter; got multiple sets of parenthese in str: "${str}"`);
        }
        split = Futils.tokenizeWithNestedEnclosures(str);
        validateBaseFilterSplit(split);

        left = split[0].trim();
        right = split[2].trim();

    }

    parseFilters(str=null) {
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
                acc.push(...this.parseFilter(filterStr));
                return acc;
            }, []);
        }
        const filterString = split[0];
        if (filterString.length < 4) {
            throw new Futils.SyntaxException(`Filter string cannot be valid (less than 4 characters); got filter string: "${filterString}"`);
        }
        const splitFilterString = filterString.split("(");
        let clauseFn = CLAUSE_FN_MAP[splitFilterString[0]];
        clauseFn ? this.parseClauseFn(clauseFn, filterString) : this.parseBaseFilter(filterString);
    }
}