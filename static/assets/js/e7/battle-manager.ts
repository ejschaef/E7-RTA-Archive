import ClientCache from "../cache-manager.ts";
import StatsBuilder from "./stats-builder.ts";
import {
	buildFormattedBattleMap,
	parsedCSVToFormattedBattleMap,
	RawBattle,
} from "./battle-transform.ts";
import { StandardFilter, GlobalFilter } from "./filter-parsing/functions.ts";
import { BattleType, BattlesObj, COLUMNS_MAP, RawUploadBattle } from "./references.ts";
import { Filters } from "./filter-parsing/filter-parser.ts";
import { HeroDicts } from "./hero-manager.ts";


export async function applyFilters(battleList: BattleType[], filters: Filters) {
	const localFilterList = filters.filter((f) => f instanceof StandardFilter);
	const globalFilterList = filters.filter((f) => f instanceof GlobalFilter);

	// apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
	for (let filter of globalFilterList) {
		console.log(`Applying global filter: ${filter.asString()}`);
		battleList = filter.call(battleList);
	}

	// apply local filters (filters that can be resolved on each battle without context of other battles)
	for (let filter of localFilterList) {
		console.log(`Applying local filter: ${filter.asString()}`);
		battleList = battleList.filter((b) => {
			// console.log(`Filtering battle:`, b);
			const result = filter.call(b);
			// console.log(`Result: ${result ? "included" : "excluded"}`);
			return result;
		});
	}
	return battleList;
}


let BattleManager = {
	loaded_servers: new Set(),

	// gets battles (upload and/or queried) and returns as list in clean format; used directly to populate battles table
	getBattles: async function (): Promise<BattlesObj | null> {
		console.log("Getting battles");
		const battles = (await ClientCache.get(ClientCache.Keys.BATTLES)) ?? null;
		ClientCache.setTimeoutDataNow(ClientCache.Keys.BATTLES);
		return battles;
	},

	applyFilters: applyFilters,

	/* after battles are set in cache, applies filters to the battles and stores filtered arr in cache under filtered 
  battle key all battles are stored in their clean format, not numerical format; convert after to compute metrics */
	applyFiltersToCachedBattles: async function (filters: Filters) {
		let battles = await this.getBattles() ?? {};
		const filteredBattles = await this.applyFilters(
			Object.values(battles),
			filters
		)
		console.log(
			`Filtered battles from cache; Applied total of <${filters.length}> filters`
		);
		return battles;
	},

	//takes in list of battles then converts to dict and then adds to cached battles
	extendBattles: async function (cleanBattleMap: BattlesObj) {
		let oldDict = (await ClientCache.get(ClientCache.Keys.BATTLES)) ?? {};

		// new battles automatically overwrite old ones if they share same seq_num
		const newDict = { ...oldDict, ...this.sortBattlesObj(cleanBattleMap) };
		await ClientCache.cache(ClientCache.Keys.BATTLES, newDict);
		console.log("Extended user data in cache");
		return newDict;
	},

	//Takes queried battles, clean format and extend in cache
	cacheQuery: async function (battleList: RawBattle[], HeroDicts: HeroDicts, artifacts: Record<string, string>) {
		if (!battleList) {
			console.log("No query battles provided to cacheQuery");
			return [];
		}
		console.log(
			`Caching queried battles: ${battleList.length} battles; modified [BATTLES];`,
			battleList
		);
		const cleanBattleMap = buildFormattedBattleMap(
			battleList,
			HeroDicts,
			artifacts
		);

		const battles = await this.extendBattles(cleanBattleMap);
		console.log("Cached queried battles in cache; modified [BATTLES];");
		return battles;
	},

	//Takes uploaded battles and sets as battles in cache, should be called before attempting to get battles if upload exists
	cacheUpload: async function (rawParsedBattleList: RawUploadBattle[], HeroDicts: HeroDicts) {
		if (!rawParsedBattleList) {
			console.error("No uploaded battles provided to cacheUpload");
			return {};
		}
		const cleanBattles = parsedCSVToFormattedBattleMap(
			rawParsedBattleList,
			HeroDicts
		);
		let battles = await this.extendBattles(cleanBattles);
		console.log(
			"Ingested uploaded battle data into cache; modified [BATTLES]"
		);
		return battles;
	},

	getStats: async function (battles: BattlesObj, filters: Filters, HeroDicts: HeroDicts) {
		console.log("Getting stats");
		const numFilters = filters.length;

		console.log(`Applying ${numFilters} filters`);
		const battlesList = Object.values(battles);
		const filteredBattles = await this.applyFiltersToCachedBattles(filters);
		const filteredBattlesList = Object.values(filteredBattles);

		const areFiltersApplied = numFilters > 0;

		console.log("Getting preban stats");
		const prebanStats = await StatsBuilder.getPrebanStats(
			filteredBattlesList,
			HeroDicts
		);
		console.log("Getting first pick stats");
		const firstPickStats = await StatsBuilder.getFirstPickStats(
			filteredBattlesList,
			HeroDicts
		);
		console.log("Getting general stats");
		const generalStats = await StatsBuilder.getGeneralStats(
			filteredBattlesList
		);
		console.log("Getting hero stats");
		const heroStats = await StatsBuilder.getHeroStats(
			filteredBattlesList,
			HeroDicts
		);
		console.log("Getting server stats");
		const performanceStats = await StatsBuilder.getPerformanceStats(
			filteredBattlesList
		);

		console.log("Returning stats");
		return {
			battles: battlesList,
			filteredBattlesObj: filteredBattles,
			prebanStats: prebanStats,
			generalStats: generalStats,
			firstPickStats: firstPickStats,
			playerHeroStats: heroStats.playerHeroStats,
			enemyHeroStats: heroStats.enemyHeroStats,
			performanceStats: performanceStats,
			numFilters: numFilters,
			areFiltersApplied: areFiltersApplied,
		};
	},

	sortBattlesList: function (battlesList: BattleType[], asc = true): BattleType[] {
		const cmpCol = COLUMNS_MAP.DATE_TIME;
		if (asc) {
			return battlesList.sort((a, b) => {
				return +new Date(a[cmpCol]) - +new Date(b[cmpCol]);
			});
		} else {
			return battlesList.sort((a, b) => {
				return +new Date(b[cmpCol]) - +new Date(a[cmpCol]);
			});
		}
	},

	sortBattlesObj: function (battlesObj: BattlesObj, asc = true): BattlesObj {
		const cmpCol = COLUMNS_MAP.DATE_TIME;
		if (asc) {
			let sorted = Object.values(battlesObj).sort((a, b) => {
				return +new Date(a[cmpCol]) - +new Date(b[cmpCol]);
			});
			return Object.fromEntries(sorted.map((b) => [b[COLUMNS_MAP.SEQ_NUM], b]));
		} else {
			let sorted = Object.values(battlesObj).sort((a, b) => {
				return +new Date(b[cmpCol]) - +new Date(a[cmpCol]);
			});
			return Object.fromEntries(sorted.map((b) => [b[COLUMNS_MAP.SEQ_NUM], b]));
		}
	},
};

export default BattleManager;
