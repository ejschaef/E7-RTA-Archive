import Futils from "./filter-utils.js";
import { RegExps } from "../regex.js";
import { toTitleCase } from "../../utils.ts";
import HeroManager from "../hero-manager.js";
import { EQUIPMENT_LOWERCASE_STRINGS_MAP } from "./filter-parse-references.js";
import { LEAGUE_MAP } from "../references.js";
import { WORLD_CODE_TO_CLEAN_STR } from "../references.js";

function getSeasonFromSyntaxStr(str: string, seasonDetails) {
	const seasonNum = str.split("-")[1];
	const season = seasonDetails.find((season) => season["Season Number"] === seasonNum);
	if (!season) {
		throw new Error(
			`Invalid season specified; ${seasonNum} is not a valid season number; failed on str: '${str}'`
		);
	}
	return season;
}

class DataType {
	rawString: any;
	data: any;
	constructor(str: string, REFS = null, kwargs: null | Object = null) {
		this.rawString = str;
		this.data = this.getData(str, REFS, kwargs); // kwargs will be an object with specific arguments for the specific datatype
	}
	getData(str: string, REFS: any, kwargs: any): any {
		throw new Error("Method not implemented.");
	}

	asString() {
		return `${this.data}`;
	}
}

const STRING_TYPES = ["hero", "league", "server", "equipment", "artifact", "season-code"];

class StringType extends DataType {
	getData(
		str,
		REFS,
		kwargs = { types: STRING_TYPES }
	) {
		str = Futils.trimSurroundingQuotes(str);
		str = str.trim();
		console.log(`Parsing string: [${str}] with types: [${kwargs.types}]`);
		if (!RegExps.VALID_STRING_RE.test(str)) {
			throw new Futils.SyntaxException(
				`Invalid string; all string content must start with a letter followed by either num, hyphen or period ( case insensitive regex: ${RegExps.VALID_STRING_LITERAL_RE.source} ); got: [${str}]`
			);
		}
		function parseFn(type, str) {
			switch (type) {
				case "hero":
					return HeroManager.getHeroByName(str, REFS.HM)?.name;
				case "league":
					return LEAGUE_MAP[str] ? toTitleCase(str) : null;
				case "server":
					return Object.values(WORLD_CODE_TO_CLEAN_STR).find(
						(server) => server.toLowerCase() === str
					);
				case "equipment":
					return EQUIPMENT_LOWERCASE_STRINGS_MAP[str];
				case "artifact":
					return REFS.ARTIFACT_LOWERCASE_STRINGS_MAP[str];
				case "season-code":
					return REFS.SeasonDetails.find((season) => season.Code === str)?.Code;
			}
		}
		for (const type of kwargs.types) {
			const parsed = parseFn(type, str);
			if (parsed) {
				console.log(`Parsed string: [${str}] to [${parsed}] with type: [${type}]`);
				return parsed;
			}
		}
		throw new Futils.SyntaxException(
			`Invalid string; All strings must either be a valid [${kwargs.types.join(
				", "
			)}]; got: [${str}]`
		);
	}

	asString() {
		return `"${this.data}"`;
	}
}

class DateType extends DataType {
	getData(str, _REFS = null) {
		return Futils.parseDate(str);
	}

	asString() {
		return `${this.rawString}`;
	}
}

class IntType extends DataType {
	getData(str, _REFS = null) {
		if (!RegExps.VALID_INT_LITERAL_RE.test(str)) {
			throw new Futils.SyntaxException(
				`Invalid integer; must be a number; got: '${str}'`
			);
		}
		const parsedInt = parseInt(str);
		if (isNaN(parsedInt)) {
			throw new Futils.SyntaxException(
				`Invalid integer; must be a number; got: '${str}'`
			);
		}
		return parsedInt;
	}
	asString() {
		return `${this.data}`;
	}
}

class BoolType extends DataType {
	getData(str, _REFS = null) {
		if (!RegExps.VALID_BOOL_LITERAL_RE.test(str)) {
			throw new Futils.SyntaxException(
				`Invalid boolean; must be 'true' or 'false'; got: '${str}'`
			);
		}
		return str === "true" ? 1 : 0;
	}
	asString() {
		return `${this.data ? "true" : "false"}`;
	}
}

class RangeType extends DataType {
	getData(str, _REFS = null) {
		let split = str.split("...");
		if (split.length !== 2) {
			throw new Futils.SyntaxException(
				`Invalid range; ranges must be of the format x...y or x...=y ; got more than two values when splitting string: '${str}'`
			);
		}
		let [start, end] = split;
		let endInclusive = false;
		if (end.includes("=")) {
			end = end.replace("=", "");
			endInclusive = true;
		}
		let output = {
			start: null,
			end: null,
			endInclusive: endInclusive,
			type: "",
		};
		if (RegExps.VALID_DATE_LITERAL_RE.test(start)) {
			output.start = Futils.tryConvert(
				Futils.parseDate,
				"Date",
				start,
				`Could not convert '${start}' to Date in declared range: '${str}'`
			);
			output.end = Futils.tryConvert(
				Futils.parseDate,
				"Date",
				end,
				`Could not convert '${end}' to Date in declared range: '${str}' ; Ranges must have homogenous types`
			);
			if (output.start && output.end && output.start > output.end) {
				throw new Futils.SyntaxException(
					`Invalid range; start date must be on or before end date; ${output.start} > ${output.end}`
				);
			}
			output.type = "Date";
		} else if (RegExps.VALID_INT_LITERAL_RE.test(start)) {
			output.start = Futils.tryConvert(
				(i) => new IntType(i),
				"Int",
				start,
				`Could not convert '${start}' to Int in declared range: '${str}'`
			).data;
			output.end = Futils.tryConvert(
				(i) => new IntType(i),
				"Int",
				end,
				`Could not convert '${end}' to Int in declared range: '${str}' ; Ranges must have homogenous types`
			).data;
			if (output.start && output.end && output.start > output.end) {
				throw new Futils.SyntaxException(
					`Invalid range; start integer must be equal to or less than end integer; ${output.start} > ${output.end}`
				);
			}
			output.type = "Int";
		} else {
			throw new Futils.SyntaxException(
				`Invalid range; must be of the format x...y or x...=y ; got: '${str}'`
			);
		}
		console.log(`Built Range: ${JSON.stringify(output)}`);
		return output;
	}
	asString() {
		const rangeSymb = this.data.endInclusive ? "...=" : "...";
		if (this.data.type === "Date") {
			return `${this.data.start.toISOString().slice(0, 10)}${rangeSymb}${this.data.end.toISOString().slice(0, 10)}`;
		} else if (this.data.type === "Int") {
			return `${this.data.start}${rangeSymb}${this.data.end}`;
		} else {
			return `Error Converting Range to String => < ${this.data.start}${rangeSymb}${this.data.end} >`;
		}
	}
}

class SetType extends DataType {
	type: any;
	str: string;
	list: any[];
	getType(elements) {
		let types: Set<DataType> | DataType[] = new Set();
		for (const element of elements) {
			types.add(element.constructor.name);
		}
		types = [...types];
		console.log("GOT TYPES: ", types);
		if (types.length > 1) {
			throw new Futils.SyntaxException(
				`Invalid set; all set elements must have the same data type; 
                got: types: [${types.join(", ")}]`
			);
		}
		return types[0];
	}
	getData(
		str,
		REFS,
		kwargs = { types: STRING_TYPES }
	) {
		if (!RegExps.VALID_SET_RE.test(str)) {
			throw new Futils.SyntaxException(
				`Invalid set; must be in the format: { element1, element2,... }, where elements have either string format or date format; ( case insensitive regex: ${RegExps.VALID_SET_RE.source} ) (Just chat gpt this one bro); got: '${str}'`
			);
		}
		const elements = Futils.tokenizeWithNestedEnclosures(str, ",", 1, true)
			.map((elt) => {
				if (RegExps.VALID_SEASON_LITERAL_RE.test(elt)) {
					const season = getSeasonFromSyntaxStr(elt, REFS.SeasonDetails);
					return new StringType(season.Code, REFS, { types: ["season-code"] });
				} else if (RegExps.VALID_DATE_LITERAL_RE.test(elt)) {
					return new DateType(elt);
				} else if (RegExps.VALID_STRING_RE.test(elt)) {
					return new StringType(elt, REFS, kwargs);
				} else {
					throw new Futils.SyntaxException(
						`Invalid set element; must be a string or date; got: '${elt}'`
					);
				}
			});
		console.log("GOT ELEMENTS: ", elements);
		this.type = this.getType(elements);
		this.str = `{${elements.map((data) => data.asString()).join(", ")}}`;
		this.list = elements.map((data) => data.data);
		return new Set(this.list);
	}
	asString() {
		return this.str;
	}
}

function parseKeywordAsDataType(str, REFS) {
	if (RegExps.VALID_SEASON_LITERAL_RE.test(str)) {
		console.log("Parsing as season");
		if (REFS.SeasonDetails.length < 1) {
			throw new Error(
				`Did not recieve any season details; failed on: '${str}'`
			);
		} else if (str === "current-season") {
			const seasonCode = REFS.SeasonDetails.find(
				(season) => season["Status"] === "Active"
			).Code;
			return new StringType(seasonCode, REFS, { types: ["season-code"] });
		} else {
			const season = getSeasonFromSyntaxStr(str, REFS.SeasonDetails);
			return new StringType(season.Code, REFS, { types: ["season-code"] });
		}
	}
	throw new Error(`Unrecognized keyword: '${str}'`);
}

function parseDataType(str, REFS) {
	console.log(`Trying to Parse DataType: ${str}`);
	if (RegExps.VALID_STRING_LITERAL_RE.test(str)) {
		console.log("Parsing as StringType");
		return new StringType(str, REFS);
	} else if (RegExps.VALID_DATE_LITERAL_RE.test(str)) {
		console.log("Parsing as DateType");
		return new DateType(str);
	} else if (RegExps.VALID_INT_LITERAL_RE.test(str)) {
		console.log("Parsing as IntType");
		return new IntType(str);
	} else if (RegExps.VALID_BOOL_LITERAL_RE.test(str)) {
		console.log("Parsing as BoolType");
		return new BoolType(str);
	} else if (/\{.*\}/.test(str)) {
		console.log("Parsing as SetType");
		return new SetType(str, REFS);
	} else if (RegExps.VALID_RANGE_LITERAL_RE.test(str)) {
		console.log("Parsing as RangeType");
		return new RangeType(str);
	} else if (RegExps.VALID_DATA_WORD_LITERAL_RE.test(str)) {
		console.log("Parsing as DataWord");
		return parseKeywordAsDataType(str, REFS);
	} else {
		console.log("Failed to parse DataType");
		if (RegExps.VALID_STRING_LITERAL_RE.test(`'${str}'`)) {
			throw new Futils.SyntaxException(
				`Invalid DataType declaration; got: '${str}'; did you forget to wrap string literals in double or single quotes?`
			);
		} else if (str.includes("'") && str.includes('"')) {
			throw new Futils.SyntaxException(
				`Invalid DataType declaration; got: '${str}'; did you encase in mismatching quote types?`
			);
		} else if (str.includes(".=") || str.includes("..")) {
			throw new Futils.SyntaxException(
				`Invalid DataType declaration; got: '${str}'; were you trying to use a range? Ranges must be of the format x...y or x...=y and may only be int-int or date-date`
			);
		}
		throw new Futils.SyntaxException(
			`Invalid DataType declaration; could not parse to valid Field or Declared Data Type; got: '${str}'`
		);
	}
}

const TYPES = {
	Date: DateType,
	String: StringType,
	Int: IntType,
	Bool: BoolType,
	Set: SetType,
	Range: RangeType,
};

type TYPES = {
	Date: typeof DateType;
	String: typeof StringType;
	Int: typeof IntType;
	Bool: typeof BoolType;
	Set: typeof SetType;
	Range: typeof RangeType;
}

export { parseDataType, TYPES, DataType };
