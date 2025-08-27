const moment = require('moment');

/**
 * Parse various date formats from the CSV files
 * @param {string} dateString - Date string from CSV
 * @returns {Date} Parsed date in UTC
 */
function parseDate(dateString) {
  if (!dateString || dateString.trim() === '') {
    return null;
  }

  // Handle different date formats found in the sample data
  const formats = [
    'M/D/YYYY H:mm', // 8/25/2025 8:50
    'M/D/YYYY H:mm:ss.SSS A', // 7/28/2025 10:01:03.405 AM
    'YYYY-MM-DDTHH:mm:ss.SSS[Z]', // 2025-08-25T13:20:00.000Z
    'YYYY-MM-DDTHH:mm:ss.SSS Z' // 2025-08-15T09:27:58.694Z
  ];

  for (const format of formats) {
    const parsed = moment(dateString, format, true);
    if (parsed.isValid()) {
      return parsed.utc().toDate();
    }
  }

  // Try default parsing as fallback
  const defaultParsed = moment(dateString);
  if (defaultParsed.isValid()) {
    return defaultParsed.utc().toDate();
  }

  console.warn(`Could not parse date: ${dateString}`);
  return null;
}

/**
 * Calculate time difference in minutes between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number|null} Difference in minutes, or null if invalid dates
 */
function calculateTimeDifferenceMinutes(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = moment(startDate);
  const end = moment(endDate);

  if (!start.isValid() || !end.isValid()) {
    return null;
  }

  return Math.abs(end.diff(start, 'minutes'));
}

/**
 * Extract timestamp from gcp.json textPayload
 * @param {string} textPayload - The text payload from gcp.json
 * @returns {Date|null} Extracted timestamp or null if not found
 */
function extractTimestampFromTextPayload(textPayload) {
  if (!textPayload) return null;

  // Look for ISO timestamp pattern in the text payload
  const timestampMatch = textPayload.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  if (timestampMatch) {
    return parseDate(timestampMatch[0]);
  }

  return null;
}

module.exports = {
  parseDate,
  calculateTimeDifferenceMinutes,
  extractTimestampFromTextPayload
};
