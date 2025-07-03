import { parse } from 'https://cdn.jsdelivr.net/npm/csv-parse@5.6.0/+esm';
import { COLUMNS } from './e7/references.js';

let CSVParse = {

    parseUpload: async function(upload_file) {
        this.validateCSV(upload_file);
        const csvString = await upload_file.text();
        const lines = csvString.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const battleArr = [];

        headers.map((h, i) => {
            if (h !== COLUMNS[i]) {
                throw new Error(`Header ${h} does not match expected column ${COLUMNS[i]} at index ${i}`);
            }
        });

        const parser = parse({
            columns: true, // Treat the first row as column headers
            skip_empty_lines: true, // Ignore empty lines
            quote: '"',
        });

        parser.on("readable", () => {
            let record;
            while ((record = parser.read()) !== null) {
                battleArr.push(record);
            }
        });

        parser.on("error", (error) => {
            throw new Error(`Failed to parse CSV file: ${error.message}`);
        });

        lines.map(line => {
            parser.write(`${line}\n`);
        });

        parser.end();

        return battleArr;
    },

    validateCSV: function(upload_file) {
        if (!upload_file.name.endsWith(".csv")) {
            throw new Error("File must be .csv");
        }

        // Check file size (optional, e.g. <5MB)
        const maxMB = 10;
        const maxSize = maxMB * 1024 * 1024;
        if (upload_file.size > maxSize) {
            throw new Error(`File must be smaller than ${maxMB}mb, got ${upload_file.size / (1024 * 1024)}mb File.`);
        }
    },
}

export default CSVParse;