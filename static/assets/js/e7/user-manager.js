import {
	WORLD_CODES,
	WORLD_CODE_TO_CLEAN_STR,
	WORLD_CODE_ENUM,
} from "./references.js";
import ClientCache from "../cache-manager.js";
import E7API from "../apis/e7-API.js";
import PYAPI from "../apis/py-API.js";

const userMapCacheKeyMap = {
	[WORLD_CODE_ENUM.GLOBAL]: ClientCache.Keys.GLOBAL_USERS,
	[WORLD_CODE_ENUM.EU]: ClientCache.Keys.EU_USERS,
	[WORLD_CODE_ENUM.ASIA]: ClientCache.Keys.ASIA_USERS,
	[WORLD_CODE_ENUM.JPN]: ClientCache.Keys.JPN_USERS,
	[WORLD_CODE_ENUM.KOR]: ClientCache.Keys.KOR_USERS,
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

/**
 * Gets a user map from the E7 server for the given world code. 
 * The user map is a map of user IDs to user objects.
 * If the user map is cached, it will be returned from the cache.
 * Otherwise, it will be fetched from the E7 server and cached.
 * @param {string} world_code - The world code to get the user map for.
 * @returns {Promise<Object.<string, User>>} - The user map for the given world code.
 */
async function getUserMap(world_code) {
	console.log(`Getting user map for world code: ${world_code}`);
	const cachedUserMap = await ClientCache.get(userMapCacheKeyMap[world_code]);
	if (cachedUserMap !== null) {
		console.log("Got user map from cache");
		return cachedUserMap;
	}
	const fetchedUserMap = await getUserMapFromE7Server(world_code);
	await ClientCache.cache(userMapCacheKeyMap[world_code], fetchedUserMap);
	return fetchedUserMap;
}

const cleanStr = (world_code) => WORLD_CODE_TO_CLEAN_STR[world_code];

function findUser(userData, users, dataExtractFn) {
	const user = users.find((user) => dataExtractFn(user) === userData);
	if (user) {
		console.log(`Found user: ${JSON.stringify(user)}`);
		return { user, ok: true };
	}
	return { user: null, ok: true };
}

async function findUserClientSide(user, userWorldCode) {
	const userMap = await getUserMap(userWorldCode);
	const users = Object.values(userMap);
	if (!users || users.length === 0) {
		console.log(
			`User map had no users, falling back to flask server for world code: ${cleanStr(
				userWorldCode
			)}`
		);
		return { user: null, ok: false };
	}
	let [userData, dataExtractFn] = [null, null];
	if (user.id) {
		userData = user.id;
		dataExtractFn = (user) => user.id;
	} else if (user.name) {
		userData = user.name.toLowerCase();
		dataExtractFn = (user) => user.name.toLowerCase();
	} else {
		throw new Error(
			"Must pass a user object with either user.name or user.id to find user"
		);
	}
	return findUser(userData, users, dataExtractFn);
}

let UserManager = {

	getUserMap: getUserMap,

	/**
	 * Finds a user in the user map for the given world code using either user ID or name
	 * The world code is required
	 * If the user maps api call fails, will try to find the user by calling flask server
	 * 
	 * @param {Object} searchUser - Object with either user ID or name, and world code
	 * @returns {Object} - Found user object
	 * @throws {Error} - If user is not found with given identifier in given world code
	 */
	findUser: async function (searchUser) {
		console.log(`Attempting to find user: ${JSON.stringify(searchUser)}`);
		if (!(searchUser.name || searchUser.id) || !searchUser.world_code) {
            throw new Error("Must pass a user object with either user.name or user.id, and user.world_code to find user");
        }
		let identifier = searchUser.id ? `ID: ${searchUser.id}` : `Name: '${searchUser.name}'`;
		let result = null;

		result = await findUserClientSide(searchUser, searchUser.world_code);

		// if issue, try to fetch from flask
		if (!result.ok) {
			result = await PYAPI.fetchUser(searchUser);
		}

		// result should now be guaranteed to be ok otherwise error would have been thrown
		if (result.ok) {
			const user = result.user;
			if (user === null) {
				throw new Error(`Could not find user with ${identifier} in Server: ${cleanStr(searchUser.world_code)}`);
			}
			return user;
		}

		throw new Error(`Function did not properly terminate: ${JSON.stringify(result)}`);
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
		await ClientCache.clearUserLists();
	},
};

export default UserManager;
