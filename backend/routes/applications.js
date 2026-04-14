const express = require('express');
const router = express.Router();
const ApplicationService = require('../services/applicationService');
const { auth, authorize } = require('../middleware/auth');
const { requireCompleteProfile } = require('../middleware/profileCompletion');
const { applicationValidations, queryValidations, sanitizeInput } = require('../middleware/validation');
const { uploadResume } = require('../config/cloudinary');

// Upload resume — returns Cloudinary URL to frontend
router.post('/upload-resume', auth, authorize('candidate'),
  (req, res, next) => {
    uploadResume.single('resume')(req, res, (err) => {
      if (err) {
        console.error('Resume upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('Uploaded file:', req.file);

    // req.file.path = full Cloudinary URL e.g.
    // https://res.cloudinary.com/xxx/raw/upload/v.../ai-recruiter/resumes/resume_userId_timestamp.pdf
    res.status(200).json({
      success: true,
      data: {
        resumeUrl: req.file.path,          // ✅ full Cloudinary URL — save this directly
        originalName: req.file.originalname,
      }
    });
  }
);

// Get all applications (with proper authorization)
router.get('/', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, jobId } = req.query;

    const filters = {
      ...(status && { status }),
      ...(jobId && { jobId })
    };

    if (req.user.role === 'candidate') {
      filters.candidateId = req.user._id;
    } else if (req.user.role === 'recruiter') {
      filters.recruiterId = req.user._id;
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await ApplicationService.getAllApplications(filters, options);

    res.status(200).json({
      success: true,
      data: result.applications,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalApplications: result.totalApplications,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get application by ID
router.get('/:id', auth, async (req, res, next) => {
  try {
    const application = await ApplicationService.getApplicationById(req.params.id, req.userId, req.user.role);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
});

// Submit application — plain JSON with resumeUrl from prior upload
router.post('/',
  auth,
  authorize('candidate'),
  requireCompleteProfile,
  sanitizeInput,
  applicationValidations.create,
  async (req, res, next) => {
    try {
      const { jobId, coverLetter, resumeUrl, originalName, applicationData } = req.body;

      if (!resumeUrl) {
        return res.status(400).json({
          success: false,
          message: 'Resume is required. Please upload your resume first.'
        });
      }

      const appData = {
        jobId,
        candidateId: req.userId,
        coverLetter,
        applicationData: applicationData ? JSON.parse(applicationData) : {},
        // ✅ Store only the URL and original filename — simple and clean
        resume: {
          url: resumeUrl,
          filename: originalName || 'resume.pdf',
          uploadedAt: new Date()
        }
      };

      const application = await ApplicationService.submitApplication(appData);

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update application
router.put('/:id', auth, authorize('candidate'), sanitizeInput, async (req, res, next) => {
  try {
    const updateData = {
      coverLetter: req.body.coverLetter,
      applicationData: req.body.applicationData ? JSON.parse(req.body.applicationData) : undefined
    };

    if (req.body.resumeUrl) {
      updateData.resume = {
        url: req.body.resumeUrl,
        filename: req.body.originalName || 'resume.pdf',
        uploadedAt: new Date()
      };
    }

    const application = await ApplicationService.updateApplication(req.params.id, updateData, req.userId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found, access denied, or application cannot be modified'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: application
    });
  } catch (error) {
    next(error);
  }
});

// Delete application
router.delete('/:id', auth, authorize('candidate'), async (req, res, next) => {
  try {
    const deleted = await ApplicationService.deleteApplication(req.params.id, req.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Application not found, access denied, or application cannot be deleted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get applications by job (recruiters only)
router.get('/job/:jobId', auth, authorize('recruiter'), queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filters = {
      jobId: req.params.jobId,
      ...(status && { status })
    };

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await ApplicationService.getApplicationsByJob(filters, options, req.userId);

    res.status(200).json({
      success: true,
      data: result.applications,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalApplications: result.totalApplications
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get applications by user
router.get('/user/:userId', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    if (req.user.role === 'candidate' && req.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own applications'
      });
    }

    const filters = {
      candidateId: userId,
      ...(status && { status })
    };

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await ApplicationService.getApplicationsByUser(filters, options, req.userId, req.user.role);

    res.status(200).json({
      success: true,
      data: result.applications,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalApplications: result.totalApplications
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update application status (recruiters only)
router.patch('/:id/status', auth, authorize('recruiter'), applicationValidations.updateStatus, async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const application = await ApplicationService.updateApplicationStatus(
      req.params.id,
      status,
      req.userId,
      notes
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    next(error);
  }
});

// Generate magic interview link (recruiters only)
router.post('/:id/generate-link', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const magicLink = await ApplicationService.generateMagicLink(req.params.id, req.userId);

    if (!magicLink) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Magic link generated successfully',
      data: magicLink
    });
  } catch (error) {
    next(error);
  }
});

// Get application statistics (recruiters only)
router.get('/stats/overview', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const stats = await ApplicationService.getRecruiterStats(req.userId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Bulk update application statuses (recruiters only)
router.patch('/bulk/status', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { applicationIds, status, notes } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Application IDs array is required' });
    }

    if (!['pending', 'reviewing', 'shortlisted', 'interviewed', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await ApplicationService.bulkUpdateStatus(applicationIds, status, req.userId, notes);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} applications updated successfully`,
      data: {
        totalRequested: applicationIds.length,
        updated: result.modifiedCount,
        failed: applicationIds.length - result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;