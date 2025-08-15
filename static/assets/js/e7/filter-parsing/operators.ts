import { RangeData } from "./base-elements";

const COMPARISON_OPERATORS: Record<string, (a: any, b: any) => boolean> = {
    ">": (a, b) => a > b,
    "<": (a, b) => a < b,
    "=": (a, b) => a === b,
    ">=": (a, b) => a >= b,
    "<=": (a, b) => a <= b,
    "!=": (a, b) => a !== b,
} as const;

const OPERATOR_TYPES = {
	IN: "in",
	COMPARE: "compare",
} as const;


abstract class Operator {
    abstract type: typeof OPERATOR_TYPES[keyof typeof OPERATOR_TYPES]
    abstract opStr: string;
    abstract call(a: any, b: any): boolean
}

type Collection = Set<any> | any[] | RangeData<any>;

class InOperator extends Operator {
    type = OPERATOR_TYPES.IN;
    opStr: string;
    negate = false;

    constructor(negate = false) {
        super();
        this.negate = negate;
        this.opStr = this.negate ? "!in" : "in";
    }

    call(a: any, b: Collection): boolean {
        const contains = Array.isArray(b) ? b.includes(a) : b.has(a);
        return this.negate ? !contains : contains
    }
}

class CompareOperator extends Operator {
    type = OPERATOR_TYPES.COMPARE
    opStr: string
    compareFn: (a: any, b: any) => boolean

    constructor(opStr: string) {
        super();
        this.opStr = opStr;
        this.compareFn = COMPARISON_OPERATORS[opStr];
        if (!this.compareFn) {
            throw new Error(`Unknown operator: ${opStr}`);
        }
    }

    call(a: any, b: any): boolean {
        return this.compareFn(a, b);
    }
}

function parseOperator(opStr: string): Operator {
    switch (opStr) {
        case "in" : return new InOperator();
        case "!in" : return new InOperator(true);
        default: return new CompareOperator(opStr);
    }
}

export { COMPARISON_OPERATORS, parseOperator, Operator, CompareOperator, InOperator };