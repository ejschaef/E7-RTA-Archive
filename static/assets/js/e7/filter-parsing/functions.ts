import { strArrToCountMap } from "../../utils";
import { BattleType, COLUMNS_MAP } from "../references";
import { BaseElement, BaseElements } from "./base-elements";
import { Operator, CompareOperator, parseOperator, COMPARISON_OPERATORS, InOperator } from "./operators";
import { PRINT_PREFIX } from "./filter-parse-references";
import { FilterReferences } from "./filter-parse-references";
import Futils from "./filter-utils";
import { STRING_LITERAL_PARSERS } from "./string-literal-parse";

const FUNCTION_STRS = {
    AND: "and",
    OR: "or",
    XOR: "xor",
    NOT: "not",
    LAST_N: "last-n",
    EQUIPMENT: "equipment",
    ARTIFACT: "artifact",
    CR: "cr",
    BASE_FILTER: "base-filter",
} as const;

const FN_TYPES = {
    CLAUSE_FN: "CLAUSE_FN",
    HERO_LIST_FN: "HERO_LIST_FN",
    GLOBAL_FN: "GLOBAL_FN",
    BASE_FILTER: "BASE_FILTER",
} as const;

const CR_FN_TYPES = {
    GEQ : "GEQ",
    LEQ : "LEQ",
    LT : "LT",
    GT : "GT",
} as const;


abstract class Fn {
    abstract fnName: typeof FUNCTION_STRS[keyof typeof FUNCTION_STRS] | null;
    abstract fnType: typeof FN_TYPES[keyof typeof FN_TYPES];
    abstract asString(prefix: string): string;

    constructor(...args: any[]) {

    }
}  

abstract class StandardFilter extends Fn {
    abstract call(b: BattleType): boolean;
}

abstract class ClauseFn extends StandardFilter {
    abstract fnName: typeof FUNCTION_STRS[keyof typeof FUNCTION_STRS];
    fnType = FN_TYPES.CLAUSE_FN;
    fns: StandardFilter[] = [];

    constructor(...fns: StandardFilter[]) {
        super();
        this.fns = fns;
    }

    asString(prefix: string = ""): string {
        let strBody = "";
        const newPrefix = prefix + PRINT_PREFIX;
        this.fns.forEach(
            (fn) => (strBody += `${fn.asString(newPrefix)},\n`)
        );
        console.log("Clause Fn asString got strBody:", strBody);
        return `${prefix}${this.fnName}(\n${strBody.trimEnd()}\n${prefix})`;
    }
}

class AND extends ClauseFn {
    fnName = FUNCTION_STRS.AND;
    fnType = FN_TYPES.CLAUSE_FN;

    call(battle: BattleType): boolean {
        return this.fns.every((fn) => fn.call(battle));
    }
}

class OR extends ClauseFn {
    fnName = FUNCTION_STRS.OR;
    fnType = FN_TYPES.CLAUSE_FN;

    call(battle: BattleType): boolean {
        return this.fns.some((fn) => fn.call(battle));
    }
}

class XOR extends ClauseFn {
    fnName = FUNCTION_STRS.XOR;
    fnType = FN_TYPES.CLAUSE_FN;

    call(battle: BattleType): boolean {
        let result = false;
        for (let fn of this.fns) {
            result = (!result && fn.call(battle)) || (result && !fn.call(battle));
        }
        return result;
    }
}

class NOT extends ClauseFn {
    fnName = FUNCTION_STRS.NOT;
    fnType = FN_TYPES.CLAUSE_FN;

    constructor(...fns: StandardFilter[]) {
        super(...fns);
        if (this.fns.length !== 1) {
            throw new Futils.SyntaxException(
                `Invalid NOT function call ; accepts exactly 1 argument ; got: [${this.fns}]`
            );
        }
    }

    call(battle: BattleType): boolean {
        return !this.fns[0].call(battle);
    }
}

abstract class HeroListFn extends StandardFilter {
    abstract fnName: typeof FUNCTION_STRS[keyof typeof FUNCTION_STRS];
    abstract isPlayer1: boolean;
    fnType = FN_TYPES.HERO_LIST_FN;
    abstract heroName: string;
    abstract targetField: typeof BaseElements.FIELD_EXTRACT_FN_MAP[keyof typeof BaseElements.FIELD_EXTRACT_FN_MAP];
    abstract argFmtString: string;

    getHeroes(battle: BattleType): string[] {
        return this.isPlayer1 ? battle[COLUMNS_MAP.P1_PICKS] : battle[COLUMNS_MAP.P2_PICKS];
    }

    asString(prefix: string = ""): string {
        return `${prefix}${this.fnName}(${this.argFmtString})`;
    }
}

class CRFn extends HeroListFn {
    fnName = FUNCTION_STRS.CR;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName: string;
    crThreshold: number = 0;
    operator: CompareOperator;
    targetField: (battle: BattleType) => any;
    isPlayer1: boolean = false;
    argFmtString: string;

    constructor(str: string, REFS: FilterReferences) {
        super();
        const splitChar = str.includes(",") ? "," : " ";
        const args = Futils.tokenizeWithNestedEnclosures(str, splitChar, 1, true);
        if (args.length !== 3) {
            throw new Futils.SyntaxException(
                `Invalid CR function call ; accepts exactly 3 arguments ; got: [${args}] from str: ${str}`
            )
        }
        const threshold = parseInt(args[2]);
        if (isNaN(threshold)) {
            throw new Futils.TypeException(
                `Invalid CR function call ; third argument must be a valid integer literal ; got: '${args[2]}' from str: ${str}`
            );
        }
        const operator = parseOperator(args[1]);
        if (!(operator instanceof CompareOperator) ) {
            throw new Futils.TypeException(
                `Invalid CR function call ; second argument must be a valid comparison operator ; got: '${args[1]}' from str: ${str}`);
        }
        this.heroName = new BaseElements.StringLiteral(args[0], REFS, [STRING_LITERAL_PARSERS.Hero]).data;
        this.crThreshold = threshold;
        this.operator = operator;
        this.isPlayer1 = str.includes("p1.");
        this.targetField = (battle: BattleType) => battle[COLUMNS_MAP.CR_BAR];
        this.argFmtString = `${this.heroName} ${this.operator.opStr} ${this.crThreshold}`
    }

    call(battle: BattleType): boolean {
        const heroes = this.getHeroes(battle);
        const crBar = this.targetField(battle);
        const heroCr = crBar.find((entry: [string, number]) => entry[0] === this.heroName);
        if (!heroCr) {
            return false;
        } else if (!heroes.includes(this.heroName)) {
            return false;
        }
        return this.operator.call(heroCr, this.crThreshold);
    }
}


/**
 * Returns true if all the equipment counts in target are matched or exceeded in the instance.
 * In other words, target is a subset of instance.
 * If a hero has additional equipment, the function will still return true
 * @param target the target object to check against
 * @param instance the object to check
 * @returns boolean indicating if all the equipment counts in target are present in instance
 */
function validateEquipmentCounts(target: Record<string, number>, instance: Record<string, number>): boolean {
    for (const key in target) {
        if (target[key] > (instance[key] || 0)) {
            return false;
        }
    }
    return true;
}

// TODO: consolidate code with ArtifactFn where possible to reduce duplication
class EquipmentFn extends HeroListFn {
    fnName = FUNCTION_STRS.EQUIPMENT;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName: string;
    targetEquipCounts: Record<string, number>;
    isPlayer1: boolean = false;
    argFmtString: string;
    targetField: (battle: BattleType) => any;

    constructor(str: string, REFS: FilterReferences) {
        super();
        const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 2) {
            throw new Futils.SyntaxException(
                `Invalid equipment function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`
            )
        }
        const equipmentSetStr = args[1].includes("{") ? args[1] : `{${args[1]}}`;
        let equipmentList = Futils.tokenizeWithNestedEnclosures(equipmentSetStr, ",", 1, true);
        equipmentList = equipmentList.map((equip) => new BaseElements.StringLiteral(equip, REFS, [STRING_LITERAL_PARSERS.Equipment]).data);
        this.targetEquipCounts = strArrToCountMap(equipmentList);
        this.heroName = new BaseElements.StringLiteral(args[0], REFS, [STRING_LITERAL_PARSERS.Hero]).data;
        this.isPlayer1 = str.includes("p1.");
        this.argFmtString = `${this.heroName}, {${equipmentList.join(",")}}`;
        this.targetField = (battle: BattleType) => this.isPlayer1 ? battle[COLUMNS_MAP.P1_EQUIPMENT] : battle[COLUMNS_MAP.P2_EQUIPMENT];
    }

    call(battle: BattleType): boolean {
        const heroes = this.getHeroes(battle);
        const heroEq: Array<string[]> = this.targetField(battle)
        for (let i=0; i < heroes.length; i++) {
            if (heroes[i] === this.heroName) {
                const counts = strArrToCountMap(heroEq[i]);
                return validateEquipmentCounts(this.targetEquipCounts, counts);
            }
        }
        return false;
    }
}

class ArtifactFn extends HeroListFn {
    fnName = FUNCTION_STRS.ARTIFACT;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName: string;
    targetArtifacts: string[];
    isPlayer1: boolean = false;
    argFmtString: string;
    targetField: (battle: BattleType) => any;

    constructor(str: string, REFS: FilterReferences) {
        super();
        const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 2) {
            throw new Futils.SyntaxException(
                `Invalid artifact function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`
            )
        }
        const artifactSetStr = args[1].includes("{") ? args[1] : `{${args[1]}}`;
        let artifactList = Futils.tokenizeWithNestedEnclosures(artifactSetStr, ",", 1, true);
        artifactList = artifactList.map((artifact) => new BaseElements.StringLiteral(artifact, REFS, [STRING_LITERAL_PARSERS.Artifact]).data);
        this.targetArtifacts = artifactList;
        this.heroName = new BaseElements.StringLiteral(args[0], REFS, [STRING_LITERAL_PARSERS.Hero]).data;
        this.isPlayer1 = str.includes("p1.");
        this.argFmtString = `${this.heroName}, {${artifactList.join(", ")}}`;
        this.targetField = (battle: BattleType) => this.isPlayer1 ? battle[COLUMNS_MAP.P1_ARTIFACTS] : battle[COLUMNS_MAP.P2_ARTIFACTS];
    }

    call(battle: BattleType): boolean {
        const heroes = this.getHeroes(battle);
        const heroArtifacts: Array<string[]> = this.targetField(battle);
        for (let i=0; i < heroes.length; i++) {
            if (heroes[i] === this.heroName) {
                return this.targetArtifacts.some((artifact) => heroArtifacts[i].includes(artifact));
            }
        }
        return false;
    }
}

abstract class GlobalFilter extends Fn {
    abstract fnName: typeof FUNCTION_STRS[keyof typeof FUNCTION_STRS]
    fnType = FN_TYPES.GLOBAL_FN
    abstract argFmtString: string
    abstract call(battles: BattleType[]): BattleType[]

    asString(prefix: string = ""): string {
        return `${prefix}${this.fnName}(${this.argFmtString})`;
    }
}

class LastNFn extends GlobalFilter {
    fnName = FUNCTION_STRS.LAST_N;
    fnType = FN_TYPES.GLOBAL_FN;
    argFmtString: string;
    n: number;

    constructor(str: string) {
        super();
        const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 1) {
            throw new Futils.SyntaxException(
                `Invalid last-n function call ; accepts exactly 1 argument ; got: [${args}] from str: ${str}`
            )
        }
        this.n = new BaseElements.IntLiteral(args[0]).data;
        this.argFmtString = `${this.n}`;
    }

    call(battles: BattleType[]): BattleType[] {
        return battles.slice(-this.n);
    }
}


function isCollection(baseElt: BaseElement): boolean {
    return BaseElements.COLLECTION_FIELDS_SET.has(baseElt.rawString)
}

function validateBaseFilterTypes(left: BaseElement, op: Operator, right: BaseElement): boolean {
    const str = `${left.asString()} ${op.opStr} ${right.asString()}`
    if (left instanceof BaseElements.Field && right instanceof BaseElements.Field) {
        throw new Futils.ValidationError(
            `Invalid base filter; fields cannot be compared with other fields ; got string: [${str}]`
        )
    } else if (!(left.type === BaseElements.BaseEltTypes.FIELD) && !(right.type === BaseElements.BaseEltTypes.FIELD)) {
        throw new Futils.ValidationError(
            `Invalid base filter; every base filter must have at least one field ; got string: [${str}]`
        )
    } else if (op instanceof InOperator && !(isCollection(right) || right instanceof BaseElements.RangeLiteral || right instanceof BaseElements.SetLiteral)) {
        throw new Futils.ValidationError(
            `Invalid base filter; 'in' operators can only be used with Ranges, Sets, or Fields that correspond to sets like 'p1.picks' ; got string: [${str}]`
        )
    }
    return true;
}

class BaseFilter extends StandardFilter {
    fnType = FN_TYPES.BASE_FILTER;
    fnName = FUNCTION_STRS.BASE_FILTER;
    fmtString: string;
    fn: (b: BattleType) => boolean;
    constructor(str: string, REFS: FilterReferences) {
        super();
        const tokens = Futils.tokenizeWithNestedEnclosures(str, " ", 0, true);
        if (tokens.length !== 3) {
            throw new Futils.SyntaxException(
                `Invalid base filter; filters must have 3 tokens and be of the form: ['X', operator, 'Y']; got: [${tokens}] tokens from str: ${str}`
            )
        }
        let [leftStr, opStr, rightStr] = tokens;
        console.log(`PARSING BASE FILTER: Left: ${leftStr}, Op: ${opStr}, Right: ${rightStr}`);
        const operator = parseOperator(opStr);
        const left = BaseElements.parseBaseElement(leftStr, REFS);
        const right = BaseElements.parseBaseElement(rightStr, REFS);
        console.log(`PARSED BASE FILTER: Left: ${left.asString()}, Op: ${opStr}, Right: ${right.asString()}`);
        validateBaseFilterTypes(left, operator, right);
        if (left instanceof BaseElements.Field && !(right instanceof BaseElements.Field)) {
            this.fn = (battle: BattleType) => operator.call(left.extractData(battle), right.getData());
        } else if (!(left instanceof BaseElements.Field) && right instanceof BaseElements.Field) {
            this.fn = (battle: BattleType) => operator.call(left.getData(), right.extractData(battle));
        } else {
            throw new Futils.ValidationError(
                "Invalid base filter; filters must contain a Field and a Literal; got: " + str
            )
        }
        this.fmtString = `${left.asString()} ${opStr} ${right.asString()}`;
    }

    call(b: BattleType): boolean {
        return this.fn(b);
    }

    asString(prefix: string = ""): string {
        return `${prefix}${this.fmtString}`;
    }
}

const FN_STR_MAP = {
    [FUNCTION_STRS.BASE_FILTER]: BaseFilter,
    [FUNCTION_STRS.AND]: AND,
    [FUNCTION_STRS.OR]: OR,
    [FUNCTION_STRS.NOT]: NOT,
    [FUNCTION_STRS.XOR]: XOR,
    [FUNCTION_STRS.LAST_N]: LastNFn,
    [FUNCTION_STRS.EQUIPMENT]: EquipmentFn,
    [FUNCTION_STRS.ARTIFACT]: ArtifactFn,
    [FUNCTION_STRS.CR]: CRFn,
} as const;

const FNS = {
    AND: AND,
    OR: OR,
    NOT: NOT,
    XOR: XOR,
    LAST_N: LastNFn,
    EQUIPMENT: EquipmentFn,
    ARTIFACT: ArtifactFn,
    CR: CRFn,
    BASE_FILTER: BaseFilter,
}


export { StandardFilter, GlobalFilter, FNS, FN_STR_MAP, FUNCTION_STRS };