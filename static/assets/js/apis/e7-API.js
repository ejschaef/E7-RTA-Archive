import { WORLD_CODES } from "../e7/references.ts";

const HERO_URL =
	"https://static.smilegatemegaport.com/gameRecord/epic7/epic7_hero.json";
const ARTIFACT_URL =
	"https://static.smilegatemegaport.com/gameRecord/epic7/epic7_artifact.json";

async function fetchE7Data(url) {
	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP error: status: ${response.status}`);
		}

		const data = await response.json();
		console.log("Fetched data from E7 Server; keys:", Object.keys(data));
		return data;
	} catch (error) {
		console.error("Error fetching global user data:", error);
		return null;
	}
}

async function fetchHeroJSON(lang = null) {
	console.log(`Fetching hero data (lang=${lang ?? "all"}) from E7 Server...`);
	let data = await fetchE7Data(HERO_URL);
	if (lang && data[lang]) {
		data = data[lang];
	} else if (lang && !data[lang]) {
		console.error("Could not find hero data for language:", lang);
		data = null;
	}
	return data;
}

async function fetchArtifactJSON(lang = null) {
	console.log(`Fetching hero data (lang=${lang ?? "all"}) from E7 Server...`);
	let data = await fetchE7Data(ARTIFACT_URL);
	if (lang && data[lang]) {
		data = data[lang];
	} else if (lang && !data[lang]) {
		console.error("Could not find artifact data for language:", lang);
		data = null;
	}
	return data;
}

async function fetchUserJSON(world_code) {
	world_code = world_code.replace("world_", "");
	if (
		![...WORLD_CODES].some((code) => code.replace("world_", "") === world_code)
	) {
		console.error(`Could not find world code: ${world_code}`);
		return null;
	}
	console.log(`Fetching users for world code: ${world_code} from E7 Server...`);
	const url = `https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_${world_code}.json`;
	const data = await fetchE7Data(url);
	if (data) {
		console.log(
			`Got user data for world: ${world_code} ; Found ${data.users.length} users`
		);
	}
	return data;
}

async function fetchInfo(uid, worldCode, lang = "en") {
    const url = "https://epic7.onstove.com/gg/gameApi/getUserInfo";
    const payload = new URLSearchParams({
        nick_no: uid,
        world_code: worldCode,
        lang: lang,
    });

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: payload.toString(),
        });

        if (!resp.ok) {
            console.error("Error fetching battle list:", resp.status, resp.statusText);
            return null;
        }

        const data = await resp.json();
        return data;
    } catch (err) {
        console.error("Request failed:", err);
        return null;
    }
}

let E7API = {
	fetchHeroJSON: fetchHeroJSON,
	fetchUserJSON: fetchUserJSON,
	fetchArtifactJSON: fetchArtifactJSON,
	fetchInfo: fetchInfo
};

export default E7API;
