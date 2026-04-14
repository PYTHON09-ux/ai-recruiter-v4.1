const express = require('express');
const router = express.Router();
const InterviewService = require('../services/interviewService');
const ApplicationService = require('../services/applicationService');
const { completeInterview, notifyCallStarted, submitResponse } = require('../services/interviewResultHandler');
const { auth, authorize } = require('../middleware/auth');
const { interviewValidations, queryValidations, sanitizeInput } = require('../middleware/validation');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// ─────────────────────────────────────────────────────────────────────────────
//  CRITICAL: ALL static-path and public routes MUST be declared before any
//  `/:id` wildcard route. Express matches routes top-to-bottom, so a route
//  like GET /:id would swallow GET /magic/:token, GET /application/:id, etc.
//  if declared first.
// ─────────────────────────────────────────────────────────────────────────────

// ── Public magic-link routes (no auth required) ───────────────────────────────

/**
 * GET /interview/magic/:token
 *
 * FIX: Was calling InterviewService.validateMagicLink which doesn't exist on
 * that service. Magic link tokens encode an applicationId and are validated by
 * ApplicationService.validateMagicLink, which also fetches the Interview record
 * and returns { job, candidate, interviewId, candidateName, questions }.
 */
router.get('/magic/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Magic link token is required'
      });
    }

    const validationResult = await ApplicationService.validateMagicLink(token);

    res.status(200).json({
      success: true,
      message: 'Magic link is valid',
      data: validationResult
    });
  } catch (error) {
    // Map known error messages to appropriate HTTP status codes
    if (error.message === 'Token has expired') {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message === 'Token mismatch' || error.message === 'Invalid token type') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (
      error.message === 'Application not found' ||
      error.message === 'Interview record not found for this application'
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
});

/**
 * POST /interview/start/:token
 * Start interview via magic link (public endpoint).
 */
router.post('/start/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Magic link token is required'
      });
    }

    // Mark the magic link as used and start the interview
    const [, interview] = await Promise.all([
      ApplicationService.useMagicLink(token),
      InterviewService.startInterviewByToken(token),
    ]);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Invalid magic link or interview cannot be started'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Interview started successfully via magic link',
      data: interview
    });
  } catch (error) {
    next(error);
  }
});

// ── Static collection-level routes (no :id wildcard) ─────────────────────────

// Get all interviews (with proper authorization)
router.get('/', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type, applicationId } = req.query;

    const filters = {
      ...(status && { status }),
      ...(type && { type }),
      ...(applicationId && { applicationId })
    };

    // Add user-specific filters based on role
    if (req.user.role === 'candidate') {
      filters.candidateId = req.userId;
    } else if (req.user.role === 'recruiter') {
      filters.recruiterId = req.userId;
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await InterviewService.getAllInterviews(filters, options);

    res.status(200).json({
      success: true,
      data: result.interviews,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalInterviews: result.totalInterviews,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create/Schedule interview (recruiters only)
router.post('/', auth, authorize('recruiter'), interviewValidations.create, async (req, res, next) => {
  try {
    const interview = await InterviewService.scheduleInterview(req.body, req.userId);

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: interview
    });
  } catch (error) {
    next(error);
  }
});

// ── FIX: /application/:applicationId MUST come before /:id ───────────────────
// Previously declared after GET /:id, meaning Express would match /:id first
// and treat the string "application" as the interview ID — dead code.

router.get('/application/:applicationId', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await InterviewService.getInterviewsByApplication(
      req.params.applicationId,
      options,
      req.userId,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: result.interviews,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalInterviews: result.totalInterviews
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── :id-scoped routes ─────────────────────────────────────────────────────────
// These all contain a fixed second segment (/status, /start, /end, etc.)
// and must come before the bare GET /:id and PUT /:id wildcards.

// Get interview status
router.get('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = await InterviewService.getInterviewStatus(id);

    if (!status) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.status(200).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// Start interview (auth required — for recruiter/candidate dashboard flow)
router.post('/:id/start', auth, async (req, res, next) => {
  try {
    const interview = await InterviewService.startInterview(req.params.id, req.userId, req.user.role);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found or access denied'
      });
    }

    res.status(200).json({ success: true, message: 'Interview started successfully', data: interview });
  } catch (error) {
    next(error);
  }
});

// End interview
router.post('/:id/end', auth, async (req, res, next) => {
  try {
    const { feedback, rating, notes } = req.body;

    const endData = {
      feedback,
      rating: rating ? parseInt(rating) : undefined,
      notes,
      endedBy: req.userId,
      endedByRole: req.user.role
    };

    const interview = await InterviewService.endInterview(req.params.id, endData, req.userId, req.user.role);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found or access denied'
      });
    }

    res.status(200).json({ success: true, message: 'Interview ended successfully', data: interview });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /:interviewId/call-started  (public — called by Vapi/vapiService)
 *
 * FIX: New route. Was missing entirely — vapiService.notifyCallStarted() had
 * no backend endpoint to hit, so every call-started event silently 404'd.
 * Handled by interviewResultHandler.notifyCallStarted.
 */
router.post('/:interviewId/call-started', notifyCallStarted);

/**
 * POST /:interviewId/complete  (public — called by vapiService.saveInterviewResult)
 *
 * FIX: The old POST /complete (no :id in path) made it impossible to look up
 * the interview record. Now correctly scoped to /:interviewId/complete and
 * handled by interviewResultHandler.completeInterview which calls
 * interview.complete() and persists the transcript as responses.
 */
router.post('/:interviewId/complete', completeInterview);

/**
 * POST /:interviewId/response  (public — per-question submission)
 *
 * FIX: Was POST /submit-response (no :id). Now scoped with interviewId.
 * Handled by interviewResultHandler.submitResponse.
 */
router.post('/:interviewId/response', submitResponse);

// Reschedule interview (recruiters only)
router.patch('/:id/reschedule', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { scheduledAt, reason } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'New scheduled date and time is required' });
    }

    if (new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Interview must be scheduled for a future date' });
    }

    const interview = await InterviewService.rescheduleInterview(
      req.params.id, scheduledAt, reason, req.userId
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or access denied' });
    }

    res.status(200).json({ success: true, message: 'Interview rescheduled successfully', data: interview });
  } catch (error) {
    next(error);
  }
});

// Cancel interview (recruiters only)
router.patch('/:id/cancel', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const interview = await InterviewService.cancelInterview(req.params.id, reason, req.userId);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or access denied' });
    }

    res.status(200).json({ success: true, message: 'Interview cancelled successfully', data: interview });
  } catch (error) {
    next(error);
  }
});

// Get interview feedback
router.get('/:id/feedback', auth, async (req, res, next) => {
  try {
    const feedback = await InterviewService.getInterviewFeedback(
      req.params.id, req.userId, req.user.role
    );

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Interview feedback not found or access denied' });
    }

    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
});

// Add interview feedback (recruiters only)
router.post('/:id/feedback', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { feedback, rating, recommendations, strengths, weaknesses } = req.body;

    if (!feedback) {
      return res.status(400).json({ success: false, message: 'Feedback is required' });
    }

    const feedbackData = {
      feedback,
      rating: rating ? parseInt(rating) : undefined,
      recommendations,
      strengths,
      weaknesses,
      providedBy: req.userId
    };

    const interview = await InterviewService.addInterviewFeedback(
      req.params.id, feedbackData, req.userId
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or access denied' });
    }

    res.status(200).json({ success: true, message: 'Feedback added successfully', data: interview });
  } catch (error) {
    next(error);
  }
});

// ── Bare /:id wildcard routes — MUST be last ──────────────────────────────────

// Get interview by ID
router.get('/:id', auth, async (req, res, next) => {
  try {
    const interview = await InterviewService.getInterviewById(
      req.params.id, req.userId, req.user.role
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or access denied' });
    }

    res.status(200).json({ success: true, data: interview });
  } catch (error) {
    next(error);
  }
});

// Update interview (recruiters only)
router.put('/:id', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const allowedUpdates = ['scheduledAt', 'type', 'duration', 'notes', 'meetingLink'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const interview = await InterviewService.updateInterview(req.params.id, updates, req.userId);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found or you do not have permission to update this interview'
      });
    }

    res.status(200).json({ success: true, message: 'Interview updated successfully', data: interview });
  } catch (error) {
    next(error);
  }
});

// Delete interview (recruiters only)
router.delete('/:id', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const deleted = await InterviewService.deleteInterview(req.params.id, req.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found or you do not have permission to delete this interview'
      });
    }

    res.status(200).json({ success: true, message: 'Interview deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;