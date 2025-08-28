import { TableConstructor } from "../html-constructor/html-constructor.ts";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.ts";
import { COLUMNS_MAP } from "../../e7/references.ts";

const HERO_TBL_COLS = [
	"Hero Name",
	"Battles",
	"Pick Rate",
	"Wins",
	"Win Rate",
	"Postban Rate",
	"Success Rate",
	"+/-",
	"Point Gain",
	"Avg CR",
	"First Turn Rate",
];

let TO_BUILD = [
	{
		tbl: DOC_ELEMENTS.HOME_PAGE.SEASON_DETAILS_TBL,
		cols: ["", "Season", "Start", "End", "Status"],
	},
	{
		tbl: DOC_ELEMENTS.HOME_PAGE.PERFORMANCE_STATS_TBL,
		cols: ["", "Battles", "Freq", "Wins", "Win Rate", "+/-", "FP WR", "SP WR"],
	},
	{
		tbl: DOC_ELEMENTS.HOME_PAGE.FIRST_PICK_STATS_TBL,
		cols: ["Hero", "Battles", "Pick Rate", "Win Rate", "+/-"],
	},
	{
		tbl: DOC_ELEMENTS.HOME_PAGE.PREBAN_STATS_TBL,
		cols: ["Preban", "Battles", "Ban Rate", "Win Rate", "+/-"],
	},
	{
		tbl: DOC_ELEMENTS.HOME_PAGE.PLAYER_TBL,
		cols: HERO_TBL_COLS,
	},
	{
		tbl: DOC_ELEMENTS.HOME_PAGE.OPPONENT_TBL,
		cols: HERO_TBL_COLS.filter((col) => !col.toLowerCase().includes("success")),
	},
	{
		tbl: DOC_ELEMENTS.HOME_PAGE.BATTLES_TBL,
		cols: Object.values(COLUMNS_MAP).filter(
			(col) => !col.toLowerCase().includes("prime")
		),
	},
];

function buildTable(tableElt, cols) {
	const id = tableElt.id;
	const constructor = new TableConstructor(
		tableElt,
		id + "-head",
		id + "-body"
	);
	constructor.addColumns(cols);
}

export function buildTables() {
	TO_BUILD.forEach((entry) => {
		buildTable(entry.tbl, entry.cols);
	});
}
