import HeroManager from "../../e7/hero-manager.ts";
import { FilterParser } from "../../e7/filter-parsing/filter-parser.ts";
import {
	TextController,
	TextPacket,
} from "../orchestration/text-controller.js";

let PageUtils = {
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
			let parser = await FilterParser.fromFilterStr(str, HM);
			console.log(parser.asString());
			TextController.write(
				new TextPacket("Validation Passed", filterMSG, [
					TextController.STYLES.GREEN,
				])
			);
			return true;
		} catch (err) {
			console.error(err);
			TextController.write(
				new TextPacket(`Validation Failed: ${err.message}`, filterMSG, [
					TextController.STYLES.RED,
				])
			);
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

	setVisibility(element, visible) {
		if (visible) {
			element.classList.remove("d-none");
		} else {
			element.classList.add("d-none");
		}
	},
};

export default PageUtils;
