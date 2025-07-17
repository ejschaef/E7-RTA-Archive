import BattleManager from "../../e7/battle-manager.js";
import PYAPI from "../../apis/py-API.js";
import HeroManager from "../../e7/hero-manager.js";
import FilterSyntaxParser from "../../e7/filter-syntax-parser.js";
import ArtifactManager from "../../e7/artifact-manager.js";
import { CONTEXT } from "./home-page-context.js";
import { HOME_PAGE_STATES } from "./page-state-manager.js";


let PageUtils = {
	queryAndCacheBattles: async function (user, stateDispatcher, HM) {
		let artifacts = await ArtifactManager.getArtifacts();
		let response = await PYAPI.rsFetchBattleData(user);
		if (!response.ok) {
			const error = await response.json().error;
			const errorMSG = `Error while fetching data: ${error}`;
			console.error(`Error while fetching data: ${error}`);
			CONTEXT.ERROR_MSG = errorMSG;
			stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
		} else {
			const data = await response.json();
			const rawBattles = data.battles;
			await BattleManager.cacheQuery(rawBattles, HM, artifacts);
			console.log("Cached queried battles");
		}
	},

	addStrParam: function (URL, key, val) {
		const encodedParam = encodeURIComponent(val);
		URL = `${URL}?${key}=${encodedParam}`;
		return URL;
	},

	addStrParams: function (URL, obj) {
		for (let key in obj) {
			URL = this.addStrParam(URL, key, obj[key]);
		}
		return URL;
	},

	validateFilterSyntax: async function (str) {
		const HM = await HeroManager.getHeroManager();
		let filterMSG = document.getElementById("filterMSG");
		try {
			await FilterSyntaxParser.createAndParse(str, HM);
			filterMSG.textContent = "Validation Passed";
			filterMSG.classList.remove("text-danger");
			filterMSG.classList.add("text-safe");
			return true;
		} catch (err) {
			console.error(err);
			filterMSG.textContent = `Validation Failed: ${err.message}`;
			filterMSG.classList.remove("text-safe");
			filterMSG.classList.add("text-danger");
			return false;
		}
	},

	setScrollPercent: function (percent) {
		console.log(`Scrolling to ${percent}%`);
		const maxScroll =
			document.documentElement.scrollHeight - window.innerHeight;
		const targetScroll = (percent / 100) * maxScroll;
		// Temporarily disable CSS smooth scrolling
		const html = document.documentElement;
		const prevScrollBehavior = html.style.scrollBehavior;
		html.style.scrollBehavior = "auto";

		window.scrollTo({ top: targetScroll });

		// Restore previous behavior
		html.style.scrollBehavior = prevScrollBehavior;
	},

	getScrollPercent: function () {
		const scrollTop = window.scrollY || document.documentElement.scrollTop;
		const scrollHeight = document.documentElement.scrollHeight;
		const clientHeight = window.innerHeight;
		const maxScroll = scrollHeight - clientHeight;

		if (maxScroll === 0) return 0; // avoid division by zero

		return (scrollTop / maxScroll) * 100;
	},

	setTextGreen(element, text) {
		element.textContent = text;
		element.classList.remove("text-danger");
		element.classList.add("text-safe");
	},

	setTextRed(element, text) {
		element.textContent = text;
		element.classList.remove("text-safe");
		element.classList.add("text-danger");
	},

	setVisibility(element, visible) {
		if (visible) {
			element.classList.remove("d-none");
		} else {
			element.classList.add("d-none");
		}
	},
};

export default PageUtils;
