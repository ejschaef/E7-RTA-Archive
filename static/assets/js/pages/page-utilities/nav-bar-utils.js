import { PageStateManager, HOME_PAGE_STATES } from "./page-state-manager.js";
import { WORLD_CODE_TO_CLEAN_STR } from "../../e7/references.js";
import UserManager from "../../e7/user-manager.js";
import DOC_ELEMENTS from "./doc-element-references.js";
import IPM from "./inter-page-manager.js";

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
                        await IPM.pushActions([IPM.ACTIONS.SHOW_NO_USER_MSG]);
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
    DOC_ELEMENTS.HOME_PAGE.CLEAR_DATA_BTN.addEventListener(
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
		DOC_ELEMENTS.HOME_PAGE.USER_NAME.innerText = user.name;
		DOC_ELEMENTS.HOME_PAGE.USER_ID.innerText = user.id;
		DOC_ELEMENTS.HOME_PAGE.USER_SERVER.innerText = WORLD_CODE_TO_CLEAN_STR[user.world_code];
	} else {
		DOC_ELEMENTS.HOME_PAGE.USER_NAME.innerText = "(None)";
		DOC_ELEMENTS.HOME_PAGE.USER_ID.innerText = "(None)";
		DOC_ELEMENTS.HOME_PAGE.USER_SERVER.innerText = "(None)";
	}
}

async function initialize() {
    const user = await UserManager.getUser();
    writeUserInfo(user);
    addNavListeners();
    addClearDataBtnListener();
}


let NavBarUtils = {
    addNavListeners: addNavListeners,
    addClearDataBtnListener: addClearDataBtnListener,
    writeUserInfo: writeUserInfo,
    initialize: initialize,
    navToHome: navToHome,
};

export { NavBarUtils };