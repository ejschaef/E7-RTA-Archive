import ClientCache from "../../cache-manager.ts";

const ACTIONS = {
	CLEAR_USER: "CLEAR_USER",
	SHOW_NO_USER_MSG: "SHOW_NO_USER_MSG",
	SHOW_DATA_ALREADY_CLEARED_MSG: "SHOW_DATA_ALREADY_CLEARED_MSG",
	QUERY_USER: "QUERY_USER",
};

let InterPageManager = {
	ACTIONS: ACTIONS,

	getState: async function () {
		return (
			(await ClientCache.get(ClientCache.Keys.INTER_PAGE_MANAGER)) ?? {
				actions: [],
			}
		);
	},

	setState: async function (state) {
		await ClientCache.cache(ClientCache.Keys.INTER_PAGE_MANAGER, state);
	},

	pushActions: async function (actions) {
		let state = await this.getState();
		state.actions.push(...actions);
		await this.setState(state);
	},

	flushState: async function () {
		const state = await this.getState();
		await ClientCache.delete(ClientCache.Keys.INTER_PAGE_MANAGER);
		return state;
	},
};

export default InterPageManager;
