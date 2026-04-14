const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { queryValidations, sanitizeInput } = require('../middleware/validation');
const JobService = require('../services/jobService');
const ApplicationService = require('../services/applicationService');
const InterviewService = require('../services/interviewService');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Get dashboard overview (both recruiters and candidates)
router.get('/overview', auth, async (req, res, next) => {
  try {
    let dashboardData = {};

    if (req.user.role === 'recruiter') {
      // Recruiter dashboard data
      dashboardData = {
        totalJobs: await JobService.getJobCountByRecruiter(req.userId),
        activeJobs: await JobService.getActiveJobCountByRecruiter(req.userId),
        totalApplications: await ApplicationService.getApplicationCountByRecruiter(req.userId),
        pendingApplications: await ApplicationService.getPendingApplicationCountByRecruiter(req.userId),
        scheduledInterviews: await InterviewService.getScheduledInterviewCountByRecruiter(req.userId),
        recentApplications: await ApplicationService.getRecentApplicationsByRecruiter(req.userId, 5)
      };
    } else if (req.user.role === 'candidate') {
      // Candidate dashboard data
      dashboardData = {
        totalApplications: await ApplicationService.getApplicationCountByCandidate(req.userId),
        pendingApplications: await ApplicationService.getPendingApplicationCountByCandidate(req.userId),
        scheduledInterviews: await InterviewService.getScheduledInterviewCountByCandidate(req.userId),
        recentApplications: await ApplicationService.getRecentApplicationsByCandidate(req.userId, 5),
        suggestedJobs: await JobService.getSuggestedJobsForCandidate(req.userId, 5)
      };
    }

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
});

// Get analytics data (recruiters only)
router.get('/analytics', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const analytics = {
      applicationTrends: await ApplicationService.getApplicationTrends(req.userId, timeframe),
      jobPerformance: await JobService.getJobPerformanceMetrics(req.userId, timeframe),
      interviewMetrics: await InterviewService.getInterviewMetrics(req.userId, timeframe),
      candidateSourceAnalysis: await ApplicationService.getCandidateSourceAnalysis(req.userId, timeframe)
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Get recent activities
router.get('/activities', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    let activities = [];

    if (req.user.role === 'recruiter') {
      activities = await getRecruiterActivities(req.userId, options);
    } else if (req.user.role === 'candidate') {
      activities = await getCandidateActivities(req.userId, options);
    }

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
});

// Get notifications
router.get('/notifications', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
      unreadOnly: unreadOnly === 'true'
    };

    // Mock notifications for now - replace with actual notification service
    const notifications = {
      notifications: [],
      totalNotifications: 0,
      unreadCount: 0,
      currentPage: parseInt(page),
      totalPages: 0
    };

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', auth, async (req, res, next) => {
  try {
    // Mock implementation - replace with actual notification service
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
async function getRecruiterActivities(recruiterId, options) {
  // Mock implementation - replace with actual activity tracking
  return {
    activities: [
      {
        id: '1',
        type: 'application_received',
        message: 'New application received for Software Engineer position',
        timestamp: new Date(),
        metadata: {}
      }
    ],
    totalActivities: 1,
    currentPage: options.page,
    totalPages: 1
  };
}

async function getCandidateActivities(candidateId, options) {
  // Mock implementation - replace with actual activity tracking
  return {
    activities: [
      {
        id: '1',
        type: 'application_submitted',
        message: 'Application submitted for Software Engineer position',
        timestamp: new Date(),
        metadata: {}
      }
    ],
    totalActivities: 1,
    currentPage: options.page,
    totalPages: 1
  };
}

module.exports = router;