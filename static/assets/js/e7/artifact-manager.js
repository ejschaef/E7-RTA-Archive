import ClientCache from "../cache-manager.js";
import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";

async function getArtifactMapFromE7Server() {
	console.log(`Getting artifact map from E7 server...`);
	const rawJSON = await E7API.fetchArtifactJSON("en");
	if (!rawJSON) {
		console.error(
			`Could not get user map from E7 server for world code: ${world_code}`
		);
		return null;
	}
	console.log(`Got artifact map from E7 server for language: 'en'`);
	return Object.fromEntries(
		rawJSON.map((artifact) => [artifact.code, artifact.name])
	);
}

let ArtifactManager = {
	getArtifacts: async function () {
		return (
			(await ClientCache.get(ClientCache.Keys.ARTIFACTS)) ??
			(await this.fetchAndCacheArtifacts())
		);
	},

	fetchAndCacheArtifacts: async function () {
		console.log(
			`ArtifactManager not found in cache, fetching from server and caching it`
		);
		const artifactMap = await getArtifactMapFromE7Server();
		await ClientCache.cache(ClientCache.Keys.ARTIFACTS, artifactMap);
		console.log(`Cached ArtifactManager using raw data recieved from server`);
		return artifactMap;
	},

	clearArtifactData: async function () {
		await ClientCache.delete(ClientCache.Keys.ARTIFACTS);
	},

	// will fall back to the code if the name is not found
	convertCodeToName: function (code, artifacts) {
		return artifacts[code] || code;
	},
};

export default ArtifactManager;
