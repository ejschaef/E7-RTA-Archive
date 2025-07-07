function padRegex(pattern, flags="i") {
    return new RegExp(`^(?:${pattern.source})(?=[,)\\s;]|$)`, flags);
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

const VALID_QUOTED_STRING_RE = new RegExp(`"(${STR})"|'(${STR})'`, "i");

const VALID_STRING_LITERAL_RE = new RegExp(anchorExp(VALID_QUOTED_STRING_RE), "i");

const QUOTED_STR = VALID_QUOTED_STRING_RE.source;

const SET_ELEMENT_RE =  new RegExp(`(?:${QUOTED_STR}|${STR}|${DATE})`, "i");

const VALID_DATAFIELD_RE = new RegExp(`(?:${FIELD_WORD}|${DATA_WORD})`, "i");

const SETELT = SET_ELEMENT_RE.source;

const VALID_SET_RE = new RegExp(`\\{\\s*(?:${SETELT}\\s*)(?:,\\s*${SETELT}\\s*)*,?\\s*\\}|${EMPTY_SET_RE.source}`, "i");


const VALID_RANGE_RE = new RegExp(`${INT}\\.\\.\\.${INT}|${DATE}\\.\\.\\.${DATE}|${INT}\\.\\.\\.=${INT}|${DATE}\\.\\.\\.=${DATE}`);
const VALID_RANGE_LITERAL_RE = new RegExp(`^${VALID_RANGE_RE.source}$`);

function tokenMatch(stream){
    if (stream.match(/AND(?=\()|OR(?=\()|XOR(?=\()|NOT(?=\()|LAST-N(?=\()/i)) {
        console.log("Matched stream as clause:", stream);
        return "keyword";
    }
    if (stream.match(/\s+(?:!=|<|>|=|>=|<=|in|!in)(?=\s+)/i)) {
        console.log("Matched stream as operator:", stream);
        return "operator"; 
    }
    if (stream.match(new RegExp(`[a-z0-9."'}=)-]${VALID_DATAFIELD_RE.source}(?=[,)\\s;]|$)`, "i"))) {
        console.log("Matched stream as field with preceding fragment:", stream);
        return null; 
    }

    if (stream.match(padRegex(VALID_DATAFIELD_RE))) {
        console.log("Matched stream as Data Field:", stream);
        return "datafield"; 
    }

    if (stream.match(/[^(,\s;.=0-9]+\d+/i)) {
        console.log("Matched stream as non-num null")
        return null
    }
    if (stream.match(padRegex(VALID_RANGE_RE))) {
        console.log("Matched stream as range:", stream);
        return "range"; 
    }
    if (stream.match(padRegex(VALID_INT_RE))) {
        console.log("Matched stream as number:", stream);
        return "number"; 
    }
    if (stream.match(padRegex(VALID_DATE_RE))) {
        console.log("Matched stream as date:", stream);
        return "date"; 
    }
    if (stream.match(padRegex(VALID_SET_RE))) {
        console.log("Matched stream as set:", stream);
        return "set"; 
    }
    if (stream.match(/(?:^|\s)(?:true|false)(?=[,)\s;]|$)/i)) {
        console.log("Matched stream as bool:", stream);
        return "bool"; 
    }
    if (stream.match(padRegex(VALID_QUOTED_STRING_RE))) {
        console.log("Matched stream as string:", stream)
        return "string"; 
    }
    if (stream.match(/[\(\)\{\}\;\,]/)) {
        console.log("Matched stream as bracket:", stream);
        return "bracket"; 
    }
    stream.next();
    console.log("Matched stream as null:", stream);
    return null;
}

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

    ANCHORED_STR_LITERAL_RE: anchorExp(VALID_STRING_LITERAL_RE),

    padRegex: padRegex,
    anchorExp: anchorExp,
    tokenMatch: tokenMatch,
}

export {RegExps};