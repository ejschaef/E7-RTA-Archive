import { RangeData } from "./declared-data-types.ts";

type inOperatorSet = Set<any> | RangeData;

// must handle both regular sets and ranges
function inOperatorFn(a: string | Date, b: inOperatorSet): boolean {
	if (b instanceof Set) {
		return b.has(a);
	}
	// handle ranges
	else if (
		!Array.isArray(b)
	) {
		return a >= b.start && (b.endInclusive ? a <= b.end : a < b.end);
	}
	// handles fields that are arrays (ie p1.picks)
	return b.includes(a);
}

const OPERATOR_MAP: Record<string, (a: any, b: any) => boolean> = {
	">": (a, b) => a > b,
	"<": (a, b) => a < b,
	"=": (a, b) => a === b,
	"in": (a, b) => inOperatorFn(a, b),
	">=": (a, b) => a >= b,
	"<=": (a, b) => a <= b,
	"!=": (a, b) => a !== b,
	"!in": (a, b) => !inOperatorFn(a, b),
};

export { OPERATOR_MAP };