// must handle both regular sets and ranges
function inOperatorFn(a, b) {
	if (b instanceof Set) {
		return b.has(a);
	}
	// handle ranges
	else if (
		typeof b === "object" &&
		b !== null &&
		!Array.isArray(b) &&
		["start", "end", "endInclusive", "type"].every((key) =>
			b.hasOwnProperty(key)
		)
	) {
		return a >= b.start && (b.endInclusive ? a <= b.end : a < b.end);
	}

	// handles fields that are arrays (ie p1.picks)
	else if (Array.isArray(b)) {
		return b.includes(a);
	} else {
		throw new Error(
			`Invalid match pattern for 'in' operators; got: '${a}' and '${JSON.stringify(
				b
			)}}' (${b.constructor.name})`
		);
	}
}

const OPERATOR_MAP = {
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