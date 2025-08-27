const { parseCSV, transformUserAvailability, transformTaskHistory, transformUser, transformAssignToMe, transformOpenCambridgeTime } = require('./parsers/csvParser');
const { parseGCPJson, buildAutoAssignmentMap } = require('./parsers/jsonParser');
const TaskProcessor = require('./processors/taskProcessor');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');

/**
 * Main function to generate the task performance report
 */
async function generateTaskPerformanceReport() {
  console.log('Starting task performance report generation...');
  
  try {
    // Initialize task processor
    const processor = new TaskProcessor();

    // Parse and process all data sources
    console.log('Parsing useravailability.csv...');
    const userAvailabilityData = await parseCSV(
      path.join(__dirname, '../csvs1/useravailability.csv'),
      transformUserAvailability
    );
    processor.buildTaskActionIndex(userAvailabilityData);

    console.log('Parsing taskhistories.csv...');
    const taskHistoryData = await parseCSV(
      path.join(__dirname, '../csvs1/taskhistories.csv'),
      transformTaskHistory
    );
    processor.buildTaskHistoryIndex(taskHistoryData);

    console.log('Parsing users.csv...');
    const userData = await parseCSV(
      path.join(__dirname, '../csvs1/users.csv'),
      transformUser
    );
    processor.buildUserIndex(userData);

    console.log('Parsing gcp.json...');
    const gcpData = await parseGCPJson(
      path.join(__dirname, '../csvs1/gcp.json')
    );
    processor.buildAutoAssignmentIndex(gcpData);

    console.log('Parsing assigntome.csv...');
    const assignToMeData = await parseCSV(
      path.join(__dirname, '../csvs1/assigntome.csv'),
      transformAssignToMe
    );
    processor.buildOpenTimeIndex(assignToMeData);

    console.log('Parsing openCambridgeTime.csv...');
    const screenOpenData = await parseCSV(
      path.join(__dirname, '../csvs1/openCambridgeTime.csv'),
      transformOpenCambridgeTime
    );
    processor.buildScreenOpenIndex(screenOpenData);

    console.log('Generating report...');
    const reportRecords = processor.generateReport();

    // Output the report to CSV
    const outputPath = path.join(__dirname, '../task_performance_report.csv');
    const ws = fs.createWriteStream(outputPath);
    
    csv.write(reportRecords, { 
      headers: true,
      columns: ['task', 'userName', 'userEmail', 'productiveTime', 'waitingTime', 'mode', 'createdTime', 'assignedTime', 'makerCompleteTime', 'openTime']
    })
      .pipe(ws)
      .on('finish', () => {
        console.log(`Report generated successfully: ${outputPath}`);
        console.log(`Total records processed: ${reportRecords.length}`);
        
        // Show sample of the report
        console.log('\nSample of generated report:');
        console.table(reportRecords.slice(0, 5));
      })
      .on('error', (error) => {
        console.error('Error writing CSV:', error);
      });

  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }
}

/**
 * Test function to validate the implementation with sample data
 */
async function testWithSampleData() {
  console.log('Testing with sample data...');
  
  try {
    const processor = new TaskProcessor();

    // Test data matching the sample structure
    const testUserAvailability = [
      {
        createdOn: new Date('2025-08-25T08:51:00Z'),
        action: 'Task Opened',
        productiveTime: null,
        taskId: 'TASK-913902',
        loginEmail: 'b@hsbc.com',
        taskOpenTime: null
      },
      {
        createdOn: new Date('2025-08-25T08:52:00Z'),
        action: 'Maker Completed',
        productiveTime: 774,
        taskId: 'TASK-931132',
        loginEmail: 'c@hsbc.com',
        taskOpenTime: null
      }
    ];

    const testTaskHistory = [
      {
        taskH: 'TaskH-1',
        taskId: 'TASK-913902',
        workStatus: 'RR',
        mcStatus: 'PME',
        action: 'RR',
        actionTimestamp: new Date('2025-08-25T13:20:00Z'),
        lastModifiedByUser: 'User A'
      }
    ];

    const testUsers = [
      { id: '1', userPrincipalName: 'a@hsbc.com', displayName: 'User A' },
      { id: '2', userPrincipalName: 'b@hsbc.com', displayName: 'User B' },
      { id: '3', userPrincipalName: 'c@hsbc.com', displayName: 'User C' }
    ];

    const testAutoAssignments = [
      {
        taskId: 'TASK-16515',
        email: 'abc1.goo@onextrememail.hsbc.com',
        timestamp: new Date('2025-08-25T13:20:00Z')
      }
    ];

    processor.buildTaskActionIndex(testUserAvailability);
    processor.buildTaskHistoryIndex(testTaskHistory);
    processor.buildUserIndex(testUsers);
    processor.buildAutoAssignmentIndex(testAutoAssignments);

    const testReport = processor.generateReport();
    console.log('Test report generated successfully');
    console.table(testReport);

    return testReport;

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

/**
 * Generate auto task open analysis report
 */
async function generateAutoTaskOpenAnalysis() {
  console.log('Starting auto task open analysis...');
  
  try {
    // Initialize task processor
    const processor = new TaskProcessor();

    // Parse and process required data sources
    console.log('Parsing gcp.json...');
    const gcpData = await parseGCPJson(
      path.join(__dirname, '../csvs1/gcp.json')
    );
    processor.buildAutoAssignmentIndex(gcpData);

    console.log('Parsing users.csv...');
    const userData = await parseCSV(
      path.join(__dirname, '../csvs1/users.csv'),
      transformUser
    );
    processor.buildUserIndex(userData);

    console.log('Parsing openCambridgeTime.csv...');
    const screenOpenData = await parseCSV(
      path.join(__dirname, '../csvs1/openCambridgeTime.csv'),
      transformOpenCambridgeTime
    );
    processor.buildScreenOpenIndex(screenOpenData);

    console.log('Generating auto task open analysis...');
    const analysisRecords = processor.generateAutoTaskOpenAnalysis();

    // Output the analysis to CSV
    const outputPath = path.join(__dirname, '../auto_task_open_analysis.csv');
    const ws = fs.createWriteStream(outputPath);
    
    csv.write(analysisRecords, { 
      headers: true,
      columns: ['taskId', 'userName', 'userEmail', 'assignedTime', 'firstScreenOpenTime', 'timeToOpenMinutes', 'screenOpenCount', 'assignmentDate']
    })
      .pipe(ws)
      .on('finish', () => {
        console.log(`Auto task open analysis generated successfully: ${outputPath}`);
        console.log(`Total auto tasks analyzed: ${analysisRecords.length}`);
        
        // Show sample of the analysis
        console.log('\nSample of auto task open analysis:');
        console.table(analysisRecords);
      })
      .on('error', (error) => {
        console.error('Error writing analysis CSV:', error);
      });

  } catch (error) {
    console.error('Error generating auto task open analysis:', error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  // Generate both reports
  generateTaskPerformanceReport()
    .then(() => generateAutoTaskOpenAnalysis())
    .catch(console.error);
}

module.exports = {
  generateTaskPerformanceReport,
  testWithSampleData,
  generateAutoTaskOpenAnalysis
};
