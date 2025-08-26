import Papa from "papaparse";
import { CSVHeaders, COLUMNS_MAP, RawUploadBattle} from "./e7/references.ts";

type RawUploadBattleArray = RawUploadBattle[];

function validateUserAndServer(battleArr: RawUploadBattleArray) {
	let users = new Set();
	let servers = new Set();
	for (let i = 0; i < battleArr.length; i++) {
		let [user, server] = [battleArr[i][COLUMNS_MAP.P1_ID], battleArr[i][COLUMNS_MAP.P1_SERVER]];
		let rowNum = i + 1;
		if (user.trim() === "" || !user)
			throw new Error(
				`Detected an empty ID for Player 1: failed at row: ${rowNum}`
			);
		if (server.trim() === "" || !server)
			throw new Error(
				`Detected an empty Server for Player 1: failed at row: ${rowNum}`
			);

		users.add(user);
		if (users.size > 1)
			throw new Error(
				`File must have exactly one ID for Player 1: found IDS: [${[
					...users,
				]}]; failed at row: ${rowNum}`
			);
		servers.add(server);
		if (servers.size > 1)
			throw new Error(
				`File must exactly one Server for Player 1: found Servers: [${[
					...servers,
				]}]; failed at row: ${rowNum}`
			);
	}
}

let CSVParse = {
	parseUpload: async function (upload_file: File): Promise<RawUploadBattleArray> {
		this.validateCSV(upload_file);

		const csvString = await upload_file.text();

		// Parse with PapaParse
		const result = Papa.parse(csvString, {
			header: true,
			skipEmptyLines: true,
			quoteChar: '"',
			dynamicTyping: false,
		});

		// Validate headers
		const parsedHeaders = result.meta.fields;
		if (!parsedHeaders) {
			throw new Error("Failed to parse CSV: No headers found");
		}
		if (parsedHeaders && parsedHeaders.length !== CSVHeaders.length) {
			throw new Error(
				`File must have ${CSVHeaders.length} columns, found ${parsedHeaders.length}`
			);
		}
		parsedHeaders.forEach((h, i) => {
			const cleaned = h.trim().replace(/"/g, "");
			if (cleaned !== CSVHeaders[i]) {
				throw new Error(
					`Header "${cleaned}" does not match expected column "${CSVHeaders[i]}" at index ${i}`
				);
			}
		});

		if (result.errors.length > 0) {
			const error = result.errors[0];
			throw new Error(
				`Failed to parse CSV: Row ${error.row}, ${error.message}`
			);
		}
		console.log("Parsed CSV");
		console.log(result.data);
		const battleArr = result.data as RawUploadBattleArray;
		this.postParseValidation(battleArr);
		return battleArr;
	},

	validateCSV: function (upload_file: File) {
		if (!upload_file.name.endsWith(".csv")) {
			throw new Error("File must be .csv");
		}

		// Check file size (optional, e.g. <5MB)
		const maxMB = 50;
		const maxSize = maxMB * 1024 * 1024;
		if (upload_file.size > maxSize) {
			throw new Error(
				`File must be smaller than ${maxMB}mb, got ${
					upload_file.size / (1024 * 1024)
				}mb File.`
			);
		}
	},

	postParseValidation: function (battleArr: RawUploadBattleArray) {
		if (battleArr.length < 2) {
			throw new Error("File must have at least 1 battle");
		}
		validateUserAndServer(battleArr);
	},
};

export default CSVParse;
