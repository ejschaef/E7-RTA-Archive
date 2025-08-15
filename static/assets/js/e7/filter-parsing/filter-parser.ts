import ArtifactManager from "../artifact-manager";
import HeroManager from "../hero-manager";
import { RegExps } from "../regex.ts";
import SeasonManager from "../season-manager";
import { FNS, FN_STR_MAP, FUNCTION_STRS, GlobalFilter, StandardFilter } from "./functions.ts";
import { ACCEPTED_CHARS, PRINT_PREFIX } from "./filter-parse-references";
import { FilterReferences } from "./filter-parse-references";
import Futils from "./filter-utils.ts";
import ClientCache from "../../cache-manager.ts";


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

export type Filters = Array<GlobalFilter | StandardFilter>;

function getEmptyFilters(): Filters {
    return [];
}

function validateClauseBody(filters: Filters, str: string): Array<StandardFilter> {
    for (const f of filters) {
        if (f instanceof GlobalFilter) {
            throw new Futils.SyntaxException(
                `Global filters not allowed in clause functions; got: ${f.asString()} from string: "${str}"`
            );
        }
    }
    return filters.filter((f) => f instanceof StandardFilter);
}

function sortFilters(filters: Filters) {
    const globalFilters = [];
    const standardFilters = [];
    for (const f of filters) {
        if (f instanceof GlobalFilter) {
            globalFilters.push(f);
        } else {
            standardFilters.push(f);
        }
    }
    return [...globalFilters, ...standardFilters];
}

class FilterParser {
    _filters: Filters;
    rawString: string;
    preParsedString: string;
    references: FilterReferences;

    constructor() {
        this._filters = getEmptyFilters();
        this.rawString = "";
        this.preParsedString = "";
        this.references = {
            HM: null,
            ARTIFACT_LOWERCASE_STRINGS_MAP: {},
            SEASON_DETAILS: [],
        };
    }

    async addReferences(HM: any | null = null) {
        HM = HM || (await HeroManager.getHeroManager());
        if (HM === null) throw new Error("Hero Manager could not be retrieved to parse filters.");
        const seasonDetails = await SeasonManager.getSeasonDetails();
        if (seasonDetails === null) throw new Error("Season Details could not be retrieved to parse filters.");
        const ARTIFACT_LOWERCASE_STRINGS_MAP = await ArtifactManager.getArtifactLowercaseNameMap();
        this.references = {
            HM: HM,
            ARTIFACT_LOWERCASE_STRINGS_MAP: ARTIFACT_LOWERCASE_STRINGS_MAP,
            SEASON_DETAILS: seasonDetails,
        };
    }

    getFilters(): Filters {
        return sortFilters(this._filters);
    }

    asString(): string {
        const prefix = PRINT_PREFIX;
        return `[\n${this._filters.map((f) => f.asString(prefix)).join(";\n")};\n]`;
    }

    static async getFiltersFromCache(HM: any | null = null): Promise<Filters> {
        const filterStr = await ClientCache.get(ClientCache.Keys.FILTER_STR);
        if (filterStr === null) return [];
        let parser = await this.fromFilterStr(filterStr, HM);
        return parser.getFilters();
    }

    static async fromFilterStr(filterStr: string, HM: any | null = null) {
        const parser = new FilterParser();
        parser.rawString = filterStr;
        await parser.addReferences(HM);
        parser.preParsedString = preParse(filterStr);
        parser._filters = parser.parse(parser.preParsedString);
        return parser;
    }

    parseList(filterStrs: string[]): Filters {
        return filterStrs.reduce((acc, str) => {
            acc.push(...this.parse(str));
            return acc;
        }, getEmptyFilters());
    }

    parse(str: string): Filters {
        str = str.trim();
        if (str === "") return getEmptyFilters();
        if (str.includes(";")) {
            const filterStrs = str.split(";");
            return this.parseList(filterStrs);
        }

        const fnStr = str.split("(")[0].replace(/p[1-2]\./i, ""); // 
        const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
        switch (fnStr) {
            case FUNCTION_STRS.AND:
            case FUNCTION_STRS.OR:
            case FUNCTION_STRS.NOT:
            case FUNCTION_STRS.XOR:
                const filters = validateClauseBody(this.parseList(args), str);
                return [new FN_STR_MAP[fnStr](...filters)];
            case FUNCTION_STRS.LAST_N:
                return [new FNS.LAST_N(str)]
            case FUNCTION_STRS.EQUIPMENT:
            case FUNCTION_STRS.ARTIFACT:
            case FUNCTION_STRS.CR:
                return [new FN_STR_MAP[fnStr](str, this.references)];
            default:
                if (RegExps.FUNCTION_CALL_RE.test(str)) {
                    throw new Futils.SyntaxException(`Filter String is not a valid function call but a parenthese block was detected; got: ${str}`);
                }
                return [new FNS.BASE_FILTER(str, this.references)];
        }
    }
}

export { FilterParser }