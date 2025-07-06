function padRegex(pattern, flags="i") {
    return new RegExp(`^${pattern.source}(?=[,)\\s;]|$)`, flags);
}

function anchorExp(pattern, flags="i") {
    return new RegExp(`^(?:${pattern.source})$`, flags);
}

const VALID_STRING_RE = /[a-z][a-z0-9.\s]*/i;
const VALID_DATE_RE = /\d{4}-\d{2}-\d{2}/;
const EMPTY_SET_RE = /\{\s*\}/;
const VALID_INT_RE = /\d+/;
const VALID_SEASON_RE = /season-[1-9]+[0-9]*(\.[1-9]*)?|current-season/i;

const VALID_GLOBAL_FILTER_RE = /last-n\(\d+\)/i

const VALID_DATE_LITERAL_RE = new RegExp(`^${VALID_DATE_RE.source}$`, "i");
const VALID_INT_LITERAL_RE = /^\d+$/;
const VALID_BOOL_LITERAL_RE = /^(true|false)$/i;

const VALID_DATA_WORD_RE = new RegExp(`(?:${VALID_SEASON_RE.source})`, "i");

const VALID_FIELD_WORD_RE = /(?:date|firstpick|win|victory-points|p1.picks|p2.picks|p1.pick1|p1.pick2|p1.pick3|p1.pick4|p1.pick5|p2.pick1|p2.pick2|p2.pick3|p2.pick4|p2.pick5|p1.league|p2.league)/i

//consts without RE are used for injecting into regex patterns
const STR = VALID_STRING_RE.source;
const INT = VALID_INT_RE.source;
const DATE = VALID_DATE_RE.source;
const FIELD_WORD = VALID_FIELD_WORD_RE.source;
const DATA_WORD = VALID_DATA_WORD_RE.source;

const VALID_STRING_LITERAL_RE = new RegExp(`"(${STR})"|'(${STR})'`, "i");

const STRLIT = VALID_STRING_LITERAL_RE.source;

const SET_ELEMENT_RE =  new RegExp(`(?:${STRLIT}|${STR}|${DATE})`, "i");

const VALID_DATAFIELD_RE = new RegExp(`(?:${FIELD_WORD}|${DATA_WORD})`, "i");

const SETELT = SET_ELEMENT_RE.source;

const VALID_SET_RE = new RegExp(`\\{\\s*(?:${SETELT}\\s*)(?:,\\s*${SETELT}\\s*)*,?\\s*\\}|${EMPTY_SET_RE.source}`, "i");


const VALID_RANGE_RE = new RegExp(`${INT}\\.\\.\\.${INT}|${DATE}\\.\\.\\.${DATE}|${INT}\\.\\.\\.=${INT}|${DATE}\\.\\.\\.=${DATE}`);
const VALID_RANGE_LITERAL_RE = new RegExp(`^${VALID_RANGE_RE.source}$`);

let RegExps = {
    VALID_STRING_RE: VALID_STRING_RE,
    VALID_DATE_RE: VALID_DATE_RE,
    VALID_INT_RE: VALID_INT_RE,
    EMPTY_SET_RE: EMPTY_SET_RE,
    SET_ELEMENT_RE: SET_ELEMENT_RE,
    VALID_SET_RE: VALID_SET_RE,

    VALID_STRING_LITERAL_RE: VALID_STRING_LITERAL_RE,
    VALID_DATE_LITERAL_RE: VALID_DATE_LITERAL_RE,
    VALID_INT_LITERAL_RE: VALID_INT_LITERAL_RE,
    VALID_BOOL_LITERAL_RE:VALID_BOOL_LITERAL_RE,

    VALID_RANGE_RE: VALID_RANGE_RE,
    VALID_RANGE_LITERAL_RE: VALID_RANGE_LITERAL_RE,

    VALID_SEASON_RE: VALID_SEASON_RE,
    VALID_SEASON_LITERAL_RE: anchorExp(VALID_SEASON_RE),

    VALID_DATA_WORD_RE: VALID_DATA_WORD_RE,
    VALID_DATA_WORD_LITERAL_RE: anchorExp(VALID_DATA_WORD_RE),

    VALID_FIELD_WORD_RE: VALID_FIELD_WORD_RE,

    VALID_DATAFIELD_RE: VALID_DATAFIELD_RE,

    VALID_GLOBAL_FILTER_RE: VALID_GLOBAL_FILTER_RE,

    padRegex: padRegex,
    anchorExp: anchorExp,
}

export {RegExps};