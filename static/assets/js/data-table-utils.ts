import type { BattleType } from "./e7/references";

function destroyDataTable(tableid: string) {
	const tableSelector = $(`#${tableid}`);
	if ($.fn.dataTable.isDataTable(tableSelector)) {
		console.log("Destroying DataTable: ", tableid);
		tableSelector.DataTable().clear().destroy();
	}
}

function replaceData(tableid: string, data: BattleType[]) {
    const datatableReference = $(`#${tableid}`).DataTable();
    datatableReference.clear().rows.add(data).draw();
}


let DataTableUtils = {
    destroyDataTable,
    replaceData,
};

export default DataTableUtils;