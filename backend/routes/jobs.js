const express = require('express');
const router = express.Router();
const JobService = require('../services/jobService');
const JobLifecycleService = require('../services/jobLifecycleService'); // from previous session
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { jobValidations, queryValidations, sanitizeInput } = require('../middleware/validation');
const interviewQuestionGen = require('../services/interviewQuestionGen');

router.use(sanitizeInput);

// ─────────────────────────────────────────────────────────────────────────────
// GET /jobs  —  public list with filters
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', optionalAuth, queryValidations.pagination, async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10, search, location, type,
      experienceLevel, company, skills, salaryMin, salaryMax,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const filters = {
      ...(search         && { search }),
      ...(location       && { location }),
      ...(type           && { type }),
      ...(experienceLevel && { experienceLevel }),
      ...(company        && { company }),
      ...(skills         && { skills: skills.split(',') }),
      ...(salaryMin      && { salaryMin: parseInt(salaryMin) }),
      ...(salaryMax      && { salaryMax: parseInt(salaryMax) }),
    };

    const options = {
      page:      parseInt(page),
      limit:     Math.min(parseInt(limit), 50),
      sortBy,
      sortOrder,
      userId:    req.user?._id,
    };

    const result = await JobService.getAllJobs(filters, options);

    res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        currentPage: result.currentPage,
        totalPages:  result.totalPages,
        totalJobs:   result.totalJobs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /jobs/recruiter/my-jobs  —  jobs owned by logged-in recruiter
// MUST stay above /:id to avoid route conflict
//
// FIX: was returning { jobs: result } where result is a raw array.
//      Now returns a consistent { success, data: [...], pagination: {...} }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/recruiter/my-jobs', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { status } = req.query;

    const jobs = await JobService.getRecruiterJobs(req.userId, {
      ...(status && { status }),
    });

    // getRecruiterJobs returns a plain array (after the bug fix).
    // Wrap it in the standard envelope so the frontend always gets the same shape.
    res.status(200).json({
      success: true,
      data:    Array.isArray(jobs) ? jobs : [],
      pagination: {
        currentPage: 1,
        totalPages:  1,
        totalJobs:   Array.isArray(jobs) ? jobs.length : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /jobs/:id  —  single job (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const fetchForEdit = req.query.edit === 'true' && req.user?.role === 'recruiter';
    const result = await JobService.getJobById(req.params.id, { fetchForEdit });

    if (!result || result.status === 'error') {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /jobs  —  create job (recruiter only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, authorize('recruiter'), jobValidations.create, async (req, res, next) => {
  try {
    const interviewQuestions = await interviewQuestionGen.generateQuestions(req.body);
    const jobData = {
      ...req.body,
      postedBy:           req.userId,
      recruiterId:        req.userId,
      interviewQuestions,
    };
    const job = await JobService.createJob(req.userId, jobData);

    res.status(201).json({ success: true, message: 'Job created successfully', data: job });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /jobs/:id  —  update job (recruiter only, own jobs)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, authorize('recruiter'), jobValidations.update, async (req, res, next) => {
  try {
    const job = await JobService.updateJob(req.params.id, req.userId, req.body);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update this job',
      });
    }

    res.status(200).json({ success: true, message: 'Job updated successfully', data: job });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /jobs/:id  —  archive job (recruiter only, own jobs)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const deleted = await JobService.deleteJob(req.params.id, req.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to delete this job',
      });
    }

    res.status(200).json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /jobs/search  —  keyword search (must be before /:id)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/search', optionalAuth, queryValidations.search, async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const result = await JobService.searchJobs(query, {
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 50),
      userId: req.user?._id,
    });

    res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        currentPage: result.currentPage,
        totalPages:  result.totalPages,
        totalJobs:   result.totalJobs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /jobs/company/:companyId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/company/:companyId', optionalAuth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await JobService.getJobsByCompany(req.params.companyId, {
      page:   parseInt(page),
      limit:  Math.min(parseInt(limit), 50),
      userId: req.user?._id,
    });

    res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        currentPage: result.currentPage,
        totalPages:  result.totalPages,
        totalJobs:   result.totalJobs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /jobs/:id/status  —  legacy status toggle (kept for compatibility)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or closed',
      });
    }

    const job = await JobService.updateJobStatus(req.params.id, status, req.userId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update this job',
      });
    }

    res.status(200).json({ success: true, message: 'Job status updated successfully', data: job });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /jobs/:id/analytics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/analytics', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const analytics = await JobService.getJobAnalytics(req.params.id, req.userId);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to view analytics',
      });
    }

    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE ROUTES  —  POST /jobs/:id/<action>
// These call JobLifecycleService which uses job.transitionTo() under the hood.
// Actions: publish | pause | resume | close | archive
// ─────────────────────────────────────────────────────────────────────────────

// Shared wrapper — forwards structured statusCode errors properly
const lifecycle = (fn) => async (req, res, next) => {
  try {
    const job = await fn(req.params.id, req.userId, { reason: req.body?.reason || '' });
    res.status(200).json({ success: true, data: job });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

router.post('/:id/publish', auth, authorize('recruiter'),
  lifecycle((id, uid, opts) => JobLifecycleService.publishJob(id, uid, opts))
);

router.post('/:id/pause', auth, authorize('recruiter'),
  lifecycle((id, uid, opts) => JobLifecycleService.pauseJob(id, uid, opts))
);

router.post('/:id/resume', auth, authorize('recruiter'),
  lifecycle((id, uid, opts) => JobLifecycleService.resumeJob(id, uid, opts))
);

router.post('/:id/close', auth, authorize('recruiter'),
  lifecycle((id, uid, opts) => JobLifecycleService.closeJob(id, uid, opts))
);

router.post('/:id/archive', auth, authorize('recruiter'),
  lifecycle((id, uid, opts) => JobLifecycleService.archiveJob(id, uid, opts))
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /jobs/:id/status-history  —  audit trail (recruiter only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/status-history', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const history = await JobLifecycleService.getStatusHistory(req.params.id, req.userId);
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
});

module.exports = router;