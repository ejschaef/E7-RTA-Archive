

let CSVParse = {

    parseUpload: async function(upload_file) {
        this.validateCSV(upload_file);
        try {
          const text = await upload_file.text();
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());

          const battleArr = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim());
              return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
          });
          console.log("Parsed CSV Successfully; Number of battles: " + battleArr.length);
          return battleArr;
          // You can now store the data, process it, or update your app state
        } catch (err) {
            throw new Error(`Failed to parse CSV file: ${err.message}`);
        }
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