import { Searcher } from "../e7/searcher.js";
import DataTableUtils from "../data-table-utils.js";
import PageUtils from "./page-utilities/page-utils.js";
import { NavBarUtils } from "./page-utilities/nav-bar-utils.js";
import DOC_ELEMENTS from "./page-utilities/doc-element-references.js";
import UserManager from "../e7/user-manager.ts";
import IPM from "./orchestration/inter-page-manager.ts";

const SEARCH_TABLE_ID = "search-table";

const searcher = new Searcher();

const SEARCH_TABLE_COLUMNS = [
	"Name",
	"ID",
	"Search Score",
	"Raw Search Result",
];

const MAX_SEARCH_RESULTS = 5000;

async function handleClick(rowData) {
	console.log("Clicked row:", rowData);
	const item = JSON.parse(rowData["Raw Search Result"]);
	if (!item.world_code) {
		console.log("Ignoring click on item with no world code:", item);
		return;
	}
	const user = await UserManager.findUser({
		id: item.id,
		world_code: item.world_code,
	});
	if (user === null) {
		throw new Error("User not found:", item);
	}
	await UserManager.clearUserData();
	await UserManager.setUser(user);
	IPM.pushActions([IPM.ACTIONS.QUERY_USER]);
	NavBarUtils.navToHome();
}

function initializeTable() {
	let table = $(`#${SEARCH_TABLE_ID}`).DataTable({
		layout: {},
		language: {},
		searching: false,
		order: [[2, "asc"]], // Sort by Date/Time desc by default
		columnDefs: [
			{
				targets: "_all",
				className: "nowrap",
			},
		],
		buttons: {},
		pageLength: 50,
		scrollY: "300px",
		deferRender: true,
		scroller: true,
		scrollCollapse: false,
		columns: Object.values(SEARCH_TABLE_COLUMNS).map((col) => ({ data: col })),
	});

	$(`#${SEARCH_TABLE_ID} tbody`).on("click", "tr", async function () {
		const rowData = table.row(this).data();
		await handleClick(rowData);
	});
}

function parseTableData(searchElement) {
	return {
		Name: searchElement.item.name,
		ID: searchElement.item.id || searchElement.item.code,
		"Search Score": searchElement.score.toFixed(4),
		"Raw Search Result": JSON.stringify(searchElement.item),
	};
}

function addSearchListener() {
	let searchForm = DOC_ELEMENTS.SEARCH_PAGE.SEARCH_FORM;
	searchForm.addEventListener("submit", async function (event) {
		event.preventDefault();
		let data = new FormData(searchForm);
		let searchTerm = data.get("searchTerm");
		let domain = data.get("searchDomain");
		let results = await searcher.search(domain, searchTerm);
		let tableData = results.map(parseTableData);
		tableData = tableData.slice(0, MAX_SEARCH_RESULTS);
		DataTableUtils.replaceData(SEARCH_TABLE_ID, tableData);
	});
}

async function main() {
	await NavBarUtils.initialize();
	initializeTable();
	addSearchListener();
	PageUtils.setVisibility(
		DOC_ELEMENTS.SEARCH_PAGE.SEARCH_TABLE_CONTAINER,
		true
	);
}

await main();
