import E7API from "../e7-API.js";
import PYAPI from "../py-API.js";
import ContentManager from "../content-manager.js";


document.addEventListener("DOMContentLoaded", async () => {

        let user = await ContentManager.UserManager.findUser({id : "195863691"});
        let response = await PYAPI.rsFetchBattleData(user.user);

        if (response.ok) {
            let data = await response.json();
            console.log("Success");
            console.log(data.battles);
        } else {
            console.error("Error:", response.error);
        }
        
    });