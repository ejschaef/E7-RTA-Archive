// Reference for context flags that are used within single pages to communicate accross vies for the page

import { HOME_PAGE_STATES } from "../page-utilities/page-state-references.js";

const SOURCE_CONTEXT_VALUES = {
	QUERY: "query",
	UPLOAD: "upload",
	STATS: "stats",
};

const CONTEXT_VALUES = {
	SOURCE: SOURCE_CONTEXT_VALUES,
};

const SCROLL_PERCENTS = {
	[HOME_PAGE_STATES.SELECT_DATA]: 0,
	[HOME_PAGE_STATES.SHOW_STATS]: 0,
	[HOME_PAGE_STATES.LOAD_DATA]: 0,
};

const CONTEXT_KEYS = {
	SOURCE: "SOURCE",
	AUTO_ZOOM: "AUTO_ZOOM",
	AUTO_QUERY: "AUTO_QUERY",
	STATS_POST_RENDER_COMPLETED: "STATS_POST_RENDER_COMPLETED",
	STATS_PRE_RENDER_COMPLETED: "STATS_PRE_RENDER_COMPLETED",
	HOME_PAGE_STATE: "STATE",
	SCROLL_PERCENTS: "SCROLL_PERCENTS",
	CODE_MIRROR_EDITOR: "CODE_MIRROR_EDITOR",
	TRY_SET_USER: "TRY_SET_USER",
	IGNORE_RELAYOUT: "IGNORE_RELAYOUT",
};

const CONTEXT = {
	KEYS: CONTEXT_KEYS,
	VALUES: CONTEXT_VALUES,

	SOURCE: null,
	AUTO_QUERY: null,
	AUTO_ZOOM: false,
	STATS_POST_RENDER_COMPLETED: false,
	STATS_PRE_RENDER_COMPLETED: false,
	HOME_PAGE_STATE: null,
	SCROLL_PERCENTS: SCROLL_PERCENTS,
	CODE_MIRROR_EDITOR: null,
	TRY_SET_USER: null,
	IGNORE_RELAYOUT: false,

	popKey: function (key) {
		const value = this[key];
		this[key] = this._getDefault(key);
		return value;
	},

	readKey: function (key) {
		return this[key];
	},

	_getDefault(key) {
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
			case CONTEXT_KEYS.HOME_PAGE_STATE:
				return null;
			case CONTEXT_KEYS.SCROLL_PERCENTS:
				return SCROLL_PERCENTS;
			case CONTEXT_KEYS.CODE_MIRROR_EDITOR:
				throw new Error(`No default value for key: ${key} ; do not use popKey or _getDefault for this key`);
			case CONTEXT_KEYS.TRY_SET_USER:
				return null;
			case CONTEXT_KEYS.IGNORE_RELAYOUT:
				return false;
			default:
				return null;
		}
	},
};

export { CONTEXT };
