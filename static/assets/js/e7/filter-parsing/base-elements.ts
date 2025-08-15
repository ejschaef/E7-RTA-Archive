import { BattleType, COLUMNS_MAP } from "../references";
import { RegExps } from "../regex";
import { FilterReferences } from "./filter-parse-references";
import Futils from "./filter-utils";
import { parseStringLiteral, STRING_LITERAL_PARSERS, StringLiteralParser } from "./string-literal-parse";

// FNS that take in a clean format battle and return the appropriate data
const FIELD_EXTRACT_FN_MAP: { [key: string]: (battle: BattleType) => any } = {
    "date": (battle) =>
        battle[COLUMNS_MAP.DATE_TIME]
            ? new Date(`${(battle[COLUMNS_MAP.DATE_TIME] as string).slice(0, 10)}T00:00:00`)
            : "N/A",
    "season": (battle) => battle[COLUMNS_MAP.SEASON_CODE],
    "is-first-pick": (battle) => (battle[COLUMNS_MAP.FIRST_PICK] ? 1 : 0),
    "is-win": (battle) => (battle[COLUMNS_MAP.WIN] ? 1 : 0),
    "victory-points": (battle) => battle[COLUMNS_MAP.P1_POINTS],
    "p1.picks": (battle) => battle[COLUMNS_MAP.P1_PICKS],
    "p2.picks": (battle) => battle[COLUMNS_MAP.P2_PICKS],
    "p1.prebans": (battle) => battle[COLUMNS_MAP.P1_PREBANS],
    "p2.prebans": (battle) => battle[COLUMNS_MAP.P2_PREBANS],
    "p1.postban": (battle) => battle[COLUMNS_MAP.P1_POSTBAN],
    "p2.postban": (battle) => battle[COLUMNS_MAP.P2_POSTBAN],
    "prebans": (battle) => [
        ...battle[COLUMNS_MAP.P1_PREBANS],
        ...battle[COLUMNS_MAP.P2_PREBANS],
    ],
    "p1.pick1": (battle) => battle[COLUMNS_MAP.P1_PICKS][0],
    "p1.pick2": (battle) => battle[COLUMNS_MAP.P1_PICKS][1],
    "p1.pick3": (battle) => battle[COLUMNS_MAP.P1_PICKS][2],
    "p1.pick4": (battle) => battle[COLUMNS_MAP.P1_PICKS][3],
    "p1.pick5": (battle) => battle[COLUMNS_MAP.P1_PICKS][4],
    "p2.pick1": (battle) => battle[COLUMNS_MAP.P2_PICKS][0],
    "p2.pick2": (battle) => battle[COLUMNS_MAP.P2_PICKS][1],
    "p2.pick3": (battle) => battle[COLUMNS_MAP.P2_PICKS][2],
    "p2.pick4": (battle) => battle[COLUMNS_MAP.P2_PICKS][3],
    "p2.pick5": (battle) => battle[COLUMNS_MAP.P2_PICKS][4],
    "p1.league": (battle) => battle[COLUMNS_MAP.P1_LEAGUE],
    "p2.league": (battle) => battle[COLUMNS_MAP.P2_LEAGUE],
    "p1.server": (battle) => battle[COLUMNS_MAP.P1_SERVER],
    "p2.server": (battle) => battle[COLUMNS_MAP.P2_SERVER],
    "p1.id": (battle) => Number(battle[COLUMNS_MAP.P1_ID]),
    "p2.id": (battle) => Number(battle[COLUMNS_MAP.P2_ID]),
    "p1.mvp": (battle) => battle[COLUMNS_MAP.P1_MVP],
    "p2.mvp": (battle) => battle[COLUMNS_MAP.P2_MVP],
    "is-first-turn": (battle) => battle[COLUMNS_MAP.FIRST_TURN],
    "first-turn-hero": (battle) => battle[COLUMNS_MAP.FIRST_TURN_HERO],
    "turns": (battle) => battle[COLUMNS_MAP.TURNS],
    "seconds": (battle) => battle[COLUMNS_MAP.SECONDS],
    "point-gain": (battle) => battle[COLUMNS_MAP.POINT_GAIN],
} as const;

const COLLECTION_FIELDS_SET = new Set([
    "p1.picks",
    "p2.picks",
    "p1.prebans",
    "p2.prebans",
    "prebans",
])

const BaseEltTypes = {
    FIELD: "FIELD",
    RANGE: "RANGE",
    SET: "SET",
    INT: "INT",
    DATE: "DATE",
    BOOL: "BOOL",
    STRING: "STRING",
} as const;

type BaseEltTypes = typeof BaseEltTypes[keyof typeof BaseEltTypes];

abstract class BaseElement {
    abstract rawString: string;
    abstract type: typeof BaseEltTypes[keyof typeof BaseEltTypes];
    abstract getData(): any;
    abstract extractData(battle: BattleType): any;
    abstract asString(prefix?: string): string;
}

class Field extends BaseElement {
    type = BaseEltTypes.FIELD;
    rawString: string;
    extractFn: (battle: BattleType) => any;

    constructor(str: string) {
        super();
        this.rawString = str;
        if (!FIELD_EXTRACT_FN_MAP[str]) throw new Error("Invalid field");
        this.extractFn = FIELD_EXTRACT_FN_MAP[str];
    }
    getData() { throw new Error("Not implemented for Field"); }
    extractData(battle: BattleType) {
        return this.extractFn(battle);
    }
    asString() { return `${this.rawString}`; }
}

abstract class Literal<T> extends BaseElement {
    rawString: string;
    abstract fmtString: string; // string for printing
    abstract data: T;
    abstract processString(str: string, ...args: any): T;
    constructor(str: string) {
        super();
        this.rawString = str;
    }
    getData() {
        return this.data;
    }
    extractData(battle: BattleType) { throw new Error("Not implemented for Literals"); }
    asString() { return `${this.fmtString}`; }
}

class StringLiteral extends Literal<string> {
    type = BaseEltTypes.STRING;
    fmtString: string;
    data: string;

    constructor(str: string, REFS: FilterReferences, parsers: StringLiteralParser[] = Object.values(STRING_LITERAL_PARSERS)) {
        super(str);
        str = Futils.trimSurroundingQuotes(str);
        this.data = this.processString(str, REFS, parsers);
        this.fmtString = this.data;
    }

    /**
     * Processes a string literal and returns the parsed string.
     * If the string could not be parsed, throws a ValidationError.
     * @param str the string to parse
     * @param REFS the FilterReferences to use for parsing
     * @param parsers an array of StringLiteralParser to use for parsing
     * @returns the parsed string
     * @throws ValidationError if the string could not be parsed
     */
    processString(str: string, REFS: FilterReferences, parsers: StringLiteralParser[]): string {
        const parsedString = parseStringLiteral(str, REFS, parsers);
        if (!parsedString) {
            const parsersStr = parsers.map((parser) => parser.parserType).join(", ");
            throw new Futils.ValidationError(
                `Invalid string literal: '${str}' ; clould not be parsed as a valid instance of any of the following: [${parsersStr}]`
            );
        }
        return parsedString;
    }
}

class IntLiteral extends Literal<number> {
    type = BaseEltTypes.INT;
    fmtString: string;
    data: number;
    constructor(str: string) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }

    processString(str: string) {
        const num = parseInt(str);
        if (isNaN(num)) {
            throw new Futils.ValidationError(`Invalid integer literal: '${str}'`);
        }
        return num;
    }
}

class BoolLiteral extends Literal<boolean> {
    type = BaseEltTypes.BOOL;
    fmtString: string;
    data: boolean;
    constructor(str: string) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str: string) {
        if (str === "true") return true;
        if (str === "false") return false;
        throw new Futils.ValidationError(`Invalid boolean literal: '${str}'`);
    }
}

class DateLiteral extends Literal<Date> {
    type = BaseEltTypes.DATE;
    fmtString: string;
    data: Date;
    constructor(str: string) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str: string) {
        return Futils.parseDate(str);
    }
}

type RangeEltTypes = Date | number;

class RangeData<T> {
    start: T;
    end: T;
    endInclusive: boolean;

    constructor(start: T, end: T, endInclusive: boolean) {
        this.start = start;
        this.end = end;
        this.endInclusive = endInclusive;
    }

    has(value: any): boolean {
        if (typeof value !== typeof this.start) return false;
        if (value < this.start) return false;
        if (value > this.end) return false;
        return value === this.end ? this.endInclusive : true;
    }

    includes(value: T): boolean {
        return this.has(value);
    }
}

type EltParser = (str: string) => Literal<any> | null;

const RANGE_ELT_PARSERS = [
    (str: string) => {
        return RegExps.DATE_LITERAL_RE.test(str)
            ? new DateLiteral(str)
            : null
    },
    (str: string) => {
        return RegExps.INT_LITERAL_RE.test(str)
            ? new IntLiteral(str)
            : null
    },
] as const;

function tryParseRange(
    start: string,
    end: string,
    endInclusive: boolean,
    parser: EltParser,
): RangeData<RangeEltTypes> | null {
    let parsedStart = parser(start);
    let parsedEnd = parser(end);
    if (parsedStart === null || parsedEnd === null)
        return null;
    return new RangeData(parsedStart.data, parsedEnd.data, endInclusive);
}

class RangeLiteral extends Literal<RangeData<RangeEltTypes>> {
    type = BaseEltTypes.RANGE;
    fmtString: string;
    data: RangeData<RangeEltTypes>;
    constructor(str: string, REFS: FilterReferences) {
        super(str);
        this.fmtString = str;
        this.data = this.processString(str, REFS);
    }

    processString(str: string, REFS: FilterReferences): RangeData<RangeEltTypes> {
        const split = str.split("...");
        const start = split[0];
        let endInclusive = split[1].charAt(0) === "=";
        const end = split[1].slice(endInclusive ? 1 : 0);

        for (const parser of RANGE_ELT_PARSERS) {
            const parsedRangeData = tryParseRange(start, end, endInclusive, parser);
            if (parsedRangeData !== null) {
                return parsedRangeData;
            }
        }
        throw new Futils.ValidationError(
            `Invalid range literal: '${str}' ; ranges must be homogenous and of the format x...y or x...=y for the types: [Date, Integer]`
        );
    }
}

export type SetEltTypes = string | number | Date;

const SET_ELT_PARSERS = [
    ...RANGE_ELT_PARSERS
] as const;

const SET_STRING_PARSER =
    (str: string, REFS: FilterReferences, parsers: StringLiteralParser[]) => {
        return RegExps.STRING_RE.test(str)
            ? new StringLiteral(str, REFS, parsers)
            : null
    }

class SetLiteral extends Literal<Set<SetEltTypes>> {
    type = BaseEltTypes.SET;
    fmtString: string;
    data: Set<SetEltTypes>;
    constructor(str: string, REFS: FilterReferences, parsers: StringLiteralParser[] = Object.values(STRING_LITERAL_PARSERS)) {
        super(str);
        this.fmtString = str;
        this.data = this.processString(str, REFS, parsers);
    }

    processString(str: string, REFS: FilterReferences, parsers: StringLiteralParser[]): Set<SetEltTypes> {
        const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
        const parsedSet = new Set<SetEltTypes>();
        for (const arg of args) {
            for (const parser of SET_ELT_PARSERS) {
                const parsedElt = parser(arg);
                if (parsedElt) {
                    console.log(`Parsed literal: ${arg} and got ${parsedElt}`);
                    parsedSet.add(parsedElt.data);
                    continue;
                }
            }
            const parsedElt = SET_STRING_PARSER(arg, REFS, parsers);
            if (parsedElt) {
                console.log(`Parsed string literal: ${arg} and got ${parsedElt}`);
                parsedSet.add(parsedElt.data);
                continue;
            }
            throw new Futils.ValidationError(
                `Invalid set element: '${str}' ; could not be parsed as a valid instance of any of the following types: [Date, Integer, String]`
            );
        }
        this.fmtString = `{${Array.from(parsedSet).join(", ")}}`;
        return parsedSet;
    }
}

function parseBaseElement(string: string, REFS: FilterReferences): BaseElement {
    console.log(`Parsing string: ${string}`);
    if (RegExps.STRING_LITERAL_RE.test(string)) {
        console.log(`Parsing as StringLiteral`);
        return new StringLiteral(string, REFS);
    } else if (RegExps.INT_LITERAL_RE.test(string)) {
        console.log("Parsing as IntLiteral");
        return new IntLiteral(string);
    } else if (RegExps.BOOL_LITERAL_RE.test(string)) {
        console.log("Parsing as BoolLiteral");
        return new BoolLiteral(string);
    } else if (RegExps.DATE_LITERAL_RE.test(string)) {
        console.log("Parsing as DateLiteral");
        return new DateLiteral(string);
    } else if (RegExps.RANGE_LITERAL_RE.test(string)) {
        console.log("Parsing as RangeLiteral");
        return new RangeLiteral(string, REFS);
    } else if (RegExps.SET_LITERAL_RE.test(string)) {
        console.log("Parsing as SetLiteral");
        return new SetLiteral(string, REFS);
    } else if (RegExps.SEASON_LITERAL_RE.test(string)) {
        console.log("Parsing as SeasonLiteral");
        return new StringLiteral(string, REFS, [STRING_LITERAL_PARSERS.Season]);
    } else if (RegExps.FIELD_WORD_LITERAL_RE.test(string)) {
        console.log("Parsing as Field");
        return new Field(string);
    }
    throw new Futils.ValidationError(`Invalid base element: '${string}' ; could not be parsed as a Field or Literal.`);
}

const BaseElements = {
    StringLiteral: StringLiteral,
    IntLiteral: IntLiteral,
    BoolLiteral: BoolLiteral,
    DateLiteral: DateLiteral,
    RangeLiteral: RangeLiteral,
    SetLiteral: SetLiteral,
    Field: Field,
    BaseEltTypes: BaseEltTypes,
    FIELD_EXTRACT_FN_MAP: FIELD_EXTRACT_FN_MAP,
    parseBaseElement: parseBaseElement,
    COLLECTION_FIELDS_SET: COLLECTION_FIELDS_SET
} as const;

export { BaseElements, BaseElement, RangeData };

