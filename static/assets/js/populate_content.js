import {
	COLUMNS_MAP,
	ARRAY_COLUMNS,
	HERO_STATS_COLUMN_MAP,
} from "./e7/references.ts";
import { generateRankPlot, getZoom } from "./e7/plots.ts";
import ClientCache from "./cache-manager.ts";
import UserManager from "./e7/user-manager.ts";
import { Safe } from "./utils.ts";
import DOC_ELEMENTS from "./pages/page-utilities/doc-element-references.js";

function destroyDataTable(tableid) {
	const tableSelector = $(`#${tableid}`);
	if ($.fn.dataTable.isDataTable(tableSelector)) {
		console.log("Destroying DataTable: ", tableid);
		tableSelector.DataTable().clear().destroy();
	}
}

/**
 * Returns a copy of the dataArr with the array columns converted to strings
 * (using JSON.stringify). This is necessary for the DataTables library to
 * properly render the data.
 *
 * @param {Array<Object>} dataArr - The data array to modify.
 * @returns {Array<Object>} - The modified data array.
 */
function getDataWithStringifiedArrayColumns(dataArr) {
	dataArr = structuredClone(dataArr);
	for (const row of dataArr) {
		for (const col of ARRAY_COLUMNS) {
			row[col] = JSON.stringify(row[col]);
		}
	}
	return dataArr;
}

function convertPercentToColorClass(str) {
	const num = Number(str.replace("%", ""));
	if (num > 50) {
		return "text-over50";
	} else if (num < 50) {
		return "text-below50";
	} else {
		return "";
	}
}

function getTbody(tableid) {
	const tbody = document.getElementById(`${tableid}-body`);
	if (!tbody) {
		throw new Error(`Could not find tbody with id ${tableid}-body`);
	}
	return tbody;
}

let Tables = {
	populateHeroStatsTable: function (tableid, data) {
		destroyDataTable(tableid);

		const tbody = getTbody(tableid);
		tbody.innerHTML = ""; // Clear existing rows

		const isP1 = tableid.toLowerCase().includes("player");
		const person = isP1 ? "Player" : "Enemy";

		const P1_COLUMNS = [
			HERO_STATS_COLUMN_MAP.HERO_NAME,
			HERO_STATS_COLUMN_MAP.BATTLES,
			HERO_STATS_COLUMN_MAP.PICK_RATE,
			HERO_STATS_COLUMN_MAP.WINS,
			HERO_STATS_COLUMN_MAP.WIN_RATE,
			HERO_STATS_COLUMN_MAP.POSTBAN_RATE,
			HERO_STATS_COLUMN_MAP.SUCCESS_RATE,
			HERO_STATS_COLUMN_MAP.PLUS_MINUS,
			HERO_STATS_COLUMN_MAP.POINT_GAIN,
			HERO_STATS_COLUMN_MAP.AVG_CR,
			HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE,
		];

		const P2_COLUMNS = P1_COLUMNS.filter(
			(col) => col !== HERO_STATS_COLUMN_MAP.SUCCESS_RATE
		);

		const columns = isP1 ? P1_COLUMNS : P2_COLUMNS;

		console.log("Columns: ", columns);

		const tableSelector = $(`#${tableid}`);

		var table = tableSelector.DataTable({
			layout: {
				topStart: "buttons",
			},
			language: {
				info: "Total rows: _TOTAL_",
			},
			order: [[2, "desc"]], // order by pick rate desc
			buttons: {
				name: "primary",
				buttons: [
					"copy",
					{
						extend: "csv",
						text: "CSV",
						filename: person + " Hero Stats",
					},
					{
						extend: "excel",
						text: "Excel",
						filename: person + " Hero Stats",
					},
				],
			},
			columnDefs: [
				{
					targets: "_all",
					className: "nowrap",
				},
				{
					targets: 4, // "win_rate" column
					createdCell: function (td, cellData) {
						const num = Number(cellData.replace("%", ""));
						if (num < 50) {
							td.style.color = "red";
						} else if (num > 50) {
							td.style.color = "mediumspringgreen";
						}
					},
				},
			],
			pageLength: 50,
			scrollY: "300px",
			deferRender: true,
			scroller: true,
			scrollCollapse: false,
			columns: columns.map((col) => ({ data: col })),
		});
		table.rows.add(data).draw();
		return table;
	},

	populateSeasonDetailsTable: function (tableid, data) {
		const tbody = getTbody(tableid);
		tbody.innerHTML = ""; // Clear existing rows

		data.forEach((item) => {
			const row = document.createElement("tr");

			// Populate each <td> in order
			row.innerHTML = `
            <td>${item["Season Number"]}</td>
            <td>${item["Season"]}</td>
            <td>${item["Start"]}</td>
            <td>${item["End"]}</td>
            <td>${item["Status"]}</td>
            `;
			tbody.appendChild(row);
		});
	},

	populateServerStatsTable: function (tableid, data) {
		const tbody = getTbody(tableid);
		tbody.innerHTML = ""; // Clear existing rows

		data.forEach((item) => {
			const row = document.createElement("tr");
			const labelColorClass = item["label"].includes("Server")
				? "cm-keyword"
				: "cm-declared-data";

			// Populate each <td> in order
			row.innerHTML = `
            <td class="${labelColorClass}">${item["label"]}</td>
            <td>${item["count"]}</td>
            <td>${item["frequency"]}</td>
            <td>${item["wins"]}</td>
            <td class="${convertPercentToColorClass(item["win_rate"])}">${
				item["win_rate"]
			}</td>
            <td>${item["+/-"]}</td>
            <td class="${convertPercentToColorClass(item["fp_wr"])}">${
				item["fp_wr"]
			}</td>
            <td class="${convertPercentToColorClass(item["sp_wr"])}">${
				item["sp_wr"]
			}</td>
            `;
			tbody.appendChild(row);
		});
	},

	populatePlayerPrebansTable: function (tableid, data) {
		const tbody = getTbody(tableid);
		tbody.innerHTML = ""; // Clear existing rows

		data.forEach((item) => {
			const row = document.createElement("tr");

			// Populate each <td> in order
			row.innerHTML = `
            <td>${item["preban"]}</td>
            <td>${item["appearances"]}</td>
            <td>${item["appearance_rate"]}</td>
            <td class="${convertPercentToColorClass(item["win_rate"])}">${
				item["win_rate"]
			}</td>
            <td>${item["+/-"]}</td>
            `;

			tbody.appendChild(row);
		});
	},

	populatePlayerFirstPickTable: function (tableid, data) {
		const tbody = getTbody(tableid);
		tbody.innerHTML = ""; // Clear existing rows

		data.forEach((item) => {
			const row = document.createElement("tr");

			// Populate each <td> in order
			row.innerHTML = `
            <td>${item["hero"]}</td>
            <td>${item["appearances"]}</td>
            <td>${item["appearance_rate"]}</td>
            <td class="${convertPercentToColorClass(item["win_rate"])}">${
				item["win_rate"]
			}</td>
            <td>${item["+/-"]}</td>
            `;

			tbody.appendChild(row);
		});
	},

	populateFullBattlesTable: function (tableid, data, user) {
		destroyDataTable(tableid);

		data = getDataWithStringifiedArrayColumns(data);
		const tbody = getTbody(tableid);
		tbody.innerHTML = ""; // Clear existing rows

		let fileName;
		const timestamp = currentTimestamp().split("T")[0] || "";
		if (user) {
			fileName = `${user.name} (${user.id}) ${timestamp}`;
		} else {
			fileName = data.length === 0 ? "Empty" : `UID(${data[0]["P1 ID"]}) ${timestamp}`;
		}

		var table = $(`#${tableid}`).DataTable({
			layout: {
				topStart: "buttons",
			},
			language: {
				info: "Total rows: _TOTAL_",
			},
			order: [[2, "desc"]], // Sort by Date/Time desc by default
			columnDefs: [
				{
					targets: "_all",
					className: "nowrap",
				},
			],
			rowCallback: function (row, data, dataIndex) {
				const winCell = row.cells[14];
				const firstPickCell = row.cells[15];
				const firstTurnCell = row.cells[16];

				if (data["Win"] === true) {
					winCell.style.color = "mediumspringgreen";
				} else if (data["Win"] === false) {
					winCell.style.color = "red";
				}

				if (data["First Pick"] === true) {
					firstPickCell.style.color = "deepskyblue";
				}

				if (data["First Turn"] === true) {
					firstTurnCell.style.color = "deepskyblue";
				}
			},
			buttons: {
				name: "primary",
				buttons: [
					"copy",
					{
						extend: "csv",
						text: "CSV",
						filename: fileName,
					},
					{
						extend: "excel",
						text: "Excel",
						filename: fileName,
					},
				],
			},
			pageLength: 50,
			scrollY: "300px",
			deferRender: true,
			scroller: true,
			scrollCollapse: false,
			columns: Object.values(COLUMNS_MAP)
				.filter((col) => !col.toLowerCase().includes("prime"))
				.map((col) => ({ data: col })),
		});
		table.rows.add(data).draw();
		return table;
	},

	replaceDatatableData: function (tableid, data) {
		const datatableReference = $(`#${tableid}`).DataTable();
		datatableReference.clear().rows.add(data).draw();
	},

	replaceBattleData(data) {
		data = getDataWithStringifiedArrayColumns(data);
		const id = DOC_ELEMENTS.HOME_PAGE.BATTLES_TBL.id;
		this.replaceDatatableData(id, data);
	},
};

let CardContent = {
	populateGeneralStats: function (general_stats) {
		Safe.setText("total-battles", general_stats.total_battles);
		Safe.setText("first-pick-count", general_stats.first_pick_count);
		Safe.setText("first-pick-rate", ` (${general_stats.first_pick_rate})`);
		Safe.setText("second-pick-count", general_stats.second_pick_count);
		Safe.setText("second-pick-rate", ` (${general_stats.second_pick_rate})`);
		Safe.setText("total-winrate", general_stats.total_winrate);
		Safe.setText("first-pick-winrate", general_stats.first_pick_winrate);
		Safe.setText("second-pick-winrate", general_stats.second_pick_winrate);
		Safe.setText("total-wins", general_stats.total_wins);
		Safe.setText("max-win-streak", general_stats.max_win_streak);
		Safe.setText("max-loss-streak", general_stats.max_loss_streak);
		Safe.setText("avg-ppg", general_stats.avg_ppg);
		Safe.setText("avg-turns", general_stats.avg_turns);
		Safe.setText("avg-time", general_stats.avg_time);
		Safe.setText("max-turns", general_stats.max_turns);
		Safe.setText("max-time", general_stats.max_time);
		Safe.setText("first-turn-games", general_stats.first_turn_games);
		Safe.setText("first-turn-rate", general_stats.first_turn_rate);
	},
};

export { Tables, CardContent };
