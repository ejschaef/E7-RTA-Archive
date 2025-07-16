// Reference for context flags that are used within single pages to communicate accross vies for the page

import { HOME_PAGE_STATES } from "./page-state-references";


const SOURCE_CONTEXT_VALUES = {
    QUERY : "query",
    UPLOAD : "upload",
    STATS : "stats",
}

const CONTEXT_VALUES = {
    SOURCE : SOURCE_CONTEXT_VALUES,
}

const SCROLL_PERCENTS = {
	[HOME_PAGE_STATES.SELECT_DATA]: 0,
	[HOME_PAGE_STATES.SHOW_STATS]: 0,
	[HOME_PAGE_STATES.LOAD_DATA]: 0,
};

const CONTEXT_KEYS = {
    SOURCE : "SOURCE",
    ERROR_MSG : "ERROR_MSG",
    AUTO_ZOOM : "AUTO_ZOOM",
    AUTO_QUERY : "AUTO_QUERY",
    STATS_POST_RENDER_COMPLETED : "STATS_POST_RENDER_COMPLETED",
    HOME_PAGE_STATE : "STATE",
    SCROLL_PERCENTS : "SCROLL_PERCENTS",
}

const CONTEXT = {
	KEYS : CONTEXT_KEYS,
    VALUES : CONTEXT_VALUES,

	ERROR_MSG: null,
	SOURCE: null,
	AUTO_QUERY: null,
    AUTO_ZOOM: false,
	STATS_POST_RENDER_COMPLETED: false,
	HOME_PAGE_STATE: null,
	SCROLL_PERCENTS: SCROLL_PERCENTS,

	popKey: function(key) {
		const value = this[key];
		this[key] = this._getDefault(key);
		return value;
	},


    readKey: function(key) {
        return this[key];
    },

    _getDefault(key) {
        switch (key) {
            case CONTEXT_KEYS.AUTO_ZOOM : return false;
            case CONTEXT_KEYS.ERROR_MSG : return null;
            case CONTEXT_KEYS.SOURCE : return null;
            case CONTEXT_KEYS.AUTO_QUERY : return null;
            case CONTEXT_KEYS.STATS_POST_RENDER_COMPLETED : return false;
            case CONTEXT_KEYS.HOME_PAGE_STATE : return null;
            case CONTEXT_KEYS.SCROLL_PERCENTS : return SCROLL_PERCENTS;
        }
    }
}

export { CONTEXT };