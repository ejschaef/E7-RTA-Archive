import { TYPES } from "./declared-data-types.js";
import { PRINT_PREFIX } from "./filter-parse-references.js";
import Futils from "./filter-utils.js";
import { RegExps } from "../regex.js";
import { COLUMNS_MAP } from "../references.js";

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

// Direct functions resolve to a single base filter ; they cannot contain nested filters
class DirectFn extends Fn {
	toString(prefix = "") {
		return `${prefix}${this.str}`;
	}
}

function getHeroEquipment(heroName, picks, equipment) {
	// picks is either P1 Picks or P2 Picks and equipment is either P1 Equipment or P2 Equipment from a battle record
	for (let i = 0; i < picks.length; i++) {
		if (picks[i] === heroName) {
			return equipment[i];
		}
	}
	return null;
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
		const equipped = getHeroEquipment(this.hero, picks, equipment);
		console.log(
			`Got equipped: ${equipped}, hero: ${this.hero}, picks: ${JSON.stringify(
				picks
			)}, equipment: ${JSON.stringify(equipment)}`
		);
		if (!equipped) {
			return false;
		}
		return this.equipmentArr.every((eq) => equipped.includes(eq));
	}
}

function getHeroArtifact(heroName, picks, artifacts) {
	// picks is either P1 Picks or P2 Picks and artifacts is either P1 Artifacts or P2 Artifacts from a battle record
	for (let i = 0; i < picks.length; i++) {
		if (picks[i] === heroName) {
			return artifacts[i];
		}
	}
	return null;
}

class ArtifactFn extends DirectFn {
	static fromFilterStr(str, REFS) {
		const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
		if (!(args.length === 2)) {
			throw new Futils.SyntaxException(
				`Invalid artifact function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`
			);
		}
		if (!RegExps.anchorExp(RegExps.VALID_STRING_LITERAL_RE).test(args[0])) {
			throw new Futils.TypeException(
				`Invalid artifact function call ; first argument must be a valid string literal ; got: '${args[0]}' from str: ${str}`
			);
		}
		const artifactSetStr = RegExps.VALID_SET_RE.test(args[1])
			? args[1]
			: `{${args[1]}}`;
		let [hero, artifactSet] = [null, null];
		try {
			[hero, artifactSet] = [
				new TYPES.String(args[0], REFS, { types: ["hero"] }),
				new TYPES.Set(artifactSetStr, REFS, { types: ["artifact"] }),
			];
		} catch (e) {
			console.error(e);
			throw new Futils.TypeException(
				`Invalid type in artifact function call; got str: ${str} ; error: ${e}`
			);
		}
		const p1Flag = str.split(".")[0] === "p1";
		console.log(`Sending artifact fn args`, hero, artifactSet, p1Flag);
		return new ArtifactFn(hero, artifactSet, p1Flag);
	}

	constructor(hero, artifactSet, p1Flag) {
		console.log(`Received artifact fn args`, hero, artifactSet, p1Flag);
		super();
		this.hero = hero.data;
		this.artifactArr = [...artifactSet.data];
		this.str =
			(p1Flag ? "p1" : "p2") + `.artifact(${hero}, ${artifactSet.toString()})`;
		this.isPlayer1 = p1Flag;
	}

	call(battle) {
		const artifacts = this.isPlayer1
			? battle["P1 Artifacts"]
			: battle["P2 Artifacts"];
		const picks = this.isPlayer1 ? battle["P1 Picks"] : battle["P2 Picks"];
		const equippedArtifact = getHeroArtifact(this.hero, picks, artifacts);
		console.log(
			`Got equipped Artifact: ${equippedArtifact}, hero: ${
				this.hero
			}, picks: ${JSON.stringify(picks)}, artifacts: ${JSON.stringify(
				artifacts
			)}`
		);
		if (!equippedArtifact) {
			return false;
		}
		return this.artifactArr.some(
			(arti) => equippedArtifact.toLowerCase() === arti.toLowerCase()
		);
	}
}

// filters for battles where a hero as greater or equal starting CR as the passed integer value (indicating the percentage value)
class CombatReadinessGeqFn extends DirectFn {
	static fromFilterStr(str, REFS) {
		const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
		if (!(args.length === 2)) {
			throw new Futils.SyntaxException(
				`Invalid artifact function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`
			);
		}
		if (!RegExps.VALID_STRING_LITERAL_RE.test(args[0])) {
			throw new Futils.TypeException(
				`Invalid CR-GEQ function call ; first argument must be a valid string literal ; got: '${args[0]}' from str: ${str}`
			);
		} else if (!RegExps.VALID_INT_LITERAL_RE.test(args[1])) {
			throw new Futils.TypeException(
				`Invalid CR-GEQ function call ; second argument must be a valid integer literal ; got: '${args[1]}' from str: ${str}`
			);
		}
		const crMinValueStr = args[1];
		let [hero, crMinValue] = [null, null];
		try {
			[hero, crMinValue] = [
				new TYPES.String(args[0], REFS, { types: ["hero"] }),
				new TYPES.Int(crMinValueStr),
			];
		} catch (e) {
			throw new Futils.TypeException(
				`Invalid type in CR-GEQ function call; got str: ${str} ; error: ${e}`
			);
		}
		const p1Flag = str.split(".")[0] === "p1";
		console.log(`Sending CR-GEQ fn args`, hero, crMinValue, p1Flag);
		return new CombatReadinessGeqFn(hero, crMinValue, p1Flag);
	}

	constructor(hero, crMinValue, p1Flag) {
		console.log(`Received CR-GEQ fn args`, hero, crMinValue, p1Flag);
		super();
		this.hero = hero.data;
		this.crMinValue = crMinValue;
		this.str = (p1Flag ? "p1" : "p2") + `.CR-GEQ(${hero}, ${crMinValue})`;
		this.isPlayer1 = p1Flag;
	}

	call(battle) {
		const findFn = (entry, picks) =>
			picks.includes(entry[0]) &&
			entry[1] >= this.crMinValue &&
			entry[0] === this.hero;
		const result = this.isPlayer1
			? battle[COLUMNS_MAP.CR_BAR].find((entry) =>
					findFn(entry, battle[COLUMNS_MAP.P1_PICKS])
			  )
			: battle[COLUMNS_MAP.CR_BAR].find((entry) =>
					findFn(entry, battle[COLUMNS_MAP.P2_PICKS])
			  );
		console.log(
			`Got CR Result: ${result}, hero: ${this.hero}, minValue: ${this.crMinValue}`
		);
		return !!result;
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
	"p1.artifact": ArtifactFn,
	"p2.artifact": ArtifactFn,
	"p1.cr-geq": CombatReadinessGeqFn,
	"p2.cr-geq": CombatReadinessGeqFn,
};

export {
	FN_MAP,
	AND,
	OR,
	XOR,
	NOT,
	lastN,
	EquipmentFn,
	ArtifactFn,
	CombatReadinessGeqFn,
};
