import BattleManager from "./e7/battle-manager.js";
import ClientCache from "./cache-manager.js";
import PYAPI from "./py-API.js";
import HeroManager from "./e7/hero-manager.js"
import FilterSyntaxParser from "./e7/filter-syntax-parser.js";
import UserManager from "./e7/user-manager.js";

let PageUtils = {

    updateSidebar: async function(URLS) {
        const user = await ClientCache.getUser();
        const element = document.getElementById("heroStatsOrQuery");
        if (user) {
            console.log(`Found user: ${user}; showing hero stats in sidebar`);
            const url = URLS.heroStatsURL;
            element.innerHTML = `
            <a href=${url} class="pc-link">
                <span class="pc-micon"><i data-feather="bar-chart-2"></i></span>
                <span class="pc-mtext">Hero Stats</span>
            </a>
            `;
        } else {
            console.log(`Found user: ${user}; showing user query in sidebar`);
            const url = URLS.userQueryURL;
            element.innerHTML = `
            <a href=${url} class="pc-link">
                <span class="pc-micon"><i data-feather="download"></i></span>
                <span class="pc-mtext">Query User Data</span>
            </a>
            `;
        }
        feather.replace()
    },

    updateSwitchUserBtn: async function(URLS) {
        const user = await ClientCache.getUser();
        const element = document.getElementById("user-options");
        if (user) {
            element.innerHTML = `
            <button name="switch_user" class="btn btn-primary" type="submit" action="switch-user" id="switch-user-btn">
                Switch User
            </button>
            `;
        } else {
            element.innerHTML = ``;
        }
    },

    queryAndCacheBattles: async function(user, params, HM) {
        await PYAPI.fetchBattleData(user)
        .then(response => response.json())
        .then( async data => {
            if (data.success) {
                const rawBattles = data.battles;
                await BattleManager.cacheQuery(rawBattles, user, HM);
                console.log("Cached queried battles")
            } else {
                let returnURL = null;
                if (params.get("source") === "upload") {
                    returnURL = '{{ url_for("home_blueprint.upload_battle_data")}}';
                } else {
                    const userQueryURL = '{{ url_for("home_blueprint.user_query") }}';
                    const errorMSG = `Error while fetching data: ${data.error}`;
                    returnURL = this.addStrParam(userQueryURL, 'errorMSG', errorMSG);
                }
                window.location.replace(returnURL);
            }
        });
    },

    addStrParam: function(URL, key, val) {
        const encodedParam = encodeURIComponent(val);
        URL = `${URL}?${key}=${encodedParam}`;
        return URL;
    },

    addStrParams: function(URL, obj) {
        for (let key in obj) {
            URL = this.addStrParam(URL, key, obj[key]);
        }
        return URL;
    },

    validateFilterSyntax: async function(str) {
        const HM = await HeroManager.getHeroManager();
        let filterMSG = document.getElementById("filterMSG")
        try {
            let parser = await FilterSyntaxParser.createAndParse(str, HM);
            filterMSG.textContent = "Validation Passed";
            filterMSG.classList.remove("text-danger");
            filterMSG.classList.add("text-safe");
            return true;
        } catch(err) {
            console.error(err);
            filterMSG.textContent = `Validation Failed: ${err.message}`;
            filterMSG.classList.remove("text-safe");
            filterMSG.classList.add("text-danger");
            return false;
        }
    },

    validateFilterSyntaxNoCatch: async function(str) {
        const HM = await HeroManager.getHeroManager();
        let filterMSG = document.getElementById("filterMSG")
        await FilterSyntaxParser.createAndParse(str, HM);
        filterMSG.textContent = "Validation Passed";
        filterMSG.classList.remove("text-danger");
        filterMSG.classList.add("text-safe");
        return true;
    }
}


export default PageUtils;