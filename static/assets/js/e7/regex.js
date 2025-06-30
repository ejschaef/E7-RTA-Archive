const VALID_STRING_RE = /[a-z][a-z0-9\.\s]*[a-z0-9]|[a-z]/i;
const VALID_DATE_RE = /\d{4}-\d{2}-\d{2}/;
const EMPTY_SET_RE = /\{\s*\}/;
const SET_ELEMENT_RE =  new RegExp(`(?:"${VALID_STRING_RE.source}"|'${VALID_STRING_RE.source}'|${VALID_STRING_RE.source}|${VALID_DATE_RE.source})`, "i");
const VALID_SET_RE = new RegExp(`\\{\\s*(?:${SET_ELEMENT_RE.source}\\s*)+(?:,\\s*${SET_ELEMENT_RE.source}\\s*)*,?\\s*\\}|${EMPTY_SET_RE.source}`, "i");

const VALID_STRING_LITERAL_RE = new RegExp(`"(${VALID_STRING_RE.source})"|'(${VALID_STRING_RE.source})'`, "i");
const VALID_DATE_LITERAL_RE = new RegExp(`${VALID_DATE_RE.source}`, "i");
const VALID_INT_LITERAL_RE = /^\d+$/;
const VALID_BOOL_LITERAL_RE = /^(true|false)$/i;

let RegExps = {
    VALID_STRING_RE: VALID_STRING_RE,
    VALID_DATE_RE: VALID_DATE_RE,
    EMPTY_SET_RE: EMPTY_SET_RE,
    SET_ELEMENT_RE: SET_ELEMENT_RE,
    VALID_SET_RE: VALID_SET_RE,

    VALID_STRING_LITERAL_RE: VALID_STRING_LITERAL_RE,
    VALID_DATE_LITERAL_RE: VALID_DATE_LITERAL_RE,
    VALID_INT_LITERAL_RE: VALID_INT_LITERAL_RE,
    VALID_BOOL_LITERAL_RE:VALID_BOOL_LITERAL_RE,
}

export {RegExps};