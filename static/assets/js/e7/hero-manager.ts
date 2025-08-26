import ClientCache from "../cache-manager.ts";
import { LanguageCode, LANGUAGES, PRIMES } from "./references.ts";
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
	prime: number;
};

export type HeroDicts = {
	heroes: Hero[];
	Empty: Hero;
	Fodder: Hero;
	name_lookup: { [key: string]: Hero };
	code_lookup: { [key: string]: Hero };
	prime_lookup: { [key: number]: Hero };
	prime_pair_lookup: { [key: number]: string };
}

function getEmptyHero(): Hero {
	return {
		attribute_cd: "N/A",
		code: "N/A",
		grade: "N/A",
		job_cd: "N/A",
		name: "N/A",
		prime: 1,
	};
}

function getEmptyHeroManager(): HeroDicts {
	return {
		heroes: [],
		Empty: getEmptyHero(),
		Fodder: getEmptyHero(),
		name_lookup: {},
		code_lookup: {},
		prime_lookup: {},
		prime_pair_lookup: {},
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
		prime: 1,
	};
	const Fodder = {
		attribute_cd: "N/A",
		code: "N/A",
		grade: "2/3",
		job_cd: "N/A",
		name: FODDER_NAME,
		prime: PRIMES[next_index],
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

	console.log("\tAdding prime lookup");
	HeroDicts.prime_lookup = HeroDicts.heroes.reduce((acc: { [key: number]: Hero }, hero) => {
		acc[hero.prime] = hero;
		return acc;
	}, {});

	console.log("\tAdding code lookup");
	HeroDicts.code_lookup = HeroDicts.heroes.reduce((acc: { [key: string]: Hero }, hero) => {
		acc[hero.code] = hero;
		return acc;
	}, {});

	console.log("\tAdding prime pair lookup");
	let prime_pair_lookup: { [key: number]: string } = HeroDicts.heroes.reduce((acc: { [key: number]: string }, hero) => {
		acc[hero.prime] = hero.name;
		return acc;
	}, {});
	const numKeys = Object.keys(HeroDicts.prime_lookup).length - 1; // subtract 1 since we don't consider Empty hero
	console.log("\tAdding prime pair lookup; primes to process", numKeys);
	for (let i = 0; i < numKeys - 1; i++) {
		const prime = PRIMES[i];
		for (let j = i + 1; j < numKeys; j++) {
			const prime2 = PRIMES[j];
			const product = prime * prime2;
			const name1 = HeroDicts.prime_lookup[prime].name;
			const name2 = HeroDicts.prime_lookup[prime2].name;
			prime_pair_lookup[product] = [name1, name2].sort().join(", ");
		}
	}
	//capture case where two fodder heroes
	prime_pair_lookup[HeroDicts.Fodder.prime * HeroDicts.Fodder.prime] = [
		HeroDicts.Fodder.name,
		HeroDicts.Fodder.name,
	].join(", ");

	//set prime pair lookup dict in HeroDicts and return
	HeroDicts.prime_pair_lookup = prime_pair_lookup;
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
		// add prime identifier to each hero so that we can represent a set as a product of primes
		for (let [index, heroData] of rawHeroList.entries()) {
			const prime = PRIMES[index];
			heroData.prime = prime;
		}
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

	getHeroByPrime: function (prime: number, HeroDicts: HeroDicts): Hero | null {
		if (!HeroDicts) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		}
		return HeroDicts.prime_lookup[prime];
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

	getPairNamesByProduct: function (product: number, HeroDicts: HeroDicts): string | null {
		if (!HeroDicts) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		}
		return HeroDicts.prime_pair_lookup[product];
	},

	EMPTY_NAME: EMPTY_NAME,
	FODDER_NAME: FODDER_NAME,
};

export default HeroManager;
