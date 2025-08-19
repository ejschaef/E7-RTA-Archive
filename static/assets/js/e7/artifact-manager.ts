import ClientCache from "../cache-manager.ts";
import E7API from "../apis/e7-API.ts";
import PYAPI from "../apis/py-API.js";


export type ArtifactCodeToNameMap = { [code: string]: string };
export type ArtifactObj = { code: string; name: string };

async function getArtifactCodeToNameMap(): Promise<ArtifactCodeToNameMap | null> {
	console.log(`Getting artifact map from E7 server...`);
	let rawJSON = await E7API.fetchArtifactJSON("en");
	if (rawJSON === null) {
		console.log(`Getting artifact map from flask server...`);
		rawJSON = await PYAPI.fetchArtifactJson();
	}
	if (rawJSON === null) {
		console.error(
			`Could not get artifact Json map from E7 server or flask server`
		);
		return null;
	}
	console.log(`Got artifact Json for language: 'en'`);
	return Object.fromEntries(
		rawJSON
			.filter((artifact) => artifact.name !== null)
			.map((artifact) => [artifact.code, artifact.name])
	);
}

let ArtifactManager = {
	async getArtifactCodeToNameMap(): Promise<ArtifactCodeToNameMap> {
		let artifacts = await ClientCache.get(ClientCache.Keys.ARTIFACTS);
		if (!artifacts) {
			artifacts = await this.fetchAndCacheArtifacts();
		}
		return artifacts;
	},

	getArtifactLowercaseNameMap: async function (): Promise<Record<string, string>> {
		let artiMap = await ClientCache.get(
			ClientCache.Keys.ARTIFACTS_LOWERCASE_NAMES_MAP
		);
		if (artiMap !== null) {
			console.log("Got artifact lowercase name map from cache");
			return artiMap;
		}
		const artifacts = await this.getArtifactCodeToNameMap();
		artiMap = Object.fromEntries(
			Object.values(artifacts)
				.filter((name) => name !== null)
				.map((name) => {
					return [name.toLowerCase(), name];
				})
		);
		await ClientCache.cache(
			ClientCache.Keys.ARTIFACTS_LOWERCASE_NAMES_MAP,
			artiMap
		);
		return artiMap;
	},

	getArtifactObjectList: async function (): Promise<ArtifactObj[]> {
		let objectList = await ClientCache.get(
			ClientCache.Keys.ARTIFACT_OBJECT_LIST
		);
		if (objectList !== null) {
			console.log("Got artifact object list from cache");
			return objectList;
		}
		const artifacts = await this.getArtifactCodeToNameMap();
		objectList = Object.entries(artifacts).map(([id, name]) => ({ id, name }));
		await ClientCache.cache(ClientCache.Keys.ARTIFACT_OBJECT_LIST, objectList);
		return objectList;
	},

	fetchAndCacheArtifacts: async function (): Promise<ArtifactCodeToNameMap> {
		console.log(
			`ArtifactManager not found in cache, fetching from server and caching it`
		);
		const artifactMap = await getArtifactCodeToNameMap();
		if (artifactMap === null) {
			return {};
		}
		await ClientCache.cache(ClientCache.Keys.ARTIFACTS, artifactMap);
		console.log(`Cached ArtifactManager using raw data recieved from server`);
		return artifactMap;
	},

	clearArtifactData: async function () {
		await ClientCache.delete(ClientCache.Keys.ARTIFACTS);
	},

	// will fall back to the code if the name is not found
	convertCodeToName: function (code: string, artifacts: ArtifactCodeToNameMap) {
		return artifacts[code] || code;
	},
};

export default ArtifactManager;
