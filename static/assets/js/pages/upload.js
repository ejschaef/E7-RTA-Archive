import { CSVParse, ContentManager } from "../exports.js";


document.addEventListener("DOMContentLoaded", async function () {

    //auto set the query flag using Content manager
    const checkbox = document.getElementById("auto-query-flag");
    const container = document.getElementById("auto-query-toggle-container");
    container.classList.add("no-transition");
    checkbox.checked = await ContentManager.ClientCache.getFlag("autoQuery");

    setTimeout(() => {
        container.classList.remove("no-transition");
    }, 20)


    const params = new URLSearchParams(window.location.search);

    //check if error was returned from loading the data
    if (params.get("errorMSG")) {
        document.getElementById("errorMSG").textContent = params.get("errorMSG");
    }

    checkbox.addEventListener("click", async () => {
        await ContentManager.ClientCache.setFlag("autoQuery", checkbox.checked);
    });

    let selectedFile = null;

    // Capture file when selected
    document.getElementById('csvFile').addEventListener('change', function(event) {
        selectedFile = event.target.files[0];
    });

    // Intercept form submission
    document.getElementById('uploadForm').addEventListener('submit', async function(event) {
        console.log("Processing File Submission")

        event.preventDefault(); // Prevent actual form submission to server

        if (!selectedFile) {
            document.getElementById("uploadError").textContent = "Must upload a file";
            return;
        }

        // Get its state of auto-query checkbox
        const autoQueryFlag = checkbox.checked;

        const HM = await ContentManager.HeroManager.getHeroManager();

        try {
            // parse uploaded battles into an array
            const battleArr = await CSVParse.parseUpload(selectedFile);

            // delete existing data for the old user if there was one
            await ContentManager.ClientCache.clearUserData();

            // cache uploaded battles
            const uploadedBattles = await ContentManager.BattleManager.cacheUpload(battleArr);

            const playerID = battleArr[0]["P1 ID"];
            const data = await ContentManager.UserManager.findUser({id: playerID})
            console.log("Got data:", JSON.stringify(data));
            if (!data.error) {
                await ContentManager.UserManager.setUser(data.user);
                const loadParams = {
                source : "upload",
                query : autoQueryFlag ? "true" : "false",
                }
                window.location.href = URLS.addStrParams(URLS.loadData, loadParams);
            } else {
                document.getElementById("errorMSG").textContent = data.error;
            }
        } catch (err) {
            console.error("Caught Error:", err);
            document.getElementById("uploadError").textcontent = err.message;
        }
    });

    document.getElementById("content-body").classList.remove('d-none');
});

