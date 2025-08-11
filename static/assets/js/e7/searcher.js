import { getStrMatches } from "../utils.ts";
import HeroManager from "./hero-manager.js";
import ArtifactManager from "./artifact-manager.js";
import UserManager from "./user-manager.js";
import { WORLD_CODE_ENUM } from "./references.ts";

const SEARCH_DOMAINS = {
	GLOBAL_SERVER: "Global Server",
	KOR_SERVER: "Korea Server",
	JPN_SERVER: "Japan Server",
	ASIA_SERVER: "Asia Server",
	EU_SERVER: "Europe Server",
	HEROES: "Heroes",
	ARTIFACTS: "Artifacts",
};

const HERO_SEARCH_CONFIG = { keys: ["name"], threshold: 0.2 };
const USER_SEARCH_CONFIG = { keys: ["name"], threshold: 0.2 };
const ARTIFACT_SEARCH_CONFIG = { keys: ["name"], threshold: 0.2 };

function searchHeroes(heroName, heroes) {
	return getStrMatches(heroName, heroes, null, HERO_SEARCH_CONFIG);
}

function searchUsers(userName, userList) {
	return getStrMatches(userName, userList, null, USER_SEARCH_CONFIG);
}

function searchArtifacts(artiName, artiList) {
	return getStrMatches(artiName, artiList, null, ARTIFACT_SEARCH_CONFIG);
}

class Searcher {
	static DOMAINS = SEARCH_DOMAINS;

	DOMAIN_CACHE = {};

	async get_domain(domain) {
		if (!this.DOMAIN_CACHE[domain]) {
			switch (domain) {
				case SEARCH_DOMAINS.GLOBAL_SERVER:
					this.DOMAIN_CACHE[domain] = UserManager.getUserMap(
						WORLD_CODE_ENUM.GLOBAL
					);
					break;
				case SEARCH_DOMAINS.KOR_SERVER:
					this.DOMAIN_CACHE[domain] = UserManager.getUserMap(
						WORLD_CODE_ENUM.KOR
					);
					break;
				case SEARCH_DOMAINS.JPN_SERVER:
					this.DOMAIN_CACHE[domain] = UserManager.getUserMap(
						WORLD_CODE_ENUM.JPN
					);
					break;
				case SEARCH_DOMAINS.ASIA_SERVER:
					this.DOMAIN_CACHE[domain] = UserManager.getUserMap(
						WORLD_CODE_ENUM.ASIA
					);
					break;
				case SEARCH_DOMAINS.EU_SERVER:
					this.DOMAIN_CACHE[domain] = UserManager.getUserMap(
						WORLD_CODE_ENUM.EU
					);
					break;
				case SEARCH_DOMAINS.HEROES:
					this.DOMAIN_CACHE[domain] = HeroManager.getHeroManager();
					break;
				case SEARCH_DOMAINS.ARTIFACTS:
					this.DOMAIN_CACHE[domain] = ArtifactManager.getArtifactObjectList();
					break;
			}
			const elements = await this.DOMAIN_CACHE[domain];
			if (!Array.isArray(elements)) {
				if (domain === SEARCH_DOMAINS.HEROES) {
					this.DOMAIN_CACHE[domain] = elements.heroes;
				} else {
					this.DOMAIN_CACHE[domain] = Object.values(elements);
				}
			}
		}
		return await this.DOMAIN_CACHE[domain];
	}

	async search(domain, searchTerm) {
		console.log(`Searching ${domain} for ${searchTerm}`);
		let domainElements;
		switch (domain) {
			case SEARCH_DOMAINS.GLOBAL_SERVER:
				domainElements = await this.get_domain(domain);
				return searchUsers(searchTerm, domainElements);
			case SEARCH_DOMAINS.KOR_SERVER:
				domainElements = await this.get_domain(domain);
				return searchUsers(searchTerm, domainElements);
			case SEARCH_DOMAINS.JPN_SERVER:
				domainElements = await this.get_domain(domain);
				return searchUsers(searchTerm, domainElements);
			case SEARCH_DOMAINS.ASIA_SERVER:
				domainElements = await this.get_domain(domain);
				return searchUsers(searchTerm, domainElements);
			case SEARCH_DOMAINS.EU_SERVER:
				domainElements = await this.get_domain(domain);
				return searchUsers(searchTerm, domainElements);
			case SEARCH_DOMAINS.HEROES:
				domainElements = await this.get_domain(domain);
				return searchHeroes(searchTerm, domainElements);
			case SEARCH_DOMAINS.ARTIFACTS:
				domainElements = await this.get_domain(domain);
				return searchArtifacts(searchTerm, domainElements);
			default:
				throw new Error(`Unknown domain: ${domain}`);
		}
	}
}

export { Searcher };
