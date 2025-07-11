import Papa from 'papaparse';
import { COLUMNS } from './e7/references.js';

let CSVParse = {

    parseUpload: async function(upload_file) {
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
        parsedHeaders.forEach((h, i) => {
            const cleaned = h.trim().replace(/"/g, '');
            if (cleaned !== COLUMNS[i]) {
                throw new Error(`Header ${cleaned} does not match expected column ${COLUMNS[i]} at index ${i}`);
            }
        });

        if (result.errors.length > 0) {
            const error = result.errors[0];
            throw new Error(`Failed to parse CSV: Row ${error.row}, ${error.message}`);
        }

        return result.data;
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