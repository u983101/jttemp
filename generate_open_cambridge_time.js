const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify');

// Configuration - make paths configurable
const config = {
    inputDir: process.env.CSV_INPUT_DIR || 'csvs1',
    outputDir: process.env.CSV_OUTPUT_DIR || 'csvs1',
    usersFile: process.env.USERS_FILE || 'users.csv',
    queryDataFile: process.env.QUERY_DATA_FILE || 'query_data.csv',
    outputFile: process.env.OUTPUT_FILE || 'openCambridgeTime.csv'
};

// Read users data and create a mapping from id to user details
function readUsersData() {
    return new Promise((resolve, reject) => {
        const users = {};
        const usersPath = path.join(config.inputDir, config.usersFile);
        
        // Create a stream and handle BOM
        const stream = fs.createReadStream(usersPath);
        let bomHandled = false;
        let rowCount = 0;
        
        stream
            .pipe(csv())
            .on('data', (row) => {
                rowCount++;
                
                // Handle BOM in the first row if present
                if (!bomHandled) {
                    bomHandled = true;
                    
                    // Check if the first row has BOM artifacts in keys
                    const keys = Object.keys(row);
                    if (keys.length > 0 && keys[0].charCodeAt(0) === 0xFEFF) {
                        console.log('BOM detected in CSV file, stripping from column names');
                        // BOM detected in first key, create a new row with cleaned keys
                        const cleanedRow = {};
                        keys.forEach(key => {
                            const cleanedKey = key.replace(/^\uFEFF/, '').trim();
                            cleanedRow[cleanedKey] = row[key];
                        });
                        row = cleanedRow;
                    }
                }
                
                // Debug: log row structure for first few rows
                if (rowCount <= 3) {
                    console.log(`Row ${rowCount} keys:`, Object.keys(row));
                    console.log(`Row ${rowCount} values:`, row);
                }
                
                // Remove quotes from id if present and handle undefined
                const id = row.id ? row.id.replace(/"/g, '').trim() : '';
                if (id) {
                    users[id] = {
                        email: row.userPrincipalName ? row.userPrincipalName.replace(/"/g, '').trim() : '',
                        name: row.displayName ? row.displayName.replace(/"/g, '').trim() : ''
                    };
                } else {
                    console.warn(`Skipping row ${rowCount}: No valid id found`, row);
                }
            })
            .on('end', () => {
                console.log(`Users data loaded successfully from: ${usersPath}`);
                console.log(`Processed ${rowCount} rows`);
                console.log('Available user IDs:', Object.keys(users));
                resolve(users);
            })
            .on('error', (error) => {
                console.error(`Error reading users CSV: ${error.message}`);
                reject(error);
            });
    });
}

// Process query_data.csv and generate openCambridgeTime.csv
async function generateOpenCambridgeTime() {
    try {
        // Read users data
        const users = await readUsersData();
        
        // Process query data
        const results = [];
        const queryDataPath = path.join(config.inputDir, config.queryDataFile);
        
        // Create a stream and handle BOM for query data
        const queryStream = fs.createReadStream(queryDataPath);
        let queryBomHandled = false;
        let queryRowCount = 0;
        
        queryStream
            .pipe(csv())
            .on('data', (row) => {
                queryRowCount++;
                
                // Handle BOM in the first row if present
                if (!queryBomHandled) {
                    queryBomHandled = true;
                    
                    // Check if the first row has BOM artifacts in keys
                    const keys = Object.keys(row);
                    if (keys.length > 0 && keys[0].charCodeAt(0) === 0xFEFF) {
                        console.log('BOM detected in query data CSV file, stripping from column names');
                        // BOM detected in first key, create a new row with cleaned keys
                        const cleanedRow = {};
                        keys.forEach(key => {
                            const cleanedKey = key.replace(/^\uFEFF/, '').trim();
                            cleanedRow[cleanedKey] = row[key];
                        });
                        row = cleanedRow;
                    }
                }
                
                // Debug: log row structure for first few rows
                if (queryRowCount <= 3) {
                    console.log(`Query Row ${queryRowCount} keys:`, Object.keys(row));
                    console.log(`Query Row ${queryRowCount} values:`, row);
                }
                
                const timestamp = row['timestamp'] || '';
                const userId = row.user_Id ? row.user_Id.replace(/"/g, '').trim() : '';
                
                if (userId) {
                    console.log(`Processing user_id: "${userId}"`);
                    
                    // Find user details
                    const user = users[userId];
                    if (user) {
                        results.push({
                            timestamp: timestamp,
                            Email: user.email,
                            Name: user.name
                        });
                    } else {
                        console.warn(`User with id "${userId}" not found in users.csv`);
                    }
                } else {
                    console.warn(`Skipping query row ${queryRowCount}: No valid user_id found`, row);
                }
            })
            .on('end', () => {
                // Generate output CSV
                stringify(results, {
                    header: true,
                    columns: ['timestamp', 'Email', 'Name']
                }, (err, output) => {
                    if (err) {
                        console.error('Error generating CSV:', err);
                        return;
                    }
                    
                    // Ensure output directory exists
                    if (!fs.existsSync(config.outputDir)) {
                        fs.mkdirSync(config.outputDir, { recursive: true });
                    }
                    
                    // Write to output file
                    const outputPath = path.join(config.outputDir, config.outputFile);
                    fs.writeFile(outputPath, output, (err) => {
                        if (err) {
                            console.error('Error writing file:', err);
                        } else {
                            console.log(`Successfully generated ${config.outputFile} with ${results.length} records`);
                            console.log(`File saved to: ${outputPath}`);
                        }
                    });
                });
            })
            .on('error', (error) => {
                console.error(`Error processing ${config.queryDataFile}:`, error);
            });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the generation process
generateOpenCambridgeTime();
