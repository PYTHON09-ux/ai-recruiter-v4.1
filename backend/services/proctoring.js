const mongoose = require('mongoose');

// Proctoring log schema
const proctoringLogSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventType: {
    type: String,
    enum: [
      'session_start',
      'session_end',
      'tab_switch',
      'window_blur',
      'window_focus',
      'multiple_faces_detected',
      'no_face_detected',
      'face_detection_error',
      'microphone_access_denied',
      'camera_access_denied',
      'suspicious_activity',
      'network_disconnection',
      'page_reload',
      'fullscreen_exit'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    faceCount: Number,
    tabTitle: String,
    userAgent: String,
    screenResolution: String,
    timestamp: Date,
    questionIndex: Number,
    additionalData: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const ProctoringLog = mongoose.model('ProctoringLog', proctoringLogSchema);

class ProctoringService {
  /**
   * Log a proctoring event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created log entry
   */
  async logEvent(eventData) {
    try {
      const log = new ProctoringLog({
        interviewId: eventData.interviewId,
        candidateId: eventData.candidateId,
        eventType: eventData.eventType,
        severity: this.determineSeverity(eventData.eventType),
        description: eventData.description || this.getDefaultDescription(eventData.eventType),
        metadata: {
          ...eventData.metadata,
          timestamp: new Date(),
          userAgent: eventData.userAgent,
          screenResolution: eventData.screenResolution
        }
      });

      await log.save();
      
      // Check if this event should trigger an alert
      await this.checkForSuspiciousActivity(eventData.interviewId, eventData.candidateId);
      
      return log;
    } catch (error) {
      console.error('Error logging proctoring event:', error);
      throw error;
    }
  }

  /**
   * Get proctoring logs for an interview
   * @param {String} interviewId - Interview ID
   * @returns {Promise<Array>} Array of logs
   */
  async getInterviewLogs(interviewId) {
    try {
      return await ProctoringLog.find({ interviewId })
        .sort({ timestamp: 1 })
        .populate('candidateId', 'name email');
    } catch (error) {
      console.error('Error fetching proctoring logs:', error);
      throw error;
    }
  }

  /**
   * Get proctoring summary for an interview
   * @param {String} interviewId - Interview ID
   * @returns {Promise<Object>} Proctoring summary
   */
  async getInterviewSummary(interviewId) {
    try {
      const logs = await ProctoringLog.find({ interviewId });
      
      const summary = {
        totalEvents: logs.length,
        suspiciousEvents: logs.filter(log => ['medium', 'high', 'critical'].includes(log.severity)).length,
        eventBreakdown: {},
        severityBreakdown: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        timeline: [],
        riskScore: 0
      };

      // Calculate event breakdown
      logs.forEach(log => {
        summary.eventBreakdown[log.eventType] = (summary.eventBreakdown[log.eventType] || 0) + 1;
        summary.severityBreakdown[log.severity]++;
      });

      // Create timeline of significant events
      summary.timeline = logs
        .filter(log => ['medium', 'high', 'critical'].includes(log.severity))
        .map(log => ({
          timestamp: log.timestamp,
          eventType: log.eventType,
          severity: log.severity,
          description: log.description
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Calculate risk score (0-100)
      summary.riskScore = this.calculateRiskScore(summary);

      return summary;
    } catch (error) {
      console.error('Error generating proctoring summary:', error);
      throw error;
    }
  }

  /**
   * Check for suspicious activity patterns
   * @param {String} interviewId - Interview ID
   * @param {String} candidateId - Candidate ID
   * @returns {Promise<void>}
   */
  async checkForSuspiciousActivity(interviewId, candidateId) {
    try {
      const recentLogs = await ProctoringLog.find({
        interviewId,
        candidateId,
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      }).sort({ timestamp: -1 });

      // Check for multiple tab switches in short time
      const tabSwitches = recentLogs.filter(log => log.eventType === 'tab_switch');
      if (tabSwitches.length >= 3) {
        await this.logEvent({
          interviewId,
          candidateId,
          eventType: 'suspicious_activity',
          description: `Multiple tab switches detected (${tabSwitches.length} in 5 minutes)`,
          metadata: {
            pattern: 'frequent_tab_switching',
            count: tabSwitches.length,
            timeWindow: '5_minutes'
          }
        });
      }

      // Check for multiple face detection issues
      const faceIssues = recentLogs.filter(log => 
        ['multiple_faces_detected', 'no_face_detected'].includes(log.eventType)
      );
      if (faceIssues.length >= 5) {
        await this.logEvent({
          interviewId,
          candidateId,
          eventType: 'suspicious_activity',
          description: `Multiple face detection issues (${faceIssues.length} in 5 minutes)`,
          metadata: {
            pattern: 'face_detection_issues',
            count: faceIssues.length,
            timeWindow: '5_minutes'
          }
        });
      }

      // Check for page reloads
      const pageReloads = recentLogs.filter(log => log.eventType === 'page_reload');
      if (pageReloads.length >= 2) {
        await this.logEvent({
          interviewId,
          candidateId,
          eventType: 'suspicious_activity',
          description: `Multiple page reloads detected (${pageReloads.length} in 5 minutes)`,
          metadata: {
            pattern: 'frequent_page_reloads',
            count: pageReloads.length,
            timeWindow: '5_minutes'
          }
        });
      }
    } catch (error) {
      console.error('Error checking for suspicious activity:', error);
    }
  }

  /**
   * Determine severity level for event type
   * @param {String} eventType - Event type
   * @returns {String} Severity level
   */
  determineSeverity(eventType) {
    const severityMap = {
      'session_start': 'low',
      'session_end': 'low',
      'tab_switch': 'high',
      'window_blur': 'medium',
      'window_focus': 'low',
      'multiple_faces_detected': 'high',
      'no_face_detected': 'medium',
      'face_detection_error': 'low',
      'microphone_access_denied': 'critical',
      'camera_access_denied': 'critical',
      'suspicious_activity': 'critical',
      'network_disconnection': 'medium',
      'page_reload': 'high',
      'fullscreen_exit': 'medium'
    };

    return severityMap[eventType] || 'low';
  }

  /**
   * Get default description for event type
   * @param {String} eventType - Event type
   * @returns {String} Default description
   */
  getDefaultDescription(eventType) {
    const descriptionMap = {
      'session_start': 'Interview session started',
      'session_end': 'Interview session ended',
      'tab_switch': 'Candidate switched to another tab',
      'window_blur': 'Interview window lost focus',
      'window_focus': 'Interview window regained focus',
      'multiple_faces_detected': 'Multiple faces detected in camera feed',
      'no_face_detected': 'No face detected in camera feed',
      'face_detection_error': 'Error in face detection system',
      'microphone_access_denied': 'Microphone access was denied',
      'camera_access_denied': 'Camera access was denied',
      'suspicious_activity': 'Suspicious activity pattern detected',
      'network_disconnection': 'Network connection was lost',
      'page_reload': 'Interview page was reloaded',
      'fullscreen_exit': 'Candidate exited fullscreen mode'
    };

    return descriptionMap[eventType] || 'Unknown proctoring event';
  }

  /**
   * Calculate risk score based on proctoring summary
   * @param {Object} summary - Proctoring summary
   * @returns {Number} Risk score (0-100)
   */
  calculateRiskScore(summary) {
    let score = 0;

    // Base score from severity breakdown
    score += (summary.severityBreakdown.medium || 0) * 5;
    score += (summary.severityBreakdown.high || 0) * 15;
    score += (summary.severityBreakdown.critical || 0) * 30;

    // Additional penalties for specific events
    const eventPenalties = {
      'tab_switch': 10,
      'multiple_faces_detected': 15,
      'suspicious_activity': 25,
      'page_reload': 10,
      'camera_access_denied': 20,
      'microphone_access_denied': 20
    };

    Object.entries(summary.eventBreakdown).forEach(([eventType, count]) => {
      if (eventPenalties[eventType]) {
        score += eventPenalties[eventType] * count;
      }
    });

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Get proctoring statistics for recruiter dashboard
   * @param {String} recruiterId - Recruiter ID
   * @returns {Promise<Object>} Proctoring statistics
   */
  async getRecruiterProctoringStats(recruiterId) {
    try {
      // This would require joining with interviews and applications
      // For now, return a basic structure
      return {
        totalInterviews: 0,
        interviewsWithIssues: 0,
        averageRiskScore: 0,
        commonIssues: [],
        recentAlerts: []
      };
    } catch (error) {
      console.error('Error fetching recruiter proctoring stats:', error);
      throw error;
    }
  }
}

module.exports = {
  ProctoringService: new ProctoringService(),
  ProctoringLog
};