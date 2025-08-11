import ClientCache from "../cache-manager.js";
import PYAPI from "../apis/py-API.js";
import { ONE_DAY } from "./references.ts";

// a Season record has the following fields: "Season Number", "Code", "Season", "Start", "End", "Status"

let SeasonManager = {
	fetchAndCacheSeasonDetails: async function () {
		const result = await PYAPI.fetchSeasonDetails();
		if (result.error) {
			throw new Error(`Could not fetch season details: ${result.error}`);
		}
		const seasonDetails = result.seasonDetails;
		seasonDetails.forEach((season) => {
			season.range = [season["Start"], season["End"]].map(
				(d) => new Date(`${d.split(" ")[0]}T00:00:00`)
			);
			season["Season Number"] = String(season["Season Number"]);
		});

		seasonDetails.sort(
			(a, b) => parseInt(a["Season Number"]) - parseInt(b["Season Number"])
		);

		// add pre seasons
		const preSeasonFilled = [seasonDetails[0]];
		let lastSeason = seasonDetails[0];
		seasonDetails.slice(1).forEach((season) => {
			const [start, end] = [
				new Date(+lastSeason.range[1] + ONE_DAY),
				new Date(+season.range[0] - ONE_DAY),
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
			const start = new Date(+preSeasonFilled.at(-1).range[1] + ONE_DAY);
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

	getSeasonDetails: async function () {
		return (
			(await ClientCache.get(ClientCache.Keys.SEASON_DETAILS)) ??
			(await SeasonManager.fetchAndCacheSeasonDetails())
		);
	},

	clearSeasonDetails: async function () {
		await ClientCache.delete(ClientCache.Keys.SEASON_DETAILS);
		console.log("Season details cleared from data cache");
	},
};

export default SeasonManager;
