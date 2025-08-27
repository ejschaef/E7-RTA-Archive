import {
	PageStateManager,
	HOME_PAGE_STATES,
} from "../orchestration/page-state-manager.js";
import {
	BattleType,
	CSVHeaders,
	E7_GG_HOME_URL,
	E7_STOVE_HOME_URL,
	LanguageCode,
	WORLD_CODE_TO_CLEAN_STR,
} from "../../e7/references.ts";
import UserManager, { User } from "../../e7/user-manager.ts";
import DOC_ELEMENTS from "./doc-element-references.js";
import IPM from "../orchestration/inter-page-manager.ts";
import { ContentManager } from "../../content-manager.ts";
import { LangManager } from "../../lang-manager.ts";
import { ExportImportFns } from "../../export-import-data-tools.ts";

function navToHome() {
	// @ts-ignore
	window.location.href = URL_UTILS.HOME_PAGE_URL;
}

// used for pages outside of home page to handle nav bar (will always switch pages)
function addNavListeners() {
	document.querySelectorAll(".nav-link").forEach((link: Element) => {
		link.addEventListener("click", async function (event) {
			if (!("dataset" in link) || !(link.dataset && typeof link.dataset === "object" && "nav" in link.dataset)) return;
			const navType = link.dataset.nav as string;
			console.log("Clicked nav item:", navType);
			if (Object.values(HOME_PAGE_STATES).includes(navType)) {
				if (navType === HOME_PAGE_STATES.SELECT_DATA) {
					await PageStateManager.setState(HOME_PAGE_STATES.SELECT_DATA);
					navToHome();
				} else if (navType === HOME_PAGE_STATES.SHOW_STATS) {
					const user = await UserManager.getUser();
					// Stats will not show if there is no active user ; will redirect to select data view with error
					if (!user) {
						await PageStateManager.setState(HOME_PAGE_STATES.SELECT_DATA);
						await IPM.pushState({
							messages: [
								"Active user not found; you must either query a valid user or upload battles to view hero stats.",
							],
							actions: [IPM.ACTIONS.SHOW_NO_USER_MSG],
						});
						navToHome();
					} else {
						await PageStateManager.setState(HOME_PAGE_STATES.SHOW_STATS);
						navToHome();
					}
				}
			}
		});
	});
}

function addClearDataBtnListener() {
	DOC_ELEMENTS.NAV_BAR.CLEAR_DATA_BTN.addEventListener(
		"click",
		async function () {
			const user = await UserManager.getUser();
			if (user) {
				await PageStateManager.setState(HOME_PAGE_STATES.SELECT_DATA);
				await IPM.pushActions([IPM.ACTIONS.CLEAR_USER]);
			} else {
				await PageStateManager.setState(HOME_PAGE_STATES.SELECT_DATA);
				await IPM.pushActions([IPM.ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG]);
			}
			navToHome();
		}
	);
}

/**
 * Simulates hover on mobile devices for "brace" buttons (buttons with a dashed
 * border). When a button is touched, it adds a class to simulate a hover effect.
 * The class is automatically removed after 150ms.
 */
function addBraceButtonListeners() {
	const braceButtons = [
		DOC_ELEMENTS.NAV_BAR.CLEAR_DATA_BTN,
		DOC_ELEMENTS.NAV_BAR.EXPORT_DATA_BTN,
		DOC_ELEMENTS.NAV_BAR.OFFICIAL_SITE_BTN
	]
	console.log("Adding brace button listeners");
	braceButtons.forEach((btn) => {
		// Simulate hover on mobile
		btn.addEventListener("touchstart", () => {
			btn.classList.add("touch-hover");
			// Auto-expire hover
			setTimeout(() => btn.classList.remove("touch-hover"), 150);
		});
	});
}

function writeUserInfo(user: User | null, lang: LanguageCode = "en") {
	if (user) {
		DOC_ELEMENTS.NAV_BAR.USER_NAME.innerText = user.name;
		DOC_ELEMENTS.NAV_BAR.USER_ID.innerText = user.id;
		DOC_ELEMENTS.NAV_BAR.USER_SERVER.innerText =
			WORLD_CODE_TO_CLEAN_STR[user.world_code];
		DOC_ELEMENTS.NAV_BAR.OFFICIAL_SITE_BTN.onclick = () => {
			window.open(generateGGLink(user, lang), "_blank", "noopener,noreferrer");
		};
	} else {
		DOC_ELEMENTS.NAV_BAR.USER_NAME.innerText = "(None)";
		DOC_ELEMENTS.NAV_BAR.USER_ID.innerText = "(None)";
		DOC_ELEMENTS.NAV_BAR.USER_SERVER.innerText = "(None)";
		DOC_ELEMENTS.NAV_BAR.OFFICIAL_SITE_BTN.onclick = () => {
			window.open(E7_GG_HOME_URL, "_blank", "noopener,noreferrer");
		};
	}
}

export function convertBattlesToCSV(arr: BattleType[]): string {
	const headers = CSVHeaders;
	const csvRows = [];

	// add headers
	csvRows.push(headers.map(h => `"${h}"`).join(","));

	// add rows
	for (const obj of arr) {
		const values = headers.map(h => {
			let v = obj[h] ?? "";
			if (Array.isArray(v)) v = JSON.stringify(v).replace(/"/g, '""');
			return `"${v}"`;
		});
		csvRows.push(values.join(","));
	}
	return csvRows.join("\n");
}

export function downloadCSV(csv: string, filename: string) {
	const BOM = "\uFEFF";
	const csvFile = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
	const downloadLink = document.createElement("a");
	downloadLink.download = filename;
	downloadLink.href = window.URL.createObjectURL(csvFile);
	downloadLink.style.display = "none";
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

function addExportDataBtnListener() {
	DOC_ELEMENTS.NAV_BAR.EXPORT_DATA_BTN.addEventListener(
		"click",
		async function () {
			const user = await ContentManager.UserManager.getUser();
			if (!user) {
				await IPM.pushState({
					messages: [
						"User not found; cannot export data without an active user",
					],
					actions: [IPM.ACTIONS.SHOW_NO_USER_MSG],
				});
				await PageStateManager.setState(HOME_PAGE_STATES.SELECT_DATA);
				navToHome();
				return;
			}
			await ExportImportFns.triggerDownload();
		}
	);
}

async function eraseUserFromPage() {
	await UserManager.clearUserData();
	writeUserInfo(null);
}

async function setUserOnPage(user: User) {
	await UserManager.setUser(user);
	const lang = await LangManager.getLang();
	writeUserInfo(user, lang);
}

function generateGGLink(user: User, lang: LanguageCode) {
	const url = `${E7_STOVE_HOME_URL}/${lang}/gg/battlerecord/${user.world_code}/${user.id}`;
	return url;
}

async function initialize() {
	const user = await UserManager.getUser();
	writeUserInfo(user);
	addNavListeners();
	addClearDataBtnListener();
	addExportDataBtnListener();
	addBraceButtonListeners();
}

let NavBarUtils = {
	addNavListeners: addNavListeners,
	addClearDataBtnListener: addClearDataBtnListener,
	writeUserInfo: writeUserInfo,
	initialize: initialize,
	navToHome: navToHome,
	addExportDataBtnListener: addExportDataBtnListener,
	addBraceButtonListeners: addBraceButtonListeners,
	eraseUserFromPage: eraseUserFromPage,
	setUserOnPage: setUserOnPage,
};

export { NavBarUtils };
