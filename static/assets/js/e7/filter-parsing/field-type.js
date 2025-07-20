import Futils from "../filter-utils.js";

const INT_FIELDS = new Set(["victory-points"]);

// Fields that will extract arrays and can be used with the 'in' operators
const SET_FIELDS = new Set([
    "prebans",
    "p1.picks",
    "p2.picks",
    "p1.prebans",
    "p2.prebans",
]);

class FieldType {
    // FNS that take in a clean format battle and return the appropriate data
    static FIELD_EXTRACT_FN_MAP = {
        date: (battle) =>
            battle["Date/Time"]
                ? new Date(`${battle["Date/Time"]?.slice(0, 10)}T00:00:00`)
                : "N/A",
        "is-first-pick": (battle) => (battle["First Pick"] ? 1 : 0),
        "is-win": (battle) => (battle["Win"] ? 1 : 0),
        "victory-points": (battle) => battle["P1 Points"],
        "p1.picks": (battle) => battle["P1 Picks"],
        "p2.picks": (battle) => battle["P2 Picks"],
        "p1.prebans": (battle) => battle["P1 Prebans"],
        "p2.prebans": (battle) => battle["P2 Prebans"],
        "p1.postban": (battle) => battle["P1 Postban"],
        "p2.postban": (battle) => battle["P2 Postban"],
        "prebans": (battle) => [...battle["P1 Prebans"], ...battle["P2 Prebans"]],
        "p1.pick1": (battle) => battle["P1 Picks"][0],
        "p1.pick2": (battle) => battle["P1 Picks"][1],
        "p1.pick3": (battle) => battle["P1 Picks"][2],
        "p1.pick4": (battle) => battle["P1 Picks"][3],
        "p1.pick5": (battle) => battle["P1 Picks"][4],
        "p2.pick1": (battle) => battle["P2 Picks"][0],
        "p2.pick2": (battle) => battle["P2 Picks"][1],
        "p2.pick3": (battle) => battle["P2 Picks"][2],
        "p2.pick4": (battle) => battle["P2 Picks"][3],
        "p2.pick5": (battle) => battle["P2 Picks"][4],
        "p1.league": (battle) => battle["P1 League"],
        "p2.league": (battle) => battle["P2 League"],
        "p1.server": (battle) => battle["P1 Server"],
        "p2.server": (battle) => battle["P2 Server"],
        "p1.id": (battle) => Number(battle["P1 ID"]),
        "p2.id": (battle) => Number(battle["P2 ID"]),
        "p1.mvp": (battle) => battle["P1 MVP"],
        "p2.mvp": (battle) => battle["P2 MVP"],
        "is-first-turn": (battle) => battle["First Turn"],
        "first-turn-hero": (battle) => battle["First Turn Hero"],
        "turns": (battle) => battle["Turns"],
        "seconds": (battle) => battle["Seconds"],
    };

    constructor(str) {
        const fn = FieldType.FIELD_EXTRACT_FN_MAP[str];
        if (!fn) {
            throw new Futils.ValidationError(
                `Invalid field type: '${str}'; valid types are: ${Object.keys(
                    FieldType.FIELD_EXTRACT_FN_MAP
                ).join(", ")}`
            );
        } else {
            console.log("Found valid field type: ", str);
        }
        this.str = str;
        this.extractData = fn;
    }

    toString() {
        return this.str;
    }
}

export { FieldType, INT_FIELDS, SET_FIELDS };