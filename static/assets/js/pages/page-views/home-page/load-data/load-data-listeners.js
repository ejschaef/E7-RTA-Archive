import { HOME_PAGE_STATES } from "../../../orchestration/page-state-manager.js";
import UserManager from "../../../../e7/user-manager.js";
import DOC_ELEMENTS from "../../../page-utilities/doc-element-references.js";
import { NavBarUtils } from "../../../page-utilities/nav-bar-utils.js";

function addEscapeButtonListener() {
	const escapeBtn = DOC_ELEMENTS.HOME_PAGE.ESCAPE_BTN;
	escapeBtn.addEventListener("click", async () => {
		const user = await UserManager.getUser();
		if (user) {
			await UserManager.setUser(user);
			NavBarUtils.writeUserInfo(user);
		} else {
			await stateDispatcher(HOME_PAGE_STATES.SELECT_DATA);
		}
	});
}

function addLoadDataListeners(_) {
	addEscapeButtonListener();
}

export { addLoadDataListeners };
