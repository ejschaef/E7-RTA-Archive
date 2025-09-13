// Reference for context flags that are used within single pages to communicate accross vies for the page

import { HOME_PAGE_STATES } from "../page-utilities/page-state-references.ts";

const SOURCE_CONTEXT_VALUES = {
	QUERY: "query",
	UPLOAD: "upload",
	STATS: "stats",
};

const CONTEXT_VALUES = {
	SOURCE: SOURCE_CONTEXT_VALUES,
};

export type ScrollPercents = Record<typeof HOME_PAGE_STATES[keyof typeof HOME_PAGE_STATES], number>;

const scrollZero = Object.fromEntries(Object.values(HOME_PAGE_STATES).map((state) => [state, 0])) as ScrollPercents;

const SCROLL_PERCENTS = {
	...scrollZero,

	toString: function () {
		return JSON.stringify(this, null, 2);
	},
} as const;

const CONTEXT_KEYS = {
	SOURCE: "SOURCE",
	AUTO_ZOOM: "AUTO_ZOOM",
	AUTO_QUERY: "AUTO_QUERY",
	STATS_POST_RENDER_COMPLETED: "STATS_POST_RENDER_COMPLETED",
	STATS_PRE_RENDER_COMPLETED: "STATS_PRE_RENDER_COMPLETED",
	SCROLL_PERCENTS: "SCROLL_PERCENTS",
	CODE_MIRROR_EDITOR: "CODE_MIRROR_EDITOR",
	TRY_SET_USER: "TRY_SET_USER",
	IGNORE_RELAYOUT: "IGNORE_RELAYOUT",
	IS_FIRST_RENDER: "IS_FIRST_RENDER",
} as const;

type ContextKey = typeof CONTEXT_KEYS[keyof typeof CONTEXT_KEYS];


function _getDefault(key: ContextKey) {
	switch (key) {
		case CONTEXT_KEYS.AUTO_ZOOM:
			return false;
		case CONTEXT_KEYS.SOURCE:
			return null;
		case CONTEXT_KEYS.AUTO_QUERY:
			return null;
		case CONTEXT_KEYS.STATS_POST_RENDER_COMPLETED:
			return false;
		case CONTEXT_KEYS.STATS_PRE_RENDER_COMPLETED:
			return false;
		case CONTEXT_KEYS.SCROLL_PERCENTS:
			return SCROLL_PERCENTS;
		case CONTEXT_KEYS.CODE_MIRROR_EDITOR:
			return null;
		case CONTEXT_KEYS.TRY_SET_USER:
			return null;
		case CONTEXT_KEYS.IGNORE_RELAYOUT:
			return false;
		case CONTEXT_KEYS.IS_FIRST_RENDER:
			return true;
		default:
			console.error(`No default value for key: ${key}`);
			return null;
	}
}

type Context = Record<ContextKey, unknown> & {
	KEYS: typeof CONTEXT_KEYS;
	VALUES: typeof CONTEXT_VALUES;
	popKey: (key: ContextKey) => unknown;
	readKey: (key: ContextKey) => unknown;
	toString: () => string;
};

const DEFAULTS = Object.fromEntries(Object.entries(CONTEXT_KEYS).map(([key]) => [key, _getDefault(key as ContextKey)])) as Record<ContextKey, unknown>;

function getContext() {
	const CONTEXT: Context = {
		KEYS: CONTEXT_KEYS,
		VALUES: CONTEXT_VALUES,

		...DEFAULTS,

		popKey: function (key: ContextKey) {
			const value = this[key];
			this[key] = _getDefault(key);
			return value;
		},

		readKey: function (key: ContextKey) {
			return this[key];
		},

		toString() {
			let str = "CONTEXT:\n";
			for (const key in CONTEXT_KEYS) {
				const typedkey = key as ContextKey;
				str += `\t${key}: ${this[typedkey]}\n`;
			}
			return str;
		}
	};
	console.log("INITIALIZED CONTEXT: ", CONTEXT.toString());
	return CONTEXT;
}

const CONTEXT = getContext();

export { CONTEXT };
