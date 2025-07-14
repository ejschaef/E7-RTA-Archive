import { CSVParse, ContentManager } from "../../exports.js";
import { HOME_PAGE_STATES } from "../page-utilities/page-state-manager.js";
import { CONTEXT } from "../page-utilities/context-references.js";

async function addUserFormListener(stateDispatcher, contextFlags) {
	const form = document.getElementById("userForm");

	// Intercept form submission
	form.addEventListener("submit", async function (event) {
		console.log("Processing User Submission");

		event.preventDefault(); // Prevent actual form submission to server

		const data = new FormData(form);

		const name = data.get("username");
		const world_code = data.get("server");

		if (!name) {
			document.getElementById("errorMSG").textContent = "Must enter username";
		} else {
			try {
				console.log("Finding User");
				const result = await ContentManager.UserManager.findUser({
					name,
					world_code,
				});
				console.log("Got data:", JSON.stringify(result));
				if (!result.error) {
					await ContentManager.UserManager.setUser(result.user);
					contextFlags[CONTEXT.KEYS.QUERY] = true;
					contextFlags.SOURCE = CONTEXT.VALUES.SOURCE.QUERY;
					stateDispatcher(HOME_PAGE_STATES.LOAD_DATA, contextFlags);
				} else {
					console.log("User Not Found:", result.error);
					document.getElementById(
						"errorMSG"
					).textContent = `Could not find user: ${name} in server: ${world_code}`;
				}
			} catch (err) {
				// You can now store the data, process it, or update your app state
				console.error("Caught Error:", err);
				document.getElementById(
					"errorMSG"
				).textcontent = `Error encountered: ${err.message}`;
			}
		}
	});
}

async function addUploadFormListener(stateDispatcher, contextFlags) {
	const checkbox = document.getElementById("auto-query-flag");

	checkbox.checked = await ContentManager.ClientCache.getFlag("autoQuery");

	checkbox.addEventListener("click", async () => {
		await ContentManager.ClientCache.setFlag("autoQuery", checkbox.checked);
	});

	let selectedFile = null;

	// Capture file when selected
	document
		.getElementById("csvFile")
		.addEventListener("change", function (event) {
			selectedFile = event.target.files[0];
		});

	// Intercept form submission
	document
		.getElementById("uploadForm")
		.addEventListener("submit", async function (event) {
			console.log("Processing File Submission");

			event.preventDefault(); // Prevent actual form submission to server

			// Get its state of auto-query checkbox
			const autoQueryFlag = checkbox.checked;

			try {
				// parse uploaded battles into an array
				const battleArr = await CSVParse.parseUpload(selectedFile);

        const HM = await ContentManager.HeroManager.getHeroManager();

				// delete existing data for the old user if there was one
				await ContentManager.ClientCache.clearUserData();

				// cache uploaded battles
				await ContentManager.BattleManager.cacheUpload(battleArr, HM);


				const playerID = battleArr[0]["P1 ID"];
				const data = await ContentManager.UserManager.findUser({
					id: playerID,
				});
				console.log("Got data:", JSON.stringify(data));
				if (!data.error) {
					await ContentManager.UserManager.setUser(data.user);
					contextFlags[CONTEXT.KEYS.QUERY] = autoQueryFlag;
					contextFlags[CONTEXT.KEYS.SOURCE] = CONTEXT.VALUES.SOURCE.UPLOAD;
					stateDispatcher(HOME_PAGE_STATES.LOAD_DATA, contextFlags);
				} else {
          console.log("Setting Error Message:", data.error);
					document.getElementById("errorMSG").textContent = data.error;
          console.log("Error Message is now:", document.getElementById("errorMSG").textContent);
				}
			} catch (err) {
				console.error("Caught Error:", err);
				document.getElementById("errorMSG").textContent = err.message;
			}
		});
}

async function initializeSelectDataLogic(stateDispatcher, contextFlags) {
	addUserFormListener(stateDispatcher, contextFlags);
	addUploadFormListener(stateDispatcher, contextFlags);
}

async function runSelectDataLogic(stateDispatcher, contextFlags) {
	const checkbox = document.getElementById("auto-query-flag");
	checkbox.checked = await ContentManager.ClientCache.getFlag("autoQuery");
  document.getElementById("errorMSG").textContent = "";
	if (contextFlags[CONTEXT.KEYS.ERROR_MSG]) {
		const errorMSG = contextFlags[CONTEXT.KEYS.ERROR_MSG];
    console.log("Setting Error Message:", errorMSG);
		document.getElementById("errorMSG").textContent = errorMSG;
		contextFlags[CONTEXT.KEYS.ERROR_MSG] = null;
	}
}

export { initializeSelectDataLogic, runSelectDataLogic };
