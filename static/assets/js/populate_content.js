import { COLUMNS_EXPANDED, ARRAY_COLUMNS } from "./e7/references";

function destroyDataTable(tableid) {
	const tableSelector = $(`#${tableid}`);
	if ($.fn.dataTable.isDataTable(tableSelector)) {
		console.log("Destroying DataTable: ", tableid);
		tableSelector.DataTable().clear().destroy();
	}
}

function getDataWithStringifiedArrayColumns(dataArr) {
	dataArr = structuredClone(dataArr);
	for (const row of dataArr) {
		for (const col of ARRAY_COLUMNS) {
			row[col] = JSON.stringify(row[col]);
		}
	}
	return dataArr;
}

let Tables = {};

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

Tables.functions = {
	populateHeroStatsTable: function (tableid, data) {
		destroyDataTable(tableid);

		const tbody = document.getElementById(`${tableid}Body`);
		tbody.innerHTML = ""; // Clear existing rows

		data.forEach((item) => {
			const row = document.createElement("tr");

			// Populate each <td> in order
			row.innerHTML = `
            <td>${item.hero}</td>
            <td>${item.games_won}</td>
            <td>${item.games_appeared}</td>
            <td>${item.appearance_rate}</td>
            <td>${item.win_rate}</td>
            <td>${item["+/-"]}</td>
            `;

			tbody.appendChild(row);
		});

		const person = tableid.includes("Player") ? "Player" : "Enemy";

		const tableSelector = $(`#${tableid}`);

		var table = tableSelector.DataTable({
			layout: {
				topStart: "buttons",
			},
			language: {
				info: "Total rows: _TOTAL_",
			},
			order: [[3, "desc"]], // order by pick rate desc
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
		});
	},

	populateSeasonDetailsTable: function (tableid, data) {
		const tbody = document.getElementById(`${tableid}Body`);
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
		const tbody = document.getElementById(`${tableid}-body`);
		tbody.innerHTML = ""; // Clear existing rows

		data.forEach((item) => {
			const row = document.createElement("tr");

			// Populate each <td> in order
			row.innerHTML = `
            <td>${item["server"]}</td>
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
		const tbody = document.getElementById(`${tableid}Body`);
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
		const tbody = document.getElementById(`${tableid}Body`);
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
		const tbody = document.getElementById(`${tableid}Body`);
		tbody.innerHTML = ""; // Clear existing rows

		let name;
		if (user) {
			name = user.name;
		} else {
			name = data.length === 0 ? "Empty" : `UID(${data[0]["P1 ID"]})`;
		}

		const fname = `${name} Battle Data`;

		var table = $("#BattlesTable").DataTable({
			layout: {
				topStart: "buttons",
			},
			language: {
				info: "Total rows: _TOTAL_",
			},
			order: [[0, "desc"]], // Sort by Date/Time desc by default
			columnDefs: [
				{
					targets: "_all",
					className: "nowrap",
				},
			],
			rowCallback: function (row, data, dataIndex) {

				const winCell = row.cells[13];
				const firstPickCell = row.cells[14];

				if (data["Win"] === true) {
					winCell.style.color = "mediumspringgreen";
				} else if (data["Win"] === false) {
					winCell.style.color = "red";
				}

				if (data["First Pick"] === true) {
					firstPickCell.style.color = "deepskyblue";
				}
			},
			buttons: {
				name: "primary",
				buttons: [
					"copy",
					{
						extend: "csv",
						text: "CSV",
						filename: fname,
					},
					{
						extend: "excel",
						text: "Excel",
						filename: fname,
					},
				],
			},
			pageLength: 50,
			scrollY: "300px",
			deferRender: true,
			scroller: true,
			scrollCollapse: false,
			columns: COLUMNS_EXPANDED.map((col) => ({ data: col })),
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
		this.replaceDatatableData("BattlesTable", data);
	},
};

let CardContent = {};

CardContent.functions = {
	populateGeneralStats: function (general_stats) {
		document.getElementById("total-battles").textContent =
			general_stats.total_battles;
		document.getElementById("first-pick-count").textContent =
			general_stats.first_pick_count;
		document.getElementById(
			"first-pick-rate"
		).textContent = ` (${general_stats.first_pick_rate})`;
		document.getElementById("second-pick-count").textContent =
			general_stats.second_pick_count;
		document.getElementById(
			"second-pick-rate"
		).textContent = ` (${general_stats.second_pick_rate})`;

		document.getElementById("total-winrate").textContent =
			general_stats.total_winrate;
		document.getElementById("first-pick-winrate").textContent =
			general_stats.first_pick_winrate;
		document.getElementById("second-pick-winrate").textContent =
			general_stats.second_pick_winrate;

		document.getElementById("total-wins").textContent =
			general_stats.total_wins;
		document.getElementById("max-win-streak").textContent =
			general_stats.max_win_streak;
		document.getElementById("max-loss-streak").textContent =
			general_stats.max_loss_streak;
		document.getElementById("avg-ppg").textContent = general_stats.avg_ppg;
	},

	populateRankPlot: function (rank_plot_html) {
		const container = document.getElementById("rank-plot-container");

		container.innerHTML = rank_plot_html;

		// Extract and re-execute any <script> in the injected HTML
		const scripts = container.querySelectorAll("script");
		scripts.forEach((script) => {
			const newScript = document.createElement("script");
			if (script.src) {
				newScript.src = script.src;
			} else {
				newScript.textContent = script.textContent;
			}
			document.body.appendChild(newScript); // or container.appendChild if it's inline
		});

		setTimeout(() => {
			window.dispatchEvent(new Event("resize"));
		}, 10);
	},
};

export { Tables, CardContent };
