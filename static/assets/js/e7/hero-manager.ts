import ClientCache from "../cache-manager.ts";
import { LanguageCode, LANGUAGES } from "./references.ts";
import PYAPI from "../apis/py-API.js";
import E7API from "../apis/e7-API.ts";

const FODDER_NAME = "~Fodder";
const EMPTY_NAME = "~Empty";

export type Hero = {
	attribute_cd: string;
	code: string;
	grade: string;
	job_cd: string;
	name: string;
};

export type HeroDicts = {
	heroes: Hero[];
	Empty: Hero;
	Fodder: Hero;
	name_lookup: { [key: string]: Hero };
	code_lookup: { [key: string]: Hero };
}

function getEmptyHero(): Hero {
	return {
		attribute_cd: "N/A",
		code: "N/A",
		grade: "N/A",
		job_cd: "N/A",
		name: "N/A",
	};
}

function getEmptyHeroManager(): HeroDicts {
	return {
		heroes: [],
		Empty: getEmptyHero(),
		Fodder: getEmptyHero(),
		name_lookup: {},
		code_lookup: {},
	};
}

// This function adds two heroes to the Hero Manager to account for fodder champions and empty picks/prebans
function addNonHeroes(HeroDicts: HeroDicts) {
	const next_index = HeroDicts.heroes.length;
	const Empty = {
		attribute_cd: "N/A",
		code: "N/A",
		grade: "N/A",
		job_cd: "N/A",
		name: EMPTY_NAME,
	};
	const Fodder = {
		attribute_cd: "N/A",
		code: "N/A",
		grade: "2/3",
		job_cd: "N/A",
		name: FODDER_NAME,
	};
	HeroDicts.heroes.push(Empty);
	HeroDicts.heroes.push(Fodder);
	HeroDicts.Fodder = Fodder;
	HeroDicts.Empty = Empty;
	return HeroDicts;
}

// add lookup dicts to the hero manager so that we can perform efficient lookups
function addDicts(HeroDicts: HeroDicts) {
	console.log("Adding Lookup Dicts");
	console.log("\tAdding name lookup");
	HeroDicts.name_lookup = HeroDicts.heroes.reduce((acc: { [key: string]: Hero }, hero) => {
		acc[hero.name.toLowerCase().replace(/\s+/g, "")] = hero;
		return acc;
	}, {});

	console.log("\tAdding code lookup");
	HeroDicts.code_lookup = HeroDicts.heroes.reduce((acc: { [key: string]: Hero }, hero) => {
		acc[hero.code] = hero;
		return acc;
	}, {});
	return HeroDicts;
}

let HeroManager = {
	getHeroDicts: async function (lang: LanguageCode = LANGUAGES.CODES.EN): Promise<HeroDicts> {
		const cachedHeroManager = await ClientCache.get(
			ClientCache.Keys.HERO_MANAGER
		);
		if (cachedHeroManager) {
			return cachedHeroManager as HeroDicts;
		}
		return this.fetchAndCacheHeroManager(lang);
	},

	createHeroManager: function (rawHeroList: Hero[]) {
		let HeroDicts = getEmptyHeroManager();
		HeroDicts.heroes = rawHeroList;
		HeroDicts = addNonHeroes(HeroDicts); //should not be called again
		HeroDicts = addDicts(HeroDicts); // Must come after addNonHeroes so that empty/fodder are added to the dicts
		return HeroDicts;
	},

	fetchHeroManager: async function (lang: LanguageCode = LANGUAGES.CODES.EN): Promise<HeroDicts> {
		const heroJSON: { [key: string]: Hero[] } =
			(await E7API.fetchHeroJSON()) ?? (await PYAPI.fetchHeroData());
		const heroList = heroJSON[lang]; //get english hero list
		const HeroDicts = this.createHeroManager(heroList);
		console.log(`Created HeroManager of language ${lang} using raw data received from server`);
		return HeroDicts;
	},

	fetchAndCacheHeroManager: async function (lang: LanguageCode = LANGUAGES.CODES.EN): Promise<HeroDicts> {
		console.log(
			"HeroManager not found in cache, fetching from server and caching it"
		);
		const HeroDicts = await this.fetchHeroManager(lang);
		await ClientCache.cache(ClientCache.Keys.HERO_MANAGER, HeroDicts);
		console.log("Cached HeroManager using raw data recieved from server");
		console.log(HeroDicts);
		return HeroDicts;
	},

	deleteHeroManager: async function (): Promise<void> {
		await ClientCache.delete(ClientCache.Keys.HERO_MANAGER);
		console.log("Removed hero manager from cache");
	},

	getHeroByName: function (name: string | undefined, HeroDicts: HeroDicts): Hero | null {
		if (!HeroDicts) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		} else if (!name) {
			return HeroDicts.Empty;
		}
		const normalizedName = name.toLowerCase().replace(/\s+/g, "");
		return HeroDicts.name_lookup[normalizedName] ?? null;
	},

	getHeroByCode: function (code: string | undefined, HeroDicts: HeroDicts): Hero | null {
		if (!HeroDicts) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		} else if (!code) {
			return HeroDicts.Empty;
		}
		return HeroDicts.code_lookup[code] ?? null;
	},
	EMPTY_NAME: EMPTY_NAME,
	FODDER_NAME: FODDER_NAME,
};

export default HeroManager;
