import { BattleType, COLUMNS_MAP } from "../references";

// FNS that take in a clean format battle and return the appropriate data
export const FIELD_EXTRACT_FN_MAP: { [key: string]: (battle: BattleType) => any } = {
    "date": (battle) =>
        battle[COLUMNS_MAP.DATE_TIME]
            ? new Date(`${(battle[COLUMNS_MAP.DATE_TIME] as string).slice(0, 10)}T00:00:00`)
            : "N/A",
    "season": (battle) => battle[COLUMNS_MAP.SEASON_CODE],
    "is-first-pick": (battle) => (battle[COLUMNS_MAP.FIRST_PICK] ? 1 : 0),
    "is-win": (battle) => (battle[COLUMNS_MAP.WIN] ? 1 : 0),
    "victory-points": (battle) => battle[COLUMNS_MAP.P1_POINTS],
    "p1.picks": (battle) => battle[COLUMNS_MAP.P1_PICKS],
    "p2.picks": (battle) => battle[COLUMNS_MAP.P2_PICKS],
    "p1.prebans": (battle) => battle[COLUMNS_MAP.P1_PREBANS],
    "p2.prebans": (battle) => battle[COLUMNS_MAP.P2_PREBANS],
    "p1.postban": (battle) => battle[COLUMNS_MAP.P1_POSTBAN],
    "p2.postban": (battle) => battle[COLUMNS_MAP.P2_POSTBAN],
    "prebans": (battle) => [
        ...battle[COLUMNS_MAP.P1_PREBANS],
        ...battle[COLUMNS_MAP.P2_PREBANS],
    ],
    "p1.pick1": (battle) => battle[COLUMNS_MAP.P1_PICKS][0],
    "p1.pick2": (battle) => battle[COLUMNS_MAP.P1_PICKS][1],
    "p1.pick3": (battle) => battle[COLUMNS_MAP.P1_PICKS][2],
    "p1.pick4": (battle) => battle[COLUMNS_MAP.P1_PICKS][3],
    "p1.pick5": (battle) => battle[COLUMNS_MAP.P1_PICKS][4],
    "p2.pick1": (battle) => battle[COLUMNS_MAP.P2_PICKS][0],
    "p2.pick2": (battle) => battle[COLUMNS_MAP.P2_PICKS][1],
    "p2.pick3": (battle) => battle[COLUMNS_MAP.P2_PICKS][2],
    "p2.pick4": (battle) => battle[COLUMNS_MAP.P2_PICKS][3],
    "p2.pick5": (battle) => battle[COLUMNS_MAP.P2_PICKS][4],
    "p1.league": (battle) => battle[COLUMNS_MAP.P1_LEAGUE],
    "p2.league": (battle) => battle[COLUMNS_MAP.P2_LEAGUE],
    "p1.server": (battle) => battle[COLUMNS_MAP.P1_SERVER],
    "p2.server": (battle) => battle[COLUMNS_MAP.P2_SERVER],
    "p1.id": (battle) => Number(battle[COLUMNS_MAP.P1_ID]),
    "p2.id": (battle) => Number(battle[COLUMNS_MAP.P2_ID]),
    "p1.mvp": (battle) => battle[COLUMNS_MAP.P1_MVP],
    "p2.mvp": (battle) => battle[COLUMNS_MAP.P2_MVP],
    "is-first-turn": (battle) => battle[COLUMNS_MAP.FIRST_TURN],
    "first-turn-hero": (battle) => battle[COLUMNS_MAP.FIRST_TURN_HERO],
    "turns": (battle) => battle[COLUMNS_MAP.TURNS],
    "seconds": (battle) => battle[COLUMNS_MAP.SECONDS],
    "point-gain": (battle) => battle[COLUMNS_MAP.POINT_GAIN],
} as const;