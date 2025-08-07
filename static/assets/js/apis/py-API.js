const RS_BATTLE_URL = '/api/rs_get_battle_data';
const HERO_URL = '/api/get_hero_data';
const USER_URL = '/api/get_user_data';
const SEASON_URL = '/api/get_season_details';
const ARTIFACT_JSON_URL = '/api/get_artifact_json';

let PYAPI = {

    test: function(data) {
        // test the fetching works properly
        console.log('Got data in test:', data.rank_plot);
    },

    fetchFromPython: async function (url) {
        let response = await fetch(url);
        if (!response.ok) {
            console.log("Retrying Fetch...");
            response = await fetch(url);
        }
        const data = await response.json();
        return data? data : null;
    },

    fetchHeroData: async function () {
        return await this.fetchFromPython(HERO_URL);
    },

    // uses the new API endpoint that utilizes Rust for fetching and processing the battles
    rsFetchBattleData: async function (user) {
        if (!user) {
            throw new Error("Must pass user to fetch battles data");
        }
        return await fetch(RS_BATTLE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user: user })
          })
    },

    fetchSeasonDetails: async function () {
        const response = await fetch(SEASON_URL);
        const data = await response.json();
        if (data.success) {
            const seasonDetails = JSON.parse(data.seasonDetails);
            return { seasonDetails: seasonDetails, error: false};
        } else {
            return { seasonDetails: null, error: data.error};
        }
    },

    fetchArtifactJson: async function () {
        const response = await fetch(ARTIFACT_JSON_URL);
        const data = await response.json();
        if (data.success) {
            const artifactJson = JSON.parse(data.artifactJson);
            return artifactJson
        } else {
            return null
        }
    },

    fetchUser: async function (userData) {
        if ((!userData.name || !userData.world_code) && !userData.id) {
            throw new Error("Must pass a user object with either user.name and user.world_code or user.id to fetch user");
        }
        const response = await fetch(USER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userData })
        })
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Flask server error: ${data.error}`);
        }
        if (!data.foundUser) {
            if (!userData.world_code) {
                return { user: null, ok: true};
            }
            return { user: null, ok: true};
        } 
        const user = data.user;
        console.log("Server communication successful; received response data for user");
        console.log(`Found user: ${JSON.stringify(user)}`);
        return { user, ok: true};
    },
};

export default PYAPI;