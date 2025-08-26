import ClientCache from "../cache-manager.ts";
import StatsBuilder from "./stats-builder.js";
import {
	buildFormattedBattleMap,
	parsedCSVToFormattedBattleMap,
} from "./battle-transform.js";
import { StandardFilter, GlobalFilter } from "./filter-parsing/functions.ts";
import { COLUMNS_MAP } from "./references.ts";

let BattleManager = {
	loaded_servers: new Set(),

	// gets battles (upload and/or queried) and returns as list in clean format; used directly to populate battles table
	getBattles: async function () {
		console.log("Getting battles");
		return (await ClientCache.get(ClientCache.Keys.BATTLES)) ?? null;
	},

	// Removes all user battle data from cache, should be called when user is switched out
	removeBattles: async function () {
		await ClientCache.delete(ClientCache.Keys.BATTLES);
		await ClientCache.delete(ClientCache.Keys.UPLOADED_BATTLES);
		await ClientCache.delete(ClientCache.Keys.FILTERED_BATTLES);
		console.log(
			"Removed battle data from cache; cleared ['BATTLES', 'UPLOADED_BATTLES', 'FILTERED_BATTLES']"
		);
	},

	removeFilteredBattles: async function () {
		await ClientCache.delete(ClientCache.Keys.FILTERED_BATTLES);
		console.log(
			"Removed filtered battle data from cache; cleared ['FILTERED_BATTLES']"
		);
	},

	/* after battles are set in cache, applies filters to the battles and stores filtered arr in cache under filtered 
  battle key all battles are stored in their clean format, not numerical format; convert after to compute metrics */
	applyFilter: async function (filters) {
		let battles = await this.getBattles();
		const localFilterList = filters.filter((f) => f instanceof StandardFilter);
		const globalFilterList = filters.filter((f) => f instanceof GlobalFilter);

		// apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
		let battleList = Object.values(battles);
		for (let filter of globalFilterList) {
			console.log(`Applying global filter: ${filter.asString()}`);
			const startLen = battleList.length;
			battleList = filter.call(battleList);
			battles = Object.fromEntries(battleList.map((b) => [b["Seq Num"], b]));
			console.log(
				`Filtered ${
					startLen - battleList.length
				} out of ${startLen}; new total = ${battleList.length}`
			);
		}

		// apply local filters (filters that can be resolved on each battle without context of other battles)
		for (let filter of localFilterList) {
			console.log(`Applying local filter: ${filter.asString()}`);
			const startLen = Object.keys(battles).length;
			battles = Object.fromEntries(
				Object.entries(battles).filter(([key, battle]) => {
					const include = filter.call(battle);
					//console.log(`Filtering battle: ${key} ${include ? "included" : "excluded"}`);
					return include;
				})
			);
			console.log(
				`Filtered ${
					startLen - Object.keys(battles).length
				} out of ${startLen}; new total = ${Object.keys(battles).length}`
			);
		}

		console.log(
			`Caching filtered battles ; total = ${Object.keys(battles).length}`
		);
		await ClientCache.cache(ClientCache.Keys.FILTERED_BATTLES, battles);
		console.log(
			`Filtered battles and stored in cache; modified ['FILTERED_BATTLES']; Applied total of <${
				localFilterList.length + globalFilterList.length
			}> filters`
		);
		return battles;
	},

	//takes in list of battles then converts to dict and then adds to cached battles
	extendBattles: async function (cleanBattleMap) {
		let oldDict = (await ClientCache.get(ClientCache.Keys.BATTLES)) ?? {};

		// new battles automatically overwrite old ones if they share same seq_num
		const newDict = { ...oldDict, ...this.sortBattlesObj(cleanBattleMap) };
		await ClientCache.cache(ClientCache.Keys.BATTLES, newDict);
		console.log("Extended user data in cache");
		return newDict;
	},

	//Takes queried battles, clean format and extend in cache
	cacheQuery: async function (battleList, HeroDicts, artifacts) {
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
	cacheUpload: async function (rawParsedBattleList, HeroDicts) {
		if (!rawParsedBattleList) {
			console.error("No uploaded battles provided to cacheUpload");
			return {};
		}
		const cleanBattles = parsedCSVToFormattedBattleMap(
			rawParsedBattleList,
			HeroDicts
		);
		await ClientCache.cache(ClientCache.Keys.UPLOADED_BATTLES, cleanBattles);
		let battles = await this.extendBattles(cleanBattles);
		console.log(
			"Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]"
		);
		return battles;
	},

	getStats: async function (battles, filters, HeroDicts) {
		console.log("Getting stats");
		const numFilters = filters.length;

		console.log(`Applying ${numFilters} filters`);
		const battlesList = Object.values(battles);
		const filteredBattles = await this.applyFilter(filters);
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
			filteredBattlesList,
			HeroDicts
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


	sortBattlesList: function (battlesList, asc = true) {
		const cmpCol = COLUMNS_MAP.DATE_TIME;
		if (asc) {
			return battlesList.sort((a, b) => {
				return new Date(a[cmpCol]) - new Date(b[cmpCol]);
			});
		} else {
			return battlesList.sort((a, b) => {
				return new Date(b[cmpCol]) - new Date(a[cmpCol]);
			});
		}
	},

	sortBattlesObj: function (battlesObj, asc = true) {
		const cmpCol = COLUMNS_MAP.DATE_TIME;
		if (asc) {
			let sorted = Object.values(battlesObj).sort((a, b) => {
				return new Date(a[cmpCol]) - new Date(b[cmpCol]);
			});
			return Object.fromEntries(sorted.map((b) => [b[COLUMNS_MAP.SEQ_NUM], b]));
		} else {
			let sorted = Object.values(battlesObj).sort((a, b) => {
				return new Date(b[cmpCol]) - new Date(a[cmpCol]);
			});
			return Object.fromEntries(sorted.map((b) => [b[COLUMNS_MAP.SEQ_NUM], b]));
		}
	},
};

export default BattleManager;
