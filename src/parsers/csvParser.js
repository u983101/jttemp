const csv = require('csv-parser');
const fs = require('fs');
const { parseDate } = require('../utils/dateUtils');

/**
 * Parse CSV file with streaming for large files
 * @param {string} filePath - Path to CSV file
 * @param {Function} transformFn - Function to transform each row
 * @returns {Promise<Array>} Array of parsed objects
 */
function parseCSV(filePath, transformFn = (row) => row) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        try {
          const transformed = transformFn(data);
          results.push(transformed);
        } catch (error) {
          console.warn(`Error transforming row: ${error.message}`);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Transform useravailability.csv rows
 * @param {Object} row - Raw CSV row
 * @returns {Object} Transformed task action
 */
function transformUserAvailability(row) {
  return {
    createdOn: parseDate(row['Created On']),
    action: row['Action'],
    productiveTime: row['Productive Time'] ? parseInt(row['Productive Time']) : null,
    taskId: row['TaskID'] || null,
    loginEmail: row['Login Email'],
    taskOpenTime: parseDate(row['Task Open Time'])
  };
}

/**
 * Transform taskhistories.csv rows
 * @param {Object} row - Raw CSV row
 * @returns {Object} Transformed task history
 */
function transformTaskHistory(row) {
  return {
    taskH: row['TaskH'],
    taskId: row['C&L-Task'],
    workStatus: row['Work Status'],
    mcStatus: row['MC Status'],
    action: row['Action'],
    actionTimestamp: parseDate(row['Action TimeStamp']),
    lastModifiedByUser: row['Last Modified By User']
  };
}

/**
 * Transform users.csv rows
 * @param {Object} row - Raw CSV row
 * @returns {Object} Transformed user
 */
function transformUser(row) {
  return {
    id: row['id'],
    userPrincipalName: row['userPrincipalName'],
    displayName: row['displayName']
  };
}

/**
 * Transform openCambridgeTime.csv rows
 * @param {Object} row - Raw CSV row
 * @returns {Object} Transformed page entry
 */
function transformOpenCambridgeTime(row) {
  return {
    timestamp: parseDate(row['timestamp']),
    email: row['Email'],
    name: row['Name']
  };
}

/**
 * Transform assigntome.csv rows
 * @param {Object} row - Raw CSV row
 * @returns {Object} Transformed assignment data
 */
function transformAssignToMe(row) {
  // Parse customDimensions which contains JSON data
  let customDimensions = {};
  try {
    // The customDimensions field contains JSON-like data
    const customDimensionsStr = row['customDimensions'] || '{}';
    // Handle potential formatting issues and parse JSON
    customDimensions = JSON.parse(customDimensionsStr.replace(/:/g, ',').replace(/,""/g, ',"').replace(/"""/g, '"'));
  } catch (error) {
    console.warn(`Error parsing customDimensions: ${error.message}`);
  }

  return {
    timestamp: parseDate(row['timestamp [UTC]']),
    message: row['message'],
    severityLevel: row['severityLevel'],
    itemType: row['itemType'],
    tasknum: customDimensions.tasknum || null
  };
}

module.exports = {
  parseCSV,
  transformUserAvailability,
  transformTaskHistory,
  transformUser,
  transformOpenCambridgeTime,
  transformAssignToMe
};
