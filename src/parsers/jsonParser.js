const fs = require('fs');
const { extractTimestampFromTextPayload } = require('../utils/dateUtils');

/**
 * Parse gcp.json file and extract auto-assignment information
 * @param {string} filePath - Path to gcp.json file
 * @returns {Promise<Array>} Array of auto-assignment objects
 */
function parseGCPJson(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const jsonData = JSON.parse(data);
        const assignments = [];

        for (const item of jsonData) {
          const assignment = extractAutoAssignment(item);
          if (assignment) {
            assignments.push(assignment);
          }
        }

        resolve(assignments);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

/**
 * Extract auto-assignment information from gcp.json item
 * @param {Object} item - GCP log item
 * @returns {Object|null} Auto-assignment object or null if invalid
 */
function extractAutoAssignment(item) {
  if (!item.textPayload) {
    return null;
  }

  const textPayload = item.textPayload;
  
  // Extract task ID from text payload
  const taskIdMatch = textPayload.match(/TASK-\d+/);
  if (!taskIdMatch) {
    return null;
  }

  const taskId = taskIdMatch[0];

  // Extract email from text payload
  const emailMatch = textPayload.match(/email=([^,]+)/);
  let email = null;
  if (emailMatch && emailMatch[1]) {
    email = emailMatch[1].trim();
  }

  // Extract timestamp - prefer the explicit timestamp field, fallback to text payload
  let timestamp = null;
  if (item.timestamp) {
    timestamp = new Date(item.timestamp);
  } else {
    timestamp = extractTimestampFromTextPayload(textPayload);
  }

  // If we couldn't extract a valid timestamp, skip this assignment
  if (!timestamp || isNaN(timestamp.getTime())) {
    return null;
  }

  return {
    taskId,
    email,
    timestamp
  };
}

/**
 * Build a map of task IDs to auto-assignment information
 * @param {Array} assignments - Array of auto-assignment objects
 * @returns {Map} Map of taskId to assignment info
 */
function buildAutoAssignmentMap(assignments) {
  const assignmentMap = new Map();
  
  for (const assignment of assignments) {
    if (assignment.taskId) {
      assignmentMap.set(assignment.taskId, assignment);
    }
  }
  
  return assignmentMap;
}

module.exports = {
  parseGCPJson,
  extractAutoAssignment,
  buildAutoAssignmentMap
};
