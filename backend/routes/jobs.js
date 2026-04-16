const express = require('express');
const router = express.Router();
const JobService = require('../services/jobService');
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { jobValidations, queryValidations, sanitizeInput } = require('../middleware/validation');
const interviewQuestionGen = require ('../services/interviewQuestionGen');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Get all jobs (public endpoint with optional auth for personalization)
router.get('/', optionalAuth, queryValidations.pagination, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      type,
      experienceLevel,
      company,
      skills,
      salaryMin,
      salaryMax,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      ...(search && { search }),
      ...(location && { location }),
      ...(type && { type }),
      ...(experienceLevel && { experienceLevel }),
      ...(company && { company }),
      ...(skills && { skills: skills.split(',') }),
      ...(salaryMin && { salaryMin: parseInt(salaryMin) }),
      ...(salaryMax && { salaryMax: parseInt(salaryMax) })
    };

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Max 50 items per page
      sortBy,
      sortOrder,
      userId: req.user?._id // For personalized results
    };

    const result = await JobService.getAllJobs(filters, options);

    res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalJobs: result.totalJobs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get jobs posted by current recruiter - FIXED: Moved to avoid route conflicts
router.get('/recruiter/my-jobs', auth, authorize('recruiter'), queryValidations.pagination, async (req, res, next) => {
  try {

    console.log('Fetching jobs for recruiter ID:', req.userId);
    const { page = 1, limit = 10, status } = req.query;

    // const filters = {
    //   recruiterId: req.userId,
    //   ...(status && { status })
    // };

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await JobService.getRecruiterJobs(req.userId, {
  status,
  ...options
});
    console.log(result)
    res.status(200).json({
      success: true,
      jobs: result,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalJobs: result.totalJobs
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get job by ID (public endpoint)
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const job = await JobService.getJobById(req.params.id, req.user?._id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
});

// Create new job (recruiter only) - FIXED: Use req.userId instead of req.body.recruiterId
router.post('/', auth, authorize('recruiter'), jobValidations.create, async (req, res, next) => {
  try {

    const interviewQuestions= await interviewQuestionGen.generateQuestions(req.body);
    const jobData = {
      ...req.body,
      postedBy: req.userId,
      recruiterId: req.userId,
      interviewQuestions: interviewQuestions 
    };
    const job = await JobService.createJob(req.userId, jobData);

    console.log('Creating job with data:', jobData);
    console.log('Generated interview questions:', interviewQuestions);
    // Use req.userId as the recruiter ID instead of expecting it from request body

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
});

// Update job (recruiter only, own jobs)
router.put('/:id', auth, authorize('recruiter'), jobValidations.update, async (req, res, next) => {
  try {
    const job = await JobService.updateJob(
      req.params.id,
      req.userId,
      req.body
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update this job'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
});

// Delete job (recruiter only, own jobs)
router.delete('/:id', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const deleted = await JobService.deleteJob(req.params.id, req.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to delete this job'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Search jobs - MOVED BEFORE PARAMETERIZED ROUTES TO AVOID CONFLICTS
router.get('/search', optionalAuth, queryValidations.search, async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
      userId: req.user?._id
    };

    const result = await JobService.searchJobs(query, options);

    res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalJobs: result.totalJobs
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get jobs by company
router.get('/company/:companyId', optionalAuth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { companyId } = req.params;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
      userId: req.user?._id
    };

    const result = await JobService.getJobsByCompany(companyId, options);

    res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalJobs: result.totalJobs
      }
    });
  } catch (error) {
    next(error);
  }
});



// Toggle job status (active/inactive)
router.patch('/:id/status', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or closed'
      });
    }

    const job = await JobService.updateJobStatus(req.params.id, status, req.userId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update this job'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job status updated successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
});

// Get job analytics (recruiter only, own jobs)
router.get('/:id/analytics', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const analytics = await JobService.getJobAnalytics(req.params.id, req.userId);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to view analytics'
      });
    }

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;