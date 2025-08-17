import ClientCache from "../cache-manager.ts";
import { LanguageCode, LANGUAGES, PRIMES } from "./references.ts";
import PYAPI from "../apis/py-API.js";
import E7API from "../apis/e7-API.js";

const FODDER_NAME = "Fodder";
const EMPTY_NAME = "Empty";

type Hero = {
	attribute_cd: string;
	code: string;
	grade: string;
	job_cd: string;
	name: string;
	prime: number;
};

type HM = {
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

function getEmptyHeroManager(): HM {
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
function addNonHeroes(HM: HM) {
	const next_index = HM.heroes.length;
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
	HM.heroes.push(Empty);
	HM.heroes.push(Fodder);
	HM.Fodder = Fodder;
	HM.Empty = Empty;
	return HM;
}

// add lookup dicts to the hero manager so that we can perform efficient lookups
function addDicts(HM: HM) {
	console.log("Adding Lookup Dicts");
	console.log("\tAdding name lookup");
	HM.name_lookup = HM.heroes.reduce((acc: { [key: string]: Hero }, hero) => {
		acc[hero.name.toLowerCase().replace(/\s+/g, "")] = hero;
		return acc;
	}, {});

	console.log("\tAdding prime lookup");
	HM.prime_lookup = HM.heroes.reduce((acc: { [key: number]: Hero }, hero) => {
		acc[hero.prime] = hero;
		return acc;
	}, {});

	console.log("\tAdding code lookup");
	HM.code_lookup = HM.heroes.reduce((acc: { [key: string]: Hero }, hero) => {
		acc[hero.code] = hero;
		return acc;
	}, {});

	console.log("\tAdding prime pair lookup");
	let prime_pair_lookup: { [key: number]: string } = HM.heroes.reduce((acc: { [key: number]: string }, hero) => {
		acc[hero.prime] = hero.name;
		return acc;
	}, {});
	const numKeys = Object.keys(HM.prime_lookup).length - 1; // subtract 1 since we don't consider Empty hero
	console.log("\tAdding prime pair lookup; primes to process", numKeys);
	for (let i = 0; i < numKeys - 1; i++) {
		const prime = PRIMES[i];
		for (let j = i + 1; j < numKeys; j++) {
			const prime2 = PRIMES[j];
			const product = prime * prime2;
			const name1 = HM.prime_lookup[prime].name;
			const name2 = HM.prime_lookup[prime2].name;
			prime_pair_lookup[product] = [name1, name2].sort().join(", ");
		}
	}
	//capture case where two fodder heroes
	prime_pair_lookup[HM.Fodder.prime * HM.Fodder.prime] = [
		HM.Fodder.name,
		HM.Fodder.name,
	].join(", ");

	//set prime pair lookup dict in HM and return
	HM.prime_pair_lookup = prime_pair_lookup;
	return HM;
}

let HeroManager = {
	getHeroManager: async function (lang: LanguageCode = LANGUAGES.CODES.EN) {
		const cachedHeroManager = await ClientCache.get(
			ClientCache.Keys.HERO_MANAGER
		);
		if (cachedHeroManager) {
			return cachedHeroManager;
		}
		return this.fetchAndCacheHeroManager(lang);
	},

	createHeroManager: function (rawHeroList: Hero[]) {
		// add prime identifier to each hero so that we can represent a set as a product of primes
		for (let [index, heroData] of rawHeroList.entries()) {
			const prime = PRIMES[index];
			heroData.prime = prime;
		}
		let HM = getEmptyHeroManager();
		HM.heroes = rawHeroList;
		HM = addNonHeroes(HM); //should not be called again
		HM = addDicts(HM); // Must come after addNonHeroes so that empty/fodder are added to the dicts
		return HM;
	},

	fetchHeroManager: async function (lang: LanguageCode = LANGUAGES.CODES.EN): Promise<HM> {
		const heroJSON: { [key: string]: Hero[] } =
			(await E7API.fetchHeroJSON()) ?? (await PYAPI.fetchHeroData());
		const heroList = heroJSON[lang]; //get english hero list
		const HM = this.createHeroManager(heroList);
		console.log(`Created HeroManager of language ${lang} using raw data received from server`);
		return HM;
	},

	fetchAndCacheHeroManager: async function (lang: LanguageCode = LANGUAGES.CODES.EN): Promise<HM> {
		console.log(
			"HeroManager not found in cache, fetching from server and caching it"
		);
		const HM = await this.fetchHeroManager(lang);
		await ClientCache.cache(ClientCache.Keys.HERO_MANAGER, HM);
		console.log("Cached HeroManager using raw data recieved from server");
		console.log(HM);
		return HM;
	},

	deleteHeroManager: async function (): Promise<void> {
		await ClientCache.delete(ClientCache.Keys.HERO_MANAGER);
		console.log("Removed hero manager from cache");
	},

	getHeroByName: function (name: string, HM: HM): Hero | null {
		if (!HM) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		} else if (!name) {
			return HM.Empty;
		}
		const normalizedName = name.toLowerCase().replace(/\s+/g, "");
		return HM.name_lookup[normalizedName] ?? null;
	},

	getHeroByPrime: function (prime: number, HM: HM): Hero | null {
		if (!HM) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		}
		return HM.prime_lookup[prime];
	},

	getHeroByCode: function (code: string, HM: HM): Hero | null {
		if (!HM) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		} else if (!code) {
			return HM.Empty;
		}
		return HM.code_lookup[code] ?? null;
	},

	getPairNamesByProduct: function (product: number, HM: HM): string | null {
		if (!HM) {
			throw new Error(
				"HeroManager instance must be passed to lookup functions"
			);
		}
		return HM.prime_pair_lookup[product];
	},
};

export default HeroManager;
