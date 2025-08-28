import { RangeData } from "./base-elements";


function collectionToString(collection: Collection<any>) {
    if (collection instanceof Set) {
        return Array.from(collection).join(", ");
    } else if (collection instanceof RangeData) {
        return `[${collection.start}, ${collection.end})`;
    } else {
        return collection.join(", ");
    }
}

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

type Collection<T> = Set<T> | T[] | RangeData<T>;

class InOperator extends Operator {
    type = OPERATOR_TYPES.IN;
    opStr: string;
    negate = false;

    constructor(negate = false) {
        super();
        this.negate = negate;
        this.opStr = this.negate ? "!in" : "in";
    }

    call<T>(a: T, b: Collection<T>): boolean {
        const contains = Array.isArray(b) ? b.includes(a) : b.has(a);
        // console.log(`IN OPER: Left: ${a}, Op: ${this.opStr}, Right: ${collectionToString(b)}; Result: ${contains}`);
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