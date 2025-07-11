import { ContentManager } from "../exports.js";

document.addEventListener("DOMContentLoaded", async function () {

    const params = new URLSearchParams(window.location.search);

    if (params.get("errorMSG")) {
        let msg = params.get("errorMSG");
        if (msg === "Type1: no user") {
        msg = "Must either query a valid user or upload battles to view hero stats; there is no active user";
        }
        document.getElementById("errorMSG").textContent = msg;
    }
    const form = document.getElementById("userForm");

    // Intercept form submission
    form.addEventListener('submit', async function(event) {
        console.log("Processing User Submission")

        event.preventDefault(); // Prevent actual form submission to server

        const data = new FormData(form);
        
        const name = data.get("username");
        const world_code = data.get("server");

        if (!name) {
            document.getElementById("errorMSG").textContent = "Must enter username"
        } else {
            try {
            const result = await ContentManager.UserManager.findUser({name, world_code})
                if (!result.error) {
                await ContentManager.UserManager.setUser(result.user);
                const loadParams = {
                    source : "query",
                    query : "true"
                }
                window.location.href = URLS.addStrParams(URLS.loadData, loadParams);
                } else {
                document.getElementById("errorMSG").textContent = data.error;
                }
            }
            // You can now store the data, process it, or update your app state
            catch (err) {
            console.error("Caught Error:", err);
            document.getElementById("errorMSG").textcontent = err.message;
            }
        }
    });
});