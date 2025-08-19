import HeroManager, { Hero } from "./hero-manager.ts";
import ArtifactManager, { ArtifactObj } from "./artifact-manager.ts";
import UserManager, { User } from "./user-manager.ts";
import { WORLD_CODE_ENUM } from "./references.ts";
import Fuse from "fuse.js";


const USER_DOMAINS = {
	GLOBAL_SERVER: "Global Server",
	KOR_SERVER: "Korea Server",
	JPN_SERVER: "Japan Server",
	ASIA_SERVER: "Asia Server",
	EU_SERVER: "Europe Server",
} as const;

type UserDomain = typeof USER_DOMAINS[keyof typeof USER_DOMAINS];

const USER_DOMAIN_CODES = {
	[USER_DOMAINS.GLOBAL_SERVER]: WORLD_CODE_ENUM.GLOBAL,
	[USER_DOMAINS.KOR_SERVER]: WORLD_CODE_ENUM.KOR,
	[USER_DOMAINS.JPN_SERVER]: WORLD_CODE_ENUM.JPN,
	[USER_DOMAINS.ASIA_SERVER]: WORLD_CODE_ENUM.ASIA,
	[USER_DOMAINS.EU_SERVER]: WORLD_CODE_ENUM.EU,
} as const;


const SEARCH_DOMAINS = {
	[USER_DOMAINS.GLOBAL_SERVER]: "Global Server",
	[USER_DOMAINS.KOR_SERVER]: "Korea Server",
	[USER_DOMAINS.JPN_SERVER]: "Japan Server",
	[USER_DOMAINS.ASIA_SERVER]: "Asia Server",
	[USER_DOMAINS.EU_SERVER]: "Europe Server",
	HEROES: "Heroes",
	ARTIFACTS: "Artifacts",
} as const;

type SearchDomain = typeof SEARCH_DOMAINS[keyof typeof SEARCH_DOMAINS];

const HERO_SEARCH_CONFIG = { keys: ["name"], threshold: 0.4 };
const USER_SEARCH_CONFIG = { keys: ["name"], threshold: 0.4 };
const ARTIFACT_SEARCH_CONFIG = { keys: ["name"], threshold: 0.4 };

export function getStrMatches(str: string, strings: any[], numMatches: number | null = null, customConfig: object = {}) {
	let config = {
		includeScore: true,
		threshold: 0.3,
	}
	config = { ...config, ...customConfig };
	let fuse = null;
	fuse = new Fuse(strings, config);
	const result = fuse.search(str);
	if (numMatches !== null) {
		return result.slice(0, numMatches);
	}
	return result;
}

function searchHeroes(heroName: string, heroes: Hero[]) {
	return getStrMatches(heroName, heroes, null, HERO_SEARCH_CONFIG);
}

function searchUsers(userName: string, users: User[]) {
	return getStrMatches(userName, users, null, USER_SEARCH_CONFIG);
}

function searchArtifacts(artiName: string, artifactNames: ArtifactObj[]) {
	return getStrMatches(artiName, artifactNames, null, ARTIFACT_SEARCH_CONFIG);
}


type Cache = {
	[USER_DOMAINS.GLOBAL_SERVER]: User[] | null,
	[USER_DOMAINS.KOR_SERVER]: User[] | null,
	[USER_DOMAINS.JPN_SERVER]: User[] | null,
	[USER_DOMAINS.ASIA_SERVER]: User[] | null,
	[USER_DOMAINS.EU_SERVER]: User[] | null,
	[SEARCH_DOMAINS.HEROES]: Hero[] | null,
	[SEARCH_DOMAINS.ARTIFACTS]: ArtifactObj[] | null,
}

class Searcher {
	static DOMAINS = SEARCH_DOMAINS;

	DOMAIN_CACHE: Cache = {
		[USER_DOMAINS.GLOBAL_SERVER]: null,
		[USER_DOMAINS.KOR_SERVER]: null,
		[USER_DOMAINS.JPN_SERVER]: null,
		[USER_DOMAINS.ASIA_SERVER]: null,
		[USER_DOMAINS.EU_SERVER]: null,
		[SEARCH_DOMAINS.HEROES]: null,
		[SEARCH_DOMAINS.ARTIFACTS]: null,
	};

	async get_domain(domain: SearchDomain) {
		if (!this.DOMAIN_CACHE[domain]) {
			if (Object.values(USER_DOMAINS).includes(domain as UserDomain)) {
				const userDomain = domain as UserDomain;
				const users = await UserManager.getUserMap(USER_DOMAIN_CODES[userDomain]);
				this.DOMAIN_CACHE[userDomain] = users ? Object.values(users) as User[] : [];
			} else if (domain === SEARCH_DOMAINS.HEROES) {
				const heroDicts = await HeroManager.getHeroDicts();
				this.DOMAIN_CACHE[domain] = heroDicts.heroes;
			} else if (domain === SEARCH_DOMAINS.ARTIFACTS) {
				const artifacts = await ArtifactManager.getArtifactObjectList();
				this.DOMAIN_CACHE[domain] = artifacts;
			}
		}
		const elements = await this.DOMAIN_CACHE[domain];
		return elements;
	}

	async search(domain: SearchDomain, searchTerm: string) {
		let users: User[];
		switch (domain) {
			case USER_DOMAINS.GLOBAL_SERVER:
				users = await this.get_domain(domain) as User[];
				return searchUsers(searchTerm, users);
			case USER_DOMAINS.KOR_SERVER:
				users = await this.get_domain(domain) as User[];
				return searchUsers(searchTerm, users);
			case USER_DOMAINS.JPN_SERVER:
				users = await this.get_domain(domain) as User[];
				return searchUsers(searchTerm, users);
			case USER_DOMAINS.ASIA_SERVER:
				users = await this.get_domain(domain) as User[];
				return searchUsers(searchTerm, users);
			case USER_DOMAINS.EU_SERVER:
				users = await this.get_domain(domain) as User[];
				return searchUsers(searchTerm, users);
			case SEARCH_DOMAINS.HEROES:
				const heroes = await this.get_domain(domain) as Hero[];
				return searchHeroes(searchTerm, heroes);
			case SEARCH_DOMAINS.ARTIFACTS:
				const artifacts = await this.get_domain(domain) as ArtifactObj[];
				return searchArtifacts(searchTerm, artifacts);
			default:
				throw new Error(`Unknown domain: ${domain}`);
		}
	}
}

export { Searcher };
