import {
	PageStateManager,
	HOME_PAGE_STATES,
} from "../orchestration/page-state-manager.js";
import { E7_GG_HOME_URL, E7_STOVE_HOME_URL, WORLD_CODE_TO_CLEAN_STR } from "../../e7/references.ts";
import UserManager from "../../e7/user-manager.ts";
import DOC_ELEMENTS from "./doc-element-references.js";
import IPM from "../orchestration/inter-page-manager.ts";
import { CM } from "../../content-manager.js";
import { convertBattlesToCSV, currentTimestamp, downloadCSV, openUrlInNewTab } from "../../utils.ts";

function navToHome() {
	window.location.href = URL_UTILS.HOME_PAGE_URL;
}

// used for pages outside of home page to handle nav bar (will always switch pages)
function addNavListeners() {
	document.querySelectorAll(".nav-link").forEach((link) => {
		link.addEventListener("click", async function (event) {
			const navType = this.dataset.nav;
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
							messages: ["Active user not found; you must either query a valid user or upload battles to view hero stats."],
							actions: [IPM.ACTIONS.SHOW_NO_USER_MSG],
						})
						navToHome();
					} else {
						await PageStateManager.setState(HOME_PAGE_STATES.SHOW_STATS);
						navToHome();
					}
				}
			} else {
				// Default behavior continues as normal
				console.log(`Navigating to: ${this.href}`);
			}
		});
	});
}

function addClearDataBtnListener() {
	DOC_ELEMENTS.NAV_BAR.CLEAR_DATA_BTN.addEventListener(
		"click",
		async function (_event) {
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

function writeUserInfo(user) {
	if (user) {
		DOC_ELEMENTS.NAV_BAR.USER_NAME.innerText = user.name;
		DOC_ELEMENTS.NAV_BAR.USER_ID.innerText = user.id;
		DOC_ELEMENTS.NAV_BAR.USER_SERVER.innerText =
			WORLD_CODE_TO_CLEAN_STR[user.world_code];
	} else {
		DOC_ELEMENTS.NAV_BAR.USER_NAME.innerText = "(None)";
		DOC_ELEMENTS.NAV_BAR.USER_ID.innerText = "(None)";
		DOC_ELEMENTS.NAV_BAR.USER_SERVER.innerText = "(None)";
	}
}

function addExportCSVBtnListener() {
	DOC_ELEMENTS.NAV_BAR.EXPORT_CSV_BTN.addEventListener("click", async function () {
		const user = await CM.UserManager.getUser();
		if (!user) {
			await IPM.pushState({
				messages: ["User not found; cannot export data without an active user"],
				actions: [IPM.ACTIONS.SHOW_NO_USER_MSG],
			})
			await PageStateManager.setState(HOME_PAGE_STATES.SELECT_DATA);
			navToHome();
		}
		const timestamp = currentTimestamp().split("T")[0] || "";
		const fileName = `${user.name} (${user.id}) ${timestamp}.csv`;
		const battles = await CM.BattleManager.getBattles();
		const battlesList = Object.values(battles);
		const csvStr = convertBattlesToCSV(battlesList);
		downloadCSV(csvStr, fileName);
	});
}


function generateGGLink(user, lang) {
	const url = `${E7_STOVE_HOME_URL}/${lang}/gg/battlerecord/${user.world_code}/${user.id}`;
	return url;
}

function addOfficialSiteBtnListener() {
	DOC_ELEMENTS.NAV_BAR.OFFICIAL_SITE_BTN.addEventListener("click", async function () {
		const user = await CM.UserManager.getUser();
		if (!user) {
			openUrlInNewTab(E7_GG_HOME_URL);
		}
		else {
			const lang = await CM.LangManager.getLang();
			const url = generateGGLink(user, lang);
			openUrlInNewTab(url);
		}
	});
}



async function initialize() {
	const user = await UserManager.getUser();
	writeUserInfo(user);
	addNavListeners();
	addClearDataBtnListener();
	addExportCSVBtnListener();
	addOfficialSiteBtnListener();
}

let NavBarUtils = {
	addNavListeners: addNavListeners,
	addClearDataBtnListener: addClearDataBtnListener,
	writeUserInfo: writeUserInfo,
	initialize: initialize,
	navToHome: navToHome,
	addExportCSVBtnListener: addExportCSVBtnListener,
	addOfficialSiteBtnListener: addOfficialSiteBtnListener
};

export { NavBarUtils };
