import {
	HOME_PAGE_STATES,
} from "../../../../orchestration/page-state-manager.js";
import { CONTEXT } from "../../../home-page-context.js";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references.js";
import {
	TextController,
	TextPacket,
} from "../../../../orchestration/text-controller.js";
import { CM } from "../../../../../content-manager.js";

function writeMsgRed(msg) {
	TextController.write(
		new TextPacket(msg, DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG, [
			TextController.STYLES.RED,
		])
	);
}

async function addUserFormListener(stateDispatcher) {
	const checkbox = DOC_ELEMENTS.HOME_PAGE.ID_SEARCH_FLAG;
	const key = CM.ClientCache.Keys.ID_SEARCH_FLAG;
	checkbox.addEventListener("click", async () => {
		await CM.ClientCache.cache(key, checkbox.checked);
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
			writeMsgRed("Must enter username");
		} else {
			try {
				const idSearchFlag = await CM.ClientCache.get(
					CM.ClientCache.Keys.ID_SEARCH_FLAG
				);
				const userObj = idSearchFlag
					? { id: name, world_code }
					: { name, world_code };
				CONTEXT.TRY_SET_USER = userObj;
				CONTEXT.AUTO_QUERY = true;
				CONTEXT.SOURCE = CONTEXT.VALUES.SOURCE.QUERY;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
				return;
			} catch (err) {
				console.error("Caught Error:", err);
				writeMsgRed(err.message);
			}
		}
	});
}

async function addUploadFormListener(stateDispatcher) {
	const checkbox = document.getElementById("auto-query-flag");
	checkbox.addEventListener("click", async () => {
		await CM.ClientCache.setFlag("autoQuery", checkbox.checked);
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

			try {
				// parse uploaded battles into an array
				if (!selectedFile) {
					writeMsgRed("Must upload a file");
					return;
				}
				console.log(
					`Selected File: ${selectedFile.name} ; content: ${JSON.stringify(
						selectedFile
					)}`
				);
				await CM.ClientCache.cache(
					CM.ClientCache.Keys.RAW_UPLOAD,
					selectedFile
				);
				CONTEXT.AUTO_QUERY = autoQueryFlag;
				CONTEXT.SOURCE = CONTEXT.VALUES.SOURCE.UPLOAD;
				stateDispatcher(HOME_PAGE_STATES.LOAD_DATA);
				return;
			} catch (err) {
				console.error("Caught Error:", err);
				writeMsgRed(err.message);
			}
		}
	);
}

function addSelectDataListeners(stateDispatcher) {
	addUserFormListener(stateDispatcher);
	addUploadFormListener(stateDispatcher);
}

export { addSelectDataListeners };
