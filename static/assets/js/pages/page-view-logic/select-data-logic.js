import { ContentManager, PageUtils } from "../../exports.js";
import {
	HOME_PAGE_STATES,
	HOME_PAGE_FNS,
} from "../page-utilities/page-state-manager.js";
import { CONTEXT } from "../page-utilities/home-page-context.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.js";
import { WORLD_CODE_TO_CLEAN_STR } from "../../e7/references.js";

async function addUserFormListener(stateDispatcher) {
	const checkbox = DOC_ELEMENTS.HOME_PAGE.ID_SEARCH_FLAG;
	const key = ContentManager.ClientCache.Keys.ID_SEARCH_FLAG;
	checkbox.addEventListener("click", async () => {
		await ContentManager.ClientCache.cache(key, checkbox.checked);
	});

	const form = document.getElementById("userForm");

	// Intercept form submission
	form.addEventListener("submit", async function (event) {
		console.log("Processing User Submission");

		event.preventDefault(); // Prevent actual form submission to server

		const data = new FormData(form);

		const name = data.get("username");
		const world_code = data.get("server");

		if (!name) {
			PageUtils.setTextRed(
				DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
				"Must enter username"
			);
		} else {
			try {
				const idSearchFlag = await ContentManager.ClientCache.get(
					ContentManager.ClientCache.Keys.ID_SEARCH_FLAG
				);
				const userObj = idSearchFlag
					? { id: name, world_code }
					: { name, world_code };
				console.log("Finding User using:", userObj);
				const user = await ContentManager.UserManager.findUser(userObj);
				console.log("Got data:", JSON.stringify(user));
				if (user !== null) {
					await HOME_PAGE_FNS.homePageSetUser(user);
					CONTEXT.AUTO_QUERY = true;
					CONTEXT.SOURCE = CONTEXT.VALUES.SOURCE.QUERY;
					stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
					return;
				}
				PageUtils.setTextRed(
					DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
					`Could not find user: ${name} in server: ${WORLD_CODE_TO_CLEAN_STR[world_code]}`
				)
			} catch (err) {
				console.error("Caught Error:", err);
				PageUtils.setTextRed(
					DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG,
					err.message
				)
			}
		}
	});
}

async function addUploadFormListener(stateDispatcher) {
	const checkbox = document.getElementById("auto-query-flag");
	checkbox.addEventListener("click", async () => {
		await ContentManager.ClientCache.setFlag("autoQuery", checkbox.checked);
	});

	let selectedFile = null;

	// Capture file when selected
	DOC_ELEMENTS.HOME_PAGE.CSV_FILE.addEventListener("change", function (event) {
		selectedFile = event.target.files[0];
	});

	// Intercept form submission
	DOC_ELEMENTS.HOME_PAGE.UPLOAD_FORM.addEventListener(
		"submit",
		async function (event) {
			console.log("Processing File Submission");

			event.preventDefault(); // Prevent actual form submission to server

			// Get its state of auto-query checkbox
			const autoQueryFlag = checkbox.checked;
			const msgElement = DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG;

			try {
				// parse uploaded battles into an array
				if (!selectedFile) {
					PageUtils.setTextRed(msgElement, "Must upload a file");
					return;
				}
				console.log(
					`Selected File: ${selectedFile.name} ; content: ${JSON.stringify(
						selectedFile
					)}`
				);
				await ContentManager.ClientCache.cache(
					ContentManager.ClientCache.Keys.RAW_UPLOAD,
					selectedFile
				);
				CONTEXT.AUTO_QUERY = autoQueryFlag;
				CONTEXT.SOURCE = CONTEXT.VALUES.SOURCE.UPLOAD;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
				return;
			} catch (err) {
				console.error("Caught Error:", err);
				PageUtils.setTextRed(msgElement, err.message);
			}
		}
	);
}

async function initializeSelectDataLogic(stateDispatcher) {
	addUserFormListener(stateDispatcher);
	addUploadFormListener(stateDispatcher);
}

async function runSelectDataLogic(stateDispatcher) {

	const autoQueryFlag = document.getElementById("auto-query-flag");
	autoQueryFlag.checked = await ContentManager.ClientCache.getFlag("autoQuery");

	const idSearchFlag = DOC_ELEMENTS.HOME_PAGE.ID_SEARCH_FLAG;
	idSearchFlag.checked = await ContentManager.ClientCache.getFlag("idSearch");

	const msgElement = DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG;
	msgElement.textContent = "";

	if (CONTEXT.ERROR_MSG) {
		const errorMSG = CONTEXT.popKey(CONTEXT.KEYS.ERROR_MSG);
		console.log("Setting Error Message:", errorMSG);
		PageUtils.setTextRed(msgElement, errorMSG);
	}
}

export { initializeSelectDataLogic, runSelectDataLogic };
