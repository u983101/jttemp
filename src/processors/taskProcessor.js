const { calculateTimeDifferenceMinutes } = require('../utils/dateUtils');

/**
 * Build in-memory indexes for fast task lookups
 */
class TaskProcessor {
  constructor() {
    this.taskActionIndex = new Map(); // taskId -> array of actions
    this.taskHistoryIndex = new Map(); // taskId -> array of history entries
    this.userIndex = new Map(); // email -> displayName
    this.autoAssignmentIndex = new Map(); // taskId -> auto assignment info
    this.openTimeIndex = new Map(); // taskId -> open time (from assigntome)
    this.screenOpenIndex = new Map(); // email -> array of screen open times
  }

  /**
   * Build task action index from useravailability data
   * @param {Array} taskActions - Array of task action objects
   */
  buildTaskActionIndex(taskActions) {
    for (const action of taskActions) {
      if (action.taskId) {
        if (!this.taskActionIndex.has(action.taskId)) {
          this.taskActionIndex.set(action.taskId, []);
        }
        this.taskActionIndex.get(action.taskId).push(action);
      }
    }
  }

  /**
   * Build task history index from taskhistories data
   * @param {Array} taskHistories - Array of task history objects
   */
  buildTaskHistoryIndex(taskHistories) {
    for (const history of taskHistories) {
      if (history.taskId) {
        if (!this.taskHistoryIndex.has(history.taskId)) {
          this.taskHistoryIndex.set(history.taskId, []);
        }
        this.taskHistoryIndex.get(history.taskId).push(history);
      }
    }
  }

  /**
   * Build user index from users data
   * @param {Array} users - Array of user objects
   */
  buildUserIndex(users) {
    for (const user of users) {
      this.userIndex.set(user.userPrincipalName, user.displayName);
    }
  }

  /**
   * Build auto assignment index from gcp data
   * @param {Array} autoAssignments - Array of auto assignment objects
   */
  buildAutoAssignmentIndex(autoAssignments) {
    for (const assignment of autoAssignments) {
      if (assignment.taskId) {
        this.autoAssignmentIndex.set(assignment.taskId, assignment);
      }
    }
  }

  /**
   * Build open time index from assigntome data
   * @param {Array} assignToMeData - Array of assign to me objects
   */
  buildOpenTimeIndex(assignToMeData) {
    for (const assignment of assignToMeData) {
      if (assignment.tasknum) {
        this.openTimeIndex.set(assignment.tasknum, assignment.timestamp);
      }
    }
  }

  /**
   * Build screen open index from openCambridgeTime data
   * @param {Array} screenOpenData - Array of screen open objects
   */
  buildScreenOpenIndex(screenOpenData) {
    for (const openEvent of screenOpenData) {
      if (openEvent.email) {
        if (!this.screenOpenIndex.has(openEvent.email)) {
          this.screenOpenIndex.set(openEvent.email, []);
        }
        this.screenOpenIndex.get(openEvent.email).push(openEvent.timestamp);
      }
    }
  }

  /**
   * Get first screen open time for a user
   * @param {string} email - User email
   * @returns {Date|null} First screen open time or null if not found
   */
  getFirstScreenOpenTime(email) {
    const openTimes = this.screenOpenIndex.get(email);
    if (!openTimes || openTimes.length === 0) {
      return null;
    }
    // Return the earliest open time
    return openTimes.reduce((earliest, current) => 
      current < earliest ? current : earliest
    );
  }

  /**
   * Get all screen open times for a user
   * @param {string} email - User email
   * @returns {Array<Date>} Array of screen open times
   */
  getScreenOpenTimes(email) {
    return this.screenOpenIndex.get(email) || [];
  }

  /**
   * Get open time for a task from assigntome data
   * @param {string} taskId - Task ID
   * @returns {Date|null} Open time or null if not found
   */
  getOpenTime(taskId) {
    return this.openTimeIndex.get(taskId) || null;
  }

  /**
   * Calculate productive time for a task using assignedTime and makerCompleteTime
   * @param {string} taskId - Task ID
   * @returns {number|null} Productive time in minutes or null if not calculable
   */
  calculateProductiveTime(taskId) {
    // Get the record to access assignedTime and makerCompleteTime
    const record = this.findRecordByTaskId(taskId);
    if (!record) return null;

    // Parse the time strings back to Date objects
    const assignedTime = record.assignedTime ? new Date(record.assignedTime) : null;
    const makerCompleteTime = record.makerCompleteTime ? new Date(record.makerCompleteTime) : null;

    if (!assignedTime || !makerCompleteTime) {
      return null;
    }

    return calculateTimeDifferenceMinutes(assignedTime, makerCompleteTime);
  }

  /**
   * Find a record by task ID from the current report data
   * @param {string} taskId - Task ID to find
   * @returns {Object|null} The record or null if not found
   */
  findRecordByTaskId(taskId) {
    // Since we're in the middle of generating the report, we need to find the record
    // This is a helper method to access the partially built report data
    for (const record of this.currentReportRecords || []) {
      if (record.task === taskId) {
        return record;
      }
    }
    return null;
  }

  /**
   * Calculate waiting time for a task (time between creation and assignment)
   * @param {string} taskId - Task ID
   * @returns {number|null} Waiting time in minutes or null if not calculable
   */
  calculateWaitingTime(taskId) {
    const createdTime = this.getCreatedTime(taskId);
    const assignedTime = this.getAssignedTime(taskId);

    if (!createdTime || !assignedTime) {
      return null;
    }

    return calculateTimeDifferenceMinutes(createdTime, assignedTime);
  }

  /**
   * Get created time for a task
   * @param {string} taskId - Task ID
   * @returns {Date|null} Created time or null if not found
   */
  getCreatedTime(taskId) {
    const histories = this.taskHistoryIndex.get(taskId);
    if (!histories) return null;

    // Find task creation (PMA with action IN)
    const taskCreation = histories.find(h => 
      h.mcStatus === 'PMA' && h.action === 'IN'
    );

    return taskCreation?.actionTimestamp || null;
  }

  /**
   * Get assigned time for a task based on mode
   * @param {string} taskId - Task ID
   * @returns {Date|null} Assigned time or null if not found
   */
  getAssignedTime(taskId) {
    const mode = this.determineMode(taskId);
    
    if (mode === 'Auto') {
      return this.getAutoAssignedTime(taskId);
    } else {
      return this.getManualAssignedTime(taskId);
    }
    
    return null;
  }

  /**
   * Get manual assigned time from task history
   * @param {string} taskId - Task ID
   * @returns {Date|null} Manual assigned time or null if not found
   */
  getManualAssignedTime(taskId) {
    const histories = this.taskHistoryIndex.get(taskId);
    if (!histories) return null;

    // Find task assignment (PME with action AS)
    const taskAssignment = histories.find(h => 
      h.mcStatus === 'PME' && h.action === 'AS'
    );

    return taskAssignment?.actionTimestamp || null;
  }

  /**
   * Get auto assigned time from gcp data
   * @param {string} taskId - Task ID
   * @returns {Date|null} Auto assigned time or null if not found
   */
  getAutoAssignedTime(taskId) {
    const autoAssignment = this.autoAssignmentIndex.get(taskId);
    return autoAssignment?.timestamp || null;
  }

  /**
   * Get maker complete time for a task
   * @param {string} taskId - Task ID
   * @returns {Date|null} Maker complete time or null if not found
   */
  getMakerCompleteTime(taskId) {
    const histories = this.taskHistoryIndex.get(taskId);
    if (!histories) return null;

    // Find maker complete (PCA status with AS action)
    const makerComplete = histories.find(h => 
      h.mcStatus === 'PCA' && h.action === 'SC'
    );

    return makerComplete?.actionTimestamp || null;
  }

  /**
   * Determine mode for a task
   * @param {string} taskId - Task ID
   * @returns {'Unknown' | 'Manual' | 'Auto'} Mode of the task
   */
  determineMode(taskId) {
    if (this.autoAssignmentIndex.has(taskId)) {
      return 'Auto';
    }
    
    if (this.taskActionIndex.has(taskId)) {
      return 'Manual';
    }
    
    return 'Unknown';
  }

  /**
   * Get user display name from email
   * @param {string} email - User email
   * @returns {string} Display name with email in parentheses or email if not found
   */
  getUserDisplayName(email) {
    const displayName = this.userIndex.get(email);
    return displayName ? `${displayName} (${email})` : email;
  }

  /**
   * Generate report records for all tasks
   * @returns {Array} Array of report records
   */
  generateReport() {
    const reportRecords = [];
    const allTaskIds = new Set();
    // Store reference to current report records for helper methods
    this.currentReportRecords = reportRecords;

    // Collect all unique task IDs from all sources
    for (const taskId of this.taskActionIndex.keys()) {
      allTaskIds.add(taskId);
    }
    for (const taskId of this.taskHistoryIndex.keys()) {
      allTaskIds.add(taskId);
    }
    for (const taskId of this.autoAssignmentIndex.keys()) {
      allTaskIds.add(taskId);
    }

    // Process each task - first pass: collect basic info and time fields
    for (const taskId of allTaskIds) {
      const mode = this.determineMode(taskId);
      const createdTime = this.getCreatedTime(taskId);
      const assignedTime = this.getAssignedTime(taskId);
      const makerCompleteTime = this.getMakerCompleteTime(taskId);
      const openTime = this.getOpenTime(taskId);

      // Get user information - try to find from task actions first, then from auto assignments
      let user = 'Unknown';
      const actions = this.taskActionIndex.get(taskId);
      if (actions && actions.length > 0) {
        user = this.getUserDisplayName(actions[0].loginEmail);
      } else {
        // Check if this is an auto-assigned task and get user from assignment
        const autoAssignment = this.autoAssignmentIndex.get(taskId);
        if (autoAssignment && autoAssignment.email) {
          user = this.getUserDisplayName(autoAssignment.email);
        }
      }

      // Split user into name and email components
      let userName = 'Unknown';
      let userEmail = 'Unknown';
      
      if (user !== 'Unknown') {
        const match = user.match(/^(.*?) \((.*?)\)$/);
        if (match) {
          userName = match[1];
          userEmail = match[2];
        } else {
          // If format doesn't match, assume the whole string is email
          userName = user;
          userEmail = user;
        }
      }

      reportRecords.push({
        task: taskId,
        userName,
        userEmail,
        mode,
        createdTime: createdTime ? createdTime.toISOString() : '',
        assignedTime: assignedTime ? assignedTime.toISOString() : '',
        makerCompleteTime: makerCompleteTime ? makerCompleteTime.toISOString() : '',
        openTime: openTime ? openTime.toISOString() : ''
      });
    }

    // Second pass: calculate productiveTime and waitingTime after all time fields are available
    for (const record of reportRecords) {
      record.productiveTime = this.calculateProductiveTime(record.task);
      record.waitingTime = this.calculateWaitingTime(record.task);
    }

    return reportRecords;
  }

  /**
   * Generate auto task open analysis report
   * @returns {Array} Array of auto task analysis records
   */
  generateAutoTaskOpenAnalysis() {
    const analysisRecords = [];
    
    // Process all auto-assigned tasks
    for (const [taskId, autoAssignment] of this.autoAssignmentIndex) {
      const assignedTime = autoAssignment.timestamp;
      const userEmail = autoAssignment.email;
      const firstScreenOpenTime = this.getFirstScreenOpenTime(userEmail);
      
      let timeToOpenMinutes = null;
      if (assignedTime && firstScreenOpenTime && firstScreenOpenTime > assignedTime) {
        timeToOpenMinutes = calculateTimeDifferenceMinutes(assignedTime, firstScreenOpenTime);
      }

      const screenOpenCount = this.getScreenOpenTimes(userEmail).length;
      
      analysisRecords.push({
        taskId,
        userEmail,
        userName: this.getUserDisplayName(userEmail),
        assignedTime: assignedTime ? assignedTime.toISOString() : '',
        firstScreenOpenTime: firstScreenOpenTime ? firstScreenOpenTime.toISOString() : '',
        timeToOpenMinutes,
        screenOpenCount,
        assignmentDate: assignedTime ? assignedTime.toISOString().split('T')[0] : ''
      });
    }

    return analysisRecords;
  }
}

module.exports = TaskProcessor;
