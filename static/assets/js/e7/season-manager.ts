import ClientCache from "../cache-manager.ts";
import PYAPI from "../apis/py-API.js";
import { BattleType, COLUMNS_MAP, ONE_DAY_MILLISECONDS } from "./references.ts";
import { RegExps } from "./regex.ts";

// a Season record has the following fields: "Season Number", "Code", "Season", "Start", "End", "Status"

type Season = {
	"Season Number": string;
	Code: string;
	Season: string;
	Start: string;
	End: string;
	Status: string;
	range: Date[];
};

let SeasonManager = {
	fetchAndCacheSeasonDetails: async function (): Promise<Season[]> {
		const result = await PYAPI.fetchSeasonDetails();
		if (result.error) {
			throw new Error(`Could not fetch season details: ${result.error}`);
		}
		const seasonDetails: Season[] = result.seasonDetails;
		seasonDetails.forEach((season: Season) => {
			season.range = [season["Start"], season["End"]].map(
				(d) => new Date(`${d.split(" ")[0]}T00:00:00`)
			);
			season["Season Number"] = String(season["Season Number"]);
		});

		seasonDetails.sort(
			(a, b) => parseInt(a["Season Number"]) - parseInt(b["Season Number"])
		);

		// add pre seasons
		const preSeasonFilled: Season[] = [seasonDetails[0]];
		let lastSeason = seasonDetails[0];
		seasonDetails.slice(1).forEach((season: Season) => {
			const [start, end] = [
				new Date(+lastSeason.range[1] + ONE_DAY_MILLISECONDS),
				new Date(+season.range[0] - ONE_DAY_MILLISECONDS),
			];
			const seasonNumStr = lastSeason["Season Number"] + "f";
			const preSeason = {
				"Season Number": seasonNumStr,
				Code: "pvp_rta_ss" + seasonNumStr,
				Season: `Pre ${season["Season"]}`,
				Start: start.toISOString().slice(0, 10),
				End: end.toISOString().slice(0, 10),
				Status: "Complete",
				range: [start, end],
			};
			preSeasonFilled.push(preSeason);
			preSeasonFilled.push(season);
			lastSeason = season;
		});

		// add another pre season if current season is complete
		if (lastSeason.range[1] < new Date()) {
			const start = new Date(+lastSeason.range[1] + ONE_DAY_MILLISECONDS);
			const seasonNumStr = lastSeason["Season Number"] + "f";
			const preSeason = {
				"Season Number": seasonNumStr,
				Code: "pvp_rta_ss" + seasonNumStr,
				Season: `Active Pre-Season`,
				Start: start.toISOString().slice(0, 10),
				End: "N/A",
				Status: "Active",
				range: [start, new Date()],
			};
			preSeasonFilled.push(preSeason);
		}
		preSeasonFilled.reverse();
		await ClientCache.cache(ClientCache.Keys.SEASON_DETAILS, preSeasonFilled);
		return preSeasonFilled;
	},

	getSeasonDetails: async function (): Promise<Season[]> {
		const cached = await ClientCache.get(ClientCache.Keys.SEASON_DETAILS);
		if (cached) {
			return cached;
		}
		return await SeasonManager.fetchAndCacheSeasonDetails();
	},

	clearSeasonDetails: async function () {
		await ClientCache.delete(ClientCache.Keys.SEASON_DETAILS);
		console.log("Season details cleared from data cache");
	},

	getSeasonNumFromCode: function (seasonCode: string): string {
		return seasonCode.split("_")[-1];
	},

	reaquireIfNeeded: async function (battle: BattleType[]) {
		const seasonDetails = await SeasonManager.getSeasonDetails();
		const seasonCodes = new Set(seasonDetails.map((s) => s.Code));
		battle.forEach((b) => {
			const seasonCode = b[COLUMNS_MAP.SEASON_CODE];
			if (!RegExps.SEASON_CODE_LITERAL_RE.test(seasonCode)) {
				console.error("Battle contains invalid season code:", seasonCode, b);
			}
			if (!seasonCodes.has(b[COLUMNS_MAP.SEASON_CODE])) {
				SeasonManager.fetchAndCacheSeasonDetails();
				console.log("Reacquired season details due to missing season code:", seasonCode);
				return;
			}
		});
		
	},
};

export default SeasonManager;
