import { TYPES } from "./declared-data-types.ts";
import { PRINT_PREFIX } from "./filter-parse-references.ts";
import Futils from "./filter-utils.ts";
import { RegExps } from "../regex.js";
import { COLUMNS_MAP, BattleType } from "../references.ts";
import { arrToCountMap } from "../../utils.ts";
import { FilterContainer, FilterRefs } from "./filter-ts-types.ts";

class Fn {
	constructor() {}

	call(_battle: BattleType | BattleType[]): any {
		console.error(
			`Base class ${this.constructor.name} does not implement the 'call' method. Implement this method in a subclass.`
		);
		return false;
	}
}

class GlobalFilterFn extends Fn {
	str: string;

	constructor() {
		super();
		this.str = "";
	}

	asString(prefix = "") {
		return `${prefix}${this.str}`;
	}
}

class lastN extends GlobalFilterFn {
	name: string;
	n: number;
	constructor(args: string[]) {
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

	call(battles: BattleType[]) {
		battles.sort((b1, b2) => b1[COLUMNS_MAP.DATE_TIME].localeCompare(b2[COLUMNS_MAP.DATE_TIME]));
		return battles.slice(-this.n);
	}
}

class ClauseFn extends Fn {
	filterContainer: FilterContainer;
	str: string;
	constructor(filterContainer: FilterContainer) {
		super();
		this.filterContainer = filterContainer;
		console.log("Clause Fn constructor got filterContainer:", filterContainer);
		this.str = "Generic ClauseFn";
	}

	asString(prefix = "") {
		let output = "";
		const newPrefix = prefix + PRINT_PREFIX;
		this.filterContainer.localFilters.forEach(
			(fn) => (output += `${fn.asString(newPrefix)},\n`)
		);
		console.log("Clause Fn asString got output:", output);
		return `${prefix}${this.str}(\n${output.trimEnd()}\n${prefix})`;
	}
}

class AND extends ClauseFn {
	str: string;
	constructor(filterContainer: FilterContainer) {
		super(filterContainer);
		this.str = "AND";
	}
	call(battle: BattleType) {
		return this.filterContainer.localFilters.every((fn) => fn.call(battle));
	}
}

class OR extends ClauseFn {
	str: string;
	constructor(filterContainer: FilterContainer) {
		super(filterContainer);
		this.str = "OR";
	}
	call(battle: BattleType) {
		return this.filterContainer.localFilters.some((fn) => {
			return fn.call(battle);
		});
	}
}

class XOR extends ClauseFn {
	str: string;
	constructor(filterContainer: FilterContainer) {
		super(filterContainer);
		this.str = "XOR";
	}
	call(battle: BattleType) {
		let result = false;
		// Cascading XOR
		for (let fn of this.filterContainer.localFilters) {
			result = (!result && fn.call(battle)) || (result && !fn.call(battle));
		}
		return result;
	}
}

class NOT extends ClauseFn {
	str: string;
	constructor(filterContainer: FilterContainer) {
		super(filterContainer);
		this.str = "NOT";
	}
	call(battle: BattleType) {
		return !this.filterContainer.localFilters[0].call(battle);
	}
}

// Direct functions resolve to a single base filter ; they cannot contain nested filterContainer
class DirectFn extends Fn {
	str: string;
	constructor() {
		super();
		this.str = "Generic DirectFn";
	}

	asString(prefix = "") {
		return `${prefix}${this.str}`;
	}
}

function getHeroEquipment(heroName: string, picks: string[], equipment: Array<Array<string>>): string[] | null {
	// picks is either P1 Picks or P2 Picks and equipment is either P1 Equipment or P2 Equipment from a battle record
	for (let i = 0; i < picks.length; i++) {
		if (picks[i] === heroName) {
			return equipment[i];
		}
	}
	return null;
}

class EquipmentFn extends DirectFn {
	hero: string;
	equipmentCounts: { [x: string]: number };
	isPlayer1: boolean;

	static fromFilterStr(str: string, REFS: FilterRefs) {
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
		let hero: TYPES["String"], equipmentSet: TYPES["Set"];
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

	constructor(hero: TYPES["String"], equipmentSet: TYPES["Set"], p1Flag: boolean) {
		console.log(`Received equipment fn args`, hero, equipmentSet, p1Flag);
		super();
		this.hero = hero.data;
		this.equipmentCounts = arrToCountMap<string | Date>(equipmentSet.list);
		this.str =
			(p1Flag ? "p1" : "p2") +
			`.equipment(${hero.asString()}, ${equipmentSet.asString()})`;
		this.isPlayer1 = p1Flag;
	}

	call(battle: BattleType) {
		const equipment = this.isPlayer1
			? battle["P1 Equipment"]
			: battle["P2 Equipment"];
		const picks = this.isPlayer1 ? battle["P1 Picks"] : battle["P2 Picks"];
		const equipped = getHeroEquipment(this.hero, picks, equipment);
		if (!equipped) {
			return false;
		}
		const equippedCounts: { [x: string]: number } = arrToCountMap<string>(equipped);
		return Object.entries(this.equipmentCounts).every(
			([eq, count]) => equippedCounts[eq] === count
		);
	}
}

function getHeroArtifact(heroName: string, picks: string[], artifacts: string[]): string | null {
	// picks is either P1 Picks or P2 Picks and artifacts is either P1 Artifacts or P2 Artifacts from a battle record
	for (let i = 0; i < picks.length; i++) {
		if (picks[i] === heroName) {
			return artifacts[i];
		}
	}
	return null;
}

class ArtifactFn extends DirectFn {
	hero: string;
	artifactArr: string[];
	isPlayer1: boolean;
	static fromFilterStr(str: string, REFS: FilterRefs) {
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
		let hero: TYPES["String"], artifactSet: TYPES["Set"];
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

	constructor(hero: TYPES["String"], artifactSet: TYPES["Set"], p1Flag: boolean) {
		console.log(`Received artifact fn args`, hero, artifactSet, p1Flag);
		super();
		this.hero = hero.data;
		this.artifactArr = [...artifactSet.data];
		this.str =
			(p1Flag ? "p1" : "p2") +
			`.artifact(${hero.asString()}, ${artifactSet.asString()})`;
		this.isPlayer1 = p1Flag;
	}

	call(battle: BattleType) {
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

// filterContainer for battles where a hero as greater or equal starting CR as the passed integer value (indicating the percentage value)
class CombatReadinessGeqFn extends DirectFn {
	hero: string;
	crThreshold: number;
	isPlayer1: boolean;

	static fromFilterStr(str: string, REFS: FilterRefs) {
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
		const crThresholdStr = args[1];
		let hero: TYPES["String"], crThreshold: TYPES["Int"];
		try {
			[hero, crThreshold] = [
				new TYPES.String(args[0], REFS, { types: ["hero"] }),
				new TYPES.Int(crThresholdStr),
			];
		} catch (e) {
			throw new Futils.TypeException(
				`Invalid type in CR-GEQ function call; got str: ${str} ; error: ${e}`
			);
		}
		const p1Flag = str.split(".")[0] === "p1";
		console.log(`Sending CR fn args`, hero, crThreshold, p1Flag);
		return new CombatReadinessGeqFn(hero, crThreshold, p1Flag);
	}

	constructor(hero: TYPES["String"], crThreshold: TYPES["Int"], p1Flag: boolean) {
		console.log(
			`Received CR-GEQ fn args`,
			hero.asString(),
			crThreshold.asString(),
			p1Flag
		);
		super();
		this.hero = hero.data;
		this.crThreshold = crThreshold.data;
		this.str =
			(p1Flag ? "p1" : "p2") +
			`.CR-GEQ(${hero.asString()}, ${crThreshold.asString()})`;
		this.isPlayer1 = p1Flag;
	}

	call(battle: BattleType): boolean {
		const findFn = (entry: [string, number], picks: string[]) =>
			picks.includes(entry[0]) &&
			entry[1] >= this.crThreshold &&
			entry[0] === this.hero;
		const result = this.isPlayer1
			? battle[COLUMNS_MAP.CR_BAR].find((entry) =>
					findFn(entry, battle[COLUMNS_MAP.P1_PICKS])
			  )
			: battle[COLUMNS_MAP.CR_BAR].find((entry) =>
					findFn(entry, battle[COLUMNS_MAP.P2_PICKS])
			  );
		console.log(
			`Got CR Result: ${result}, hero: ${this.hero}, minValue: ${this.crThreshold}`
		);
		return Boolean(result);
	}
}

class CombatReadinessLtFn extends DirectFn {
	hero: string;
	crThreshold: number;
	isPlayer1: boolean;
	static fromFilterStr(str: string, REFS: FilterRefs) {
		const args = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true);
		if (!(args.length === 2)) {
			throw new Futils.SyntaxException(
				`Invalid artifact function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`
			);
		}
		if (!RegExps.VALID_STRING_LITERAL_RE.test(args[0])) {
			throw new Futils.TypeException(
				`Invalid CR-LT function call ; first argument must be a valid string literal ; got: '${args[0]}' from str: ${str}`
			);
		} else if (!RegExps.VALID_INT_LITERAL_RE.test(args[1])) {
			throw new Futils.TypeException(
				`Invalid CR-LT function call ; second argument must be a valid integer literal ; got: '${args[1]}' from str: ${str}`
			);
		}
		const crThresholdStr = args[1];
		let hero: TYPES["String"], crThreshold: TYPES["Int"];
		try {
			[hero, crThreshold] = [
				new TYPES.String(args[0], REFS, { types: ["hero"] }),
				new TYPES.Int(crThresholdStr),
			];
		} catch (e) {
			throw new Futils.TypeException(
				`Invalid type in CR-LT function call; got str: ${str} ; error: ${e}`
			);
		}
		const p1Flag = str.split(".")[0] === "p1";
		console.log(`Sending CR fn args`, hero, crThreshold, p1Flag);
		return new CombatReadinessLtFn(hero, crThreshold, p1Flag);
	}

	constructor(hero: TYPES["String"], crThreshold: TYPES["Int"], p1Flag: boolean) {
		console.log(
			`Received CR-LT fn args`,
			hero.asString(),
			crThreshold.asString(),
			p1Flag
		);
		super();
		this.hero = hero.data;
		this.crThreshold = crThreshold.data;
		this.str =
			(p1Flag ? "p1" : "p2") +
			`.CR-LT(${hero.asString()}, ${crThreshold.asString()})`;
		this.isPlayer1 = p1Flag;
	}

	call(battle: BattleType): boolean {
		const findFn = (entry: [string, number], picks: string[]) =>
			picks.includes(entry[0]) &&
			entry[1] < this.crThreshold &&
			entry[0] === this.hero;
		const result = this.isPlayer1
			? battle[COLUMNS_MAP.CR_BAR].find((entry) =>
					findFn(entry, battle[COLUMNS_MAP.P1_PICKS])
			  )
			: battle[COLUMNS_MAP.CR_BAR].find((entry) =>
					findFn(entry, battle[COLUMNS_MAP.P2_PICKS])
			  );
		console.log(
			`Got CR Result: ${result}, hero: ${this.hero}, minValue: ${this.crThreshold}`
		);
		return !!result;
	}
}

const FN_MAP: { 
	CLAUSE_FNS: { [key: string]: ClauseFnClass<ClauseFn> },
	DIRECT_FNS: { [key: string]: DirectFnClass<DirectFn> },
	GLOBAL_FNS: { [key: string]: GlobalFilterFnClass<GlobalFilterFn> },
} 
= {
	CLAUSE_FNS: {
		"and": AND,
		"or": OR,
		"xor": XOR,
		"not": NOT,
	},
	DIRECT_FNS: {
		"p1.equipment": EquipmentFn,
		"p2.equipment": EquipmentFn,
		"p1.artifact": ArtifactFn,
		"p2.artifact": ArtifactFn,
		"p1.cr-geq": CombatReadinessGeqFn,
		"p2.cr-geq": CombatReadinessGeqFn,
		"p1.cr-lt": CombatReadinessLtFn,
		"p2.cr-lt": CombatReadinessLtFn,
	},
	GLOBAL_FNS: {
		"last-n": lastN
	}
};

export type ClauseFnClass<T extends ClauseFn> = {
	new (fc: FilterContainer): T;
}

export type FnClass<T extends Fn> = {
	new (...args: any[]): T,
}

export type DirectFnClass<T extends DirectFn> = {
	fromFilterStr: (str: string, REFS: FilterRefs) => T
}

export type GlobalFilterFnClass<T extends GlobalFilterFn> = {
	new (...args: any[]): T,
}

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
	ClauseFn, 
	DirectFn,
	GlobalFilterFn
};
