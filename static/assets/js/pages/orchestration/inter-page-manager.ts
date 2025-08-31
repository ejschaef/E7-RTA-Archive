import ClientCache from "../../cache-manager.ts";

const ACTIONS = {
	CLEAR_USER: "CLEAR_USER",
	SHOW_NO_USER_MSG: "SHOW_NO_USER_MSG",
	SHOW_DATA_ALREADY_CLEARED_MSG: "SHOW_DATA_ALREADY_CLEARED_MSG",
	QUERY_USER: "QUERY_USER",
	REFRESH_REFERENCES: "REFRESH_REFERENCES",
} as const;


type Action = {
	action: typeof ACTIONS[keyof typeof ACTIONS],
	message?: string
}


type InterPageManagerState = {
	actions: Action[];
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

	pushActions: async function (actions: Action[]): Promise<void> {
		let state = await this.getState();
		state.actions.push(...actions);
		await this.setState(state);
	},

	pushAction: async function (action: Action): Promise<void> {
		let state = await this.getState();
		state.actions.push(action);
		await this.setState(state);
	},

	makeAction: function (action: typeof ACTIONS[keyof typeof ACTIONS], message?: string): Action {
		return { action: action, message: message };
	},

	flushState: async function (): Promise<InterPageManagerState> {
		const state = await this.getState();
		await ClientCache.delete(ClientCache.Keys.INTER_PAGE_MANAGER);
		return state;
	},
};

export default InterPageManager;
