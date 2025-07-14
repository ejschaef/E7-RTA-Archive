// Reference for context flags that are used within single pages to communicate accross vies for the page

const SOURCE_CONTEXT_VALUES = {
    QUERY : "query",
    UPLOAD : "upload",
    STATS : "stats",
}

const CONTEXT_VALUES = {
    BOOL : {TRUE : true, FALSE : false},
    SOURCE : SOURCE_CONTEXT_VALUES,
    ERROR_MSG : null,
}

const CONTEXT_KEYS = {
    QUERY : "QUERY",
    SOURCE : "SOURCE",
    ERROR_MSG : "ERROR_MSG",
    AUTO_ZOOM : "AUTO_ZOOM",
    EDITOR_INITIALIZED : "EDITOR_INITIALIZED",
}

const CONTEXT = {
    KEYS : CONTEXT_KEYS,
    VALUES : CONTEXT_VALUES,
}

export { CONTEXT };