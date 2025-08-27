# Implementation Plan

[Overview]
Create a Node.js application to generate a task performance report by analyzing multiple CSV and JSON data sources to calculate Productive Time, Waiting Time, and Mode for each task.

This implementation will process millions of rows efficiently by using streaming parsers, building in-memory indexes for fast lookups, and handling complex business logic around task status changes and time calculations. The solution will integrate data from useravailability.csv (task actions), taskhistories.csv (status changes), gcp.json (auto-assignments), and users.csv (user mapping) to produce a comprehensive report with the required fields.

[Types]  
Define TypeScript interfaces for data structures including TaskAction, TaskHistory, AutoAssignment, User, and the final ReportRecord.

Detailed type definitions:
- TaskAction: { createdOn: Date, action: string, productiveTime: number | null, taskId: string | null, loginEmail: string, taskOpenTime: Date | null }
- TaskHistory: { taskH: string, taskId: string, workStatus: string, mcStatus: string, action: string, actionTimestamp: Date, lastModifiedByUser: string }
- AutoAssignment: { taskId: string, email: string, timestamp: Date }
- User: { id: string, userPrincipalName: string, displayName: string }
- ReportRecord: { task: string, user: string, productiveTime: number | null, waitingTime: number | null, mode: 'Unknown' | 'Manual' | 'Auto' }

[Files]
Create new JavaScript files for data processing, streaming parsing, and report generation with proper error handling.

Detailed breakdown:
- New files to be created:
  - src/index.js: Main entry point that orchestrates the data processing pipeline
  - src/parsers/csvParser.js: Streaming CSV parser with efficient memory usage for large files
  - src/parsers/jsonParser.js: JSON parser for gcp.json with textPayload extraction
  - src/processors/taskProcessor.js: Core logic for calculating Productive Time, Waiting Time, and Mode
  - src/utils/dateUtils.js: Date parsing and time difference calculation utilities
  - src/utils/logger.js: Logging utility for progress tracking and error reporting
  - package.json: Node.js project configuration with dependencies for csv-parser, moment, and other utilities

- Existing files to be modified: None (this is a new project structure)
- Configuration file updates: package.json will include dependencies for efficient large file processing

[Functions]
Implement functions for streaming data parsing, in-memory indexing, time calculations, and report generation.

Detailed breakdown:
- New functions:
  - parseCSVStream(filePath): Returns readable stream that emits parsed CSV rows
  - parseGCPJson(filePath): Returns array of AutoAssignment objects extracted from textPayload
  - buildTaskActionIndex(): Creates Map of taskId to TaskAction objects from useravailability
  - buildTaskHistoryIndex(): Creates Map of taskId to TaskHistory objects with status tracking
  - buildUserIndex(): Creates Map of email to displayName from users.csv
  - calculateProductiveTime(taskId): Calculates minutes between task opened and completed
  - calculateWaitingTime(taskId): Calculates minutes between task creation and assignment using taskhistories
  - determineMode(taskId): Returns 'Auto' if task exists in gcp.json, 'Manual' if not, 'Unknown' for edge cases
  - generateReport(): Main function that processes all data and outputs final CSV

- Modified functions: None (all new implementation)
- Removed functions: None

[Classes]
Create utility classes for efficient data processing and memory management.

Detailed breakdown:
- New classes:
  - StreamingCSVParser: Handles large CSV files with configurable chunk size and memory limits
  - TaskIndex: Manages in-memory indexes for fast task lookups across multiple data sources
  - TimeCalculator: Specialized class for date parsing and time difference calculations in UTC
  - ReportGenerator: Orchestrates the entire report generation process with progress tracking

- Modified classes: None
- Removed classes: None

[Dependencies]
Add Node.js packages for efficient CSV parsing, date manipulation, and memory management.

Details of new packages:
- csv-parser: For streaming CSV parsing of large files
- moment: For robust date parsing and time calculations in UTC
- jsonstream: For streaming JSON parsing if gcp.json becomes large
- memory-streams: For efficient in-memory data processing
- fast-csv: For writing the final report CSV efficiently

[Testing]
Implement comprehensive testing with sample data and edge case handling.

Test file requirements:
- test/integration.test.js: End-to-end tests with sample data matching the provided structure
- test/unit/parsers.test.js: Unit tests for CSV and JSON parsing functions
- test/unit/processors.test.js: Unit tests for time calculations and mode determination
- test/utils/testData.js: Test data generator for various scenarios
- Validation strategies: Verify calculations against known expected results from sample data

[Implementation Order]
Execute the implementation in a logical sequence starting with data parsing, then indexing, followed by calculations, and finally report generation.

Numbered steps:
1. Set up Node.js project structure with package.json and dependencies
2. Implement streaming CSV parser for useravailability.csv and taskhistories.csv
3. Implement JSON parser for gcp.json with textPayload extraction logic
4. Build in-memory indexes for fast task lookups across all data sources
5. Implement date parsing utilities with UTC timezone handling
6. Create Productive Time calculation logic using task action timestamps
7. Create Waiting Time calculation logic using task creation timestamps from taskhistories
8. Implement Mode determination logic based on gcp.json presence
9. Build report generation function that combines all calculations
10. Add error handling, logging, and memory management for large datasets
11. Create comprehensive test suite with sample data validation
12. Document the solution and create usage instructions

This plan provides a complete roadmap for implementing a robust, efficient solution that can handle millions of rows while accurately calculating the required metrics.
