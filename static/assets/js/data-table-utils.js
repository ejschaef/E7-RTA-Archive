function destroyDataTable(tableid) {
	const tableSelector = $(`#${tableid}`);
	if ($.fn.dataTable.isDataTable(tableSelector)) {
		console.log("Destroying DataTable: ", tableid);
		tableSelector.DataTable().clear().destroy();
	}
}

function replaceData(tableid, data) {
    const datatableReference = $(`#${tableid}`).DataTable();
    datatableReference.clear().rows.add(data).draw();
}


let DataTableUtils = {
    destroyDataTable,
    replaceData,
};

export default DataTableUtils;