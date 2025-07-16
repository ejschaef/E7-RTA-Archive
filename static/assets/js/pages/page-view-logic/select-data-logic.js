import { ContentManager, PageUtils } from "../../exports.js";
import { HOME_PAGE_STATES } from "../page-utilities/page-state-manager.js";
import { CONTEXT } from "../page-utilities/home-page-context.js";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.js";

async function addUserFormListener(stateDispatcher) {
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
				console.log("Finding User");
				const result = await ContentManager.UserManager.findUser({
					name,
					world_code,
				});
				console.log("Got data:", JSON.stringify(result));
				if (!result.error) {
					await ContentManager.UserManager.clearUserData();
					await ContentManager.UserManager.setUser(result.user);
					CONTEXT.AUTO_QUERY = true;
					CONTEXT.SOURCE = CONTEXT.VALUES.SOURCE.QUERY;
					stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
					return;
				} else {
					console.log("User Not Found:", result.error);
					document.getElementById(
						"select-data-msg"
					).textContent = `Could not find user: ${name} in server: ${world_code}`;
				}
			} catch (err) {
				// You can now store the data, process it, or update your app state
				console.error("Caught Error:", err);
				document.getElementById(
					"select-data-msg"
				).textcontent = `Error encountered: ${err.message}`;
			}
		}
	});
}

async function addUploadFormListener(stateDispatcher) {
	const checkbox = document.getElementById("auto-query-flag");

	checkbox.checked = await ContentManager.ClientCache.getFlag("autoQuery");

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
				await ContentManager.UserManager.clearUserData();
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
	const checkbox = document.getElementById("auto-query-flag");
	checkbox.checked = await ContentManager.ClientCache.getFlag("autoQuery");
	const msgElement = DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG;
	msgElement.textContent = "";
	if (CONTEXT.ERROR_MSG) {
		const errorMSG = CONTEXT.popKey(CONTEXT.KEYS.ERROR_MSG);
		console.log("Setting Error Message:", errorMSG);
		PageUtils.setTextRed(msgElement, errorMSG);
	}
}

export { initializeSelectDataLogic, runSelectDataLogic };
