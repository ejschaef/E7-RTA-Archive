import { TYPES } from "./declared-data-types.js";
import { PRINT_PREFIX } from "./filter-parse-references.js";
import Futils from "../filter-utils.js";
import { RegExps } from "../regex.js";

class Fn {
	constructor() {}

	call(battle) {
		throw new Error(
			`Base class ${this.constructor.name} does not implement the 'call' method. Implement this method in a subclass.`
		);
	}
}

class globalFilterFn extends Fn {
	constructor() {
		super();
	}

	toString(prefix = "") {
		return `${prefix}${this.str}`;
	}
}

class lastN extends globalFilterFn {
	constructor(args) {
		super();
		this.name = "last-N";
		if (args.length !== 1) {
			throw new Futils.SyntaxException(
				`${this.name} expects 1 argument, got ${args.length}`
			);
		}
		const num = Number(args[0]);
		if (!Number.isInteger(num)) {
			throw new Futils.TypeException(
				`${this.name} expects an integer argument, could not parse '${args[0]}' as integer`
			);
		}
		this.str = `${this.name}(${num})`;
		this.n = num;
	}

	call(battles) {
		battles.sort((b1, b2) => b1["Seq Num"] - b2["Seq Num"]);
		return battles.slice(-this.n);
	}
}

class ClauseFn extends Fn {
	constructor(fns) {
		super();
		this.fns = fns;
		console.log("Clause Fn constructor got fns:", fns);
	}

	toString(prefix = "") {
		let output = "";
		const newPrefix = prefix + PRINT_PREFIX;
		this.fns.localFilters.forEach(
			(fn) => (output += `${fn.toString(newPrefix)},\n`)
		);
		console.log("Clause Fn toString got output:", output);
		return `${prefix}${this.str}(\n${output.trimEnd()}\n${prefix})`;
	}
}

class AND extends ClauseFn {
	constructor(fns) {
		super(fns);
		this.str = "AND";
	}
	call(battle) {
		return this.fns.localFilters.every((fn) => fn.call(battle));
	}
}

class OR extends ClauseFn {
	constructor(fns) {
		super(fns);
		this.str = "OR";
	}
	call(battle) {
		return this.fns.localFilters.some((fn) => {
			return fn.call(battle);
		});
	}
}

class XOR extends ClauseFn {
	constructor(fns) {
		super(fns);
		this.str = "XOR";
	}
	call(battle) {
		let result = false;
		// Cascading XOR
		for (let fn of this.fns.localFilters) {
			result = (!result && fn.call(battle)) || (result && !fn.call(battle));
		}
		return result;
	}
}

class NOT extends ClauseFn {
	constructor(fns) {
		super(fns);
		this.str = "NOT";
	}
	call(battle) {
		return !this.fns.localFilters[0].call(battle);
	}
}

function get_hero_equipment(heroName, picks, equipment) {
	// picks is either P1 Picks or P2 Picks and equipment is either P1 Equipment or P2 Equipment from a battle record
	for (let i = 0; i < picks.length; i++) {
		if (picks[i] === heroName) {
			return equipment[i];
		}
	}
	return null;
}

// Direct functions resolve to a single base filter ; they cannot contain nested filters
class DirectFn extends Fn {
	toString(prefix = "") {
		return `${prefix}${this.str}`;
	}
}

class EquipmentFn extends DirectFn {
	static fromFilterStr(str, REFS) {
		const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
		if (!(args.length === 2)) {
			throw new Futils.SyntaxException(
				`Invalid equipment function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`
			);
		}
		if (!RegExps.VALID_STRING_LITERAL_RE.test(args[0])) {
			throw new Futils.TypeException(
				`Invalid equipment function call ; first argument must be a valid string literal ; got: '${args[0]}' from str: ${str}`
			);
		}
		const equipSetStr = /^\{[",'a-z\s]*\}$/i.test(args[1])
			? args[1]
			: `{${args[1]}}`;
		let [hero, equipmentSet] = [null, null];
		try {
			[hero, equipmentSet] = [
				new TYPES.String(args[0], REFS, { types: ["hero"] }),
				new TYPES.Set(equipSetStr, REFS, { types: ["equipment"] }),
			];
		} catch (e) {
			throw new Futils.TypeException(
				`Invalid type in equipment function call; got str: ${str} ; error: ${e}`
			);
		}
		const p1Flag = str.split(".")[0] === "p1";
		console.log(`Sending equipment fn args`, hero, equipmentSet, p1Flag);
		return new EquipmentFn(hero, equipmentSet, p1Flag);
	}

	constructor(hero, equipmentSet, p1Flag) {
		console.log(`Received equipment fn args`, hero, equipmentSet, p1Flag);
		super();
		this.hero = hero.data;
		this.equipmentArr = [...equipmentSet.data];
		this.str =
			(p1Flag ? "p1" : "p2") +
			`.equipment(${hero}, ${equipmentSet.toString()})`;
		this.isPlayer1 = p1Flag;
	}

	call(battle) {
		const equipment = this.isPlayer1
			? battle["P1 Equipment"]
			: battle["P2 Equipment"];
		const picks = this.isPlayer1 ? battle["P1 Picks"] : battle["P2 Picks"];
		const equipped = get_hero_equipment(this.hero, picks, equipment);
		console.log(
			`Got equipped: ${equipped}, hero: ${this.hero.name}, picks: ${picks}, equipment: ${equipment}`
		);
		if (!equipped) {
			return false;
		}
		return this.equipmentArr.every((eq) => equipped.includes(eq));
	}
}

const FN_MAP = {
	and: AND,
	or: OR,
	xor: XOR,
	not: NOT,
	"last-n": lastN,
	"p1.equipment": EquipmentFn,
	"p2.equipment": EquipmentFn,
};

export { FN_MAP, AND, OR, XOR, NOT, lastN, EquipmentFn };