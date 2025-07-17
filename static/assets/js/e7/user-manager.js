import { WORLD_CODES, WORLD_CODE_TO_CLEAN_STR } from "./references.js";
import ClientCache from "../cache-manager.js";
import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";

const userMapCacheKeyMap = {
	world_global: ClientCache.Keys.GLOBAL_USERS,
	world_eu: ClientCache.Keys.EU_USERS,
	world_asia: ClientCache.Keys.ASIA_USERS,
	world_jpn: ClientCache.Keys.JPN_USERS,
	world_kor: ClientCache.Keys.KOR_USERS,
};

function createUser(userJSON, world_code) {
	return {
		id: userJSON.nick_no,
		name: userJSON.nick_nm,
		code: userJSON.code,
		rank: userJSON.rank,
		world_code: world_code,
	};
}

async function getUserMapFromE7Server(world_code) {
	console.log(`Getting user map for world code from E7 server: ${world_code}`);
	const rawUserJSON = await E7API.fetchUserJSON(world_code);
	if (!rawUserJSON) {
		console.log(
			`Could not get user map from E7 server for world code: ${world_code}`
		);
		return null;
	}
	console.log(`Got user map from E7 server for world code: ${world_code}`);
	return Object.fromEntries(
		rawUserJSON.users.map((user) => [
			user.nick_no,
			createUser(user, world_code),
		])
	);
}

let UserManager = {
	getUserMap: async function (world_code) {
		console.log(`Getting user map for world code: ${world_code}`);
		const cachedUserMap = await ClientCache.get(userMapCacheKeyMap[world_code]);
		if (cachedUserMap !== null) {
			console.log("Got user map from cache");
			return cachedUserMap;
		}
		const fetchedUserMap = await getUserMapFromE7Server(world_code);
		await ClientCache.cache(userMapCacheKeyMap[world_code], fetchedUserMap);
		return fetchedUserMap;
	},

	findUser: async function (userData) {
		let useFlaskServer = false;

		// attempt to find user through client-side means

		// try to find user by ID
		if (userData.id) {
			for (const world_code of WORLD_CODES) {
				const userMap = await this.getUserMap(world_code);
				const users = Object.values(userMap);
				if (!(users.length > 0)) {
					console.log(
						`User map had no users, falling back to flask server for world code: ${world_code}`
					);
					useFlaskServer = true;
				}
				const user = users.find((user) => user.id === userData.id);
				if (user) {
					console.log(
						`Found user: ${JSON.stringify(user)} in world code: ${world_code}`
					);
					return { user, error: false };
				} else {
					console.log(
						`Could not find user with ID: ${userData.id} in world code: ${world_code} from client-side means`
					);
				}
			}
		}

		// try to find user by name and world code
		else if (userData.name && userData.world_code) {
			const [name, world_code] = [userData.name, userData.world_code];
			const userMap = await this.getUserMap(world_code);
			const users = Object.values(userMap);
			if (!(users.length > 0)) {
				console.log(
					`User map had no users, falling back to flask server for world code: ${world_code}`
				);
				useFlaskServer = true;
			}
			const lowerCaseName = name.toLowerCase();
			const user = users.find(
				(user) => lowerCaseName === user.name.toLowerCase()
			);
			if (user) {
				console.log(
					`Found user: ${JSON.stringify(user)} in world code: ${world_code}`
				);
				return { user, error: false };
			} else {
				console.log(
					`Could not find user with ID: ${userData.id} in world code: ${world_code} from client-side means`
				);
			}
		} else {
			console.error(
				"Must pass a user object with either user.name and user.world_code or user.id to fetch user"
			);
			return {
				user: null,
				error:
					"Must pass a user object with either user.name and user.world_code or user.id to fetch user",
			};
		}

		if (useFlaskServer) {
			console.log(
				"Failed to find user through client-side means; falling back to flask server"
			);
			// failed to find user through client-side means; make request to flask server
			const flaskServerResponse = await PYAPI.fetchUser(userData);
			if (flaskServerResponse.error) {
				return { user: null, error: flaskServerResponse.error };
			}
			return { user: flaskServerResponse.user, error: false };
		} else {
			return { user: null, error: "Could not find user" };
		}
	},

	setUser: async function (userData) {
		await ClientCache.cache(ClientCache.Keys.USER, userData);
	},

	getUser: async function () {
		return await ClientCache.get(ClientCache.Keys.USER);
	},

	clearUserData: async function () {
		await ClientCache.clearUserData();
	},

	clearUserDataLists: async function () {
		await ClientCache.delete(ClientCache.Keys.GLOBAL_USERS);
		await ClientCache.delete(ClientCache.Keys.EU_USERS);
		await ClientCache.delete(ClientCache.Keys.ASIA_USERS);
		await ClientCache.delete(ClientCache.Keys.JPN_USERS);
		await ClientCache.delete(ClientCache.Keys.KOR_USERS);
	},

	convertServerStr: function (serverStr) {
		return WORLD_CODE_TO_CLEAN_STR[serverStr];
	},
};

export default UserManager;
