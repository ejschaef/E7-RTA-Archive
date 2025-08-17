import ClientCache from "../../cache-manager.ts";

const ACTIONS = {
	CLEAR_USER: "CLEAR_USER",
	SHOW_NO_USER_MSG: "SHOW_NO_USER_MSG",
	SHOW_DATA_ALREADY_CLEARED_MSG: "SHOW_DATA_ALREADY_CLEARED_MSG",
	QUERY_USER: "QUERY_USER",
};


type InterPageManagerState = {
	actions: string[];
	messages: string[];
};

let InterPageManager = {
	ACTIONS: ACTIONS,

	getState: async function (): Promise<InterPageManagerState> {
		return (
			(await ClientCache.get(ClientCache.Keys.INTER_PAGE_MANAGER)) ?? {
				actions: [],
				messages: [],
			}
		);
	},

	setState: async function (state: InterPageManagerState): Promise<void> {
		await ClientCache.cache(ClientCache.Keys.INTER_PAGE_MANAGER, state);
	},

	pushActions: async function (actions: string[]): Promise<void> {
		let state = await this.getState();
		state.actions.push(...actions);
		await this.setState(state);
	},

	pushMessages: async function (messages: string[]): Promise<void> {
		let state = await this.getState();
		state.messages.push(...messages);
		await this.setState(state);
	},

	pushState: async function (state: InterPageManagerState) {
		let currentState = await this.getState();
		currentState.actions.push(...state.actions);
		currentState.messages.push(...state.messages);
		await this.setState(currentState);
	},

	flushState: async function (): Promise<InterPageManagerState> {
		const state = await this.getState();
		await ClientCache.delete(ClientCache.Keys.INTER_PAGE_MANAGER);
		return state;
	},
};

export default InterPageManager;
