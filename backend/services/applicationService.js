const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const NotificationService = require('./notificationService');
const { deleteFile } = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

class ApplicationService {
  /**
   * Submit a job application
   */
  async submitApplication(applicationData) {
    try {
      const job = await Job.findById(applicationData.jobId);

      if (!job) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
      }

      if (job.checkIsActive && !job.checkIsActive()) {
        const error = new Error('Job is not active');
        error.statusCode = 400;
        throw error;
      }

      const candidate = await User.findOne({
        _id: applicationData.candidateId,
        role: 'candidate'
      });

      if (!candidate) {
        const error = new Error('Candidate not found');
        error.statusCode = 404;
        throw error;
      }

      const existingApplication = await Application.findOne({
        jobId: applicationData.jobId,
        candidateId: applicationData.candidateId
      });

      if (existingApplication) {
        const error = new Error('You have already applied for this job');
        error.statusCode = 409;
        throw error;
      }

      console.log(applicationData);

      // resume is already { filename, url, uploadedAt } from the route
      const application = new Application({
        jobId: applicationData.jobId,
        candidateId: applicationData.candidateId,
        coverLetter: applicationData.coverLetter,
        resume: applicationData.resume,
        applicationData: applicationData.applicationData || {},
        source: applicationData.source || 'direct'
      });

      await application.save();

      if (job.incrementApplicationCount) {
        await job.incrementApplicationCount();
      }

      try {
        await NotificationService.sendApplicationConfirmation(
          candidate.email,
          job.title
        );
      } catch (emailError) {
        console.error('Failed to send application confirmation:', emailError);
      }

      return application;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId, userId, userRole) {
    try {
      const application = await Application.findById(applicationId)
        .populate('jobId', 'title company location status recruiterId')
        .populate('candidateId', 'name email profileData');

      if (!application) {
        return null;
      }

      if (userRole === 'candidate' && application.candidateId._id.toString() !== userId) {
        return null;
      }

      if (userRole === 'recruiter' && application.jobId.recruiterId.toString() !== userId) {
        return null;
      }

      return application;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all applications with filters and pagination
   */
  async getAllApplications(filters, options) {
    try {
      const query = { ...filters };

      if (query.recruiterId) {
        const jobs = await Job.find({ recruiterId: query.recruiterId }).select('_id');
        query.jobId = { $in: jobs.map(job => job._id) };
        delete query.recruiterId;
      }

      const applications = await Application.find(query)
        .populate('jobId', 'title experienceLevel company.name location applicationDeadline status')
        .populate('candidateId', 'name email profileData')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      const totalApplications = await this.countDocuments(query);

      return {
        applications,
        currentPage: options.page,
        totalPages: Math.ceil(totalApplications / options.limit),
        totalApplications,
        hasNextPage: options.page < Math.ceil(totalApplications / options.limit),
        hasPrevPage: options.page > 1
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update application
   */
  async updateApplication(applicationId, updateData, userId) {
    try {
      const application = await Application.findById(applicationId);

      if (!application) {
        return null;
      }

      if (application.candidateId.toString() !== userId) {
        return null;
      }

      if (application.status !== 'pending') {
        return null;
      }

      // Delete old Cloudinary resume if a new one is being set
      if (updateData.resume && application.resume?.filename && application.resume.filename !== 'resume') {
        try {
          await deleteFile(application.resume.filename, 'raw');
        } catch (e) {
          console.error('Failed to delete old resume from Cloudinary:', e);
        }
      }

      Object.assign(application, updateData);
      await application.save();

      return application;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete application
   */
  async deleteApplication(applicationId, userId) {
    try {
      const application = await Application.findById(applicationId);

      if (!application) {
        return false;
      }

      if (application.candidateId.toString() !== userId) {
        return false;
      }

      if (application.status !== 'pending') {
        return false;
      }

      // Delete resume from Cloudinary before removing the DB record
      if (application.resume?.filename && application.resume.filename !== 'resume') {
        try {
          await deleteFile(application.resume.filename, 'raw');
        } catch (e) {
          console.error('Failed to delete resume from Cloudinary:', e);
        }
      }

      await Application.findByIdAndDelete(applicationId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get applications by job (recruiters only)
   */
  async getApplicationsByJob(filters, options, userId) {
    try {
      const job = await Job.findOne({ _id: filters.jobId, recruiterId: userId });

      if (!job) {
        throw new Error('Job not found or you do not have permission');
      }

      const applications = await Application.find(filters)
        .populate('candidateId', 'name email profileData')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      const totalApplications = await Application.countDocuments(filters);

      return {
        applications,
        currentPage: options.page,
        totalPages: Math.ceil(totalApplications / options.limit),
        totalApplications
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get applications by user
   */
  async getApplicationsByUser(filters, options, userId, userRole) {
    try {
      const query = { ...filters };

      if (userRole === 'recruiter') {
        const jobs = await Job.find({ recruiterId: userId }).select('_id');
        query.jobId = { $in: jobs.map(job => job._id) };
      }

      const applications = await Application.find(query)
        .populate('jobId', 'title company location status')
        .populate('candidateId', 'name email')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      const totalApplications = await Application.countDocuments(query);

      return {
        applications,
        currentPage: options.page,
        totalPages: Math.ceil(totalApplications / options.limit),
        totalApplications
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update application status (recruiters only)
   */
  async updateApplicationStatus(applicationId, status, recruiterId, notes = '') {
    try {
      const application = await Application.findById(applicationId)
        .populate('jobId', 'recruiterId title');

      if (!application) {
        return null;
      }

      if (application.jobId.recruiterId.toString() !== recruiterId.toString()) {
        return null;
      }

      if (application.updateStatus) {
        application.updateStatus(status, recruiterId, notes);
      } else {
        application.status = status;
      }

      await application.save();

      const candidate = await User.findById(application.candidateId);

      try {
        if (status === 'interview-scheduled') {
          await NotificationService.sendInterviewInvitation(
            candidate.email,
            application.jobId.title
          );
        } else if (status === 'hired') {
          await NotificationService.sendHiredNotification(
            candidate.email,
            application.jobId.title
          );
        } else if (status === 'rejected') {
          await NotificationService.sendRejectionNotification(
            candidate.email,
            application.jobId.title
          );
        }
      } catch (emailError) {
        console.error('Failed to send status notification:', emailError);
      }

      return application;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update application statuses
   */
  async bulkUpdateStatus(applicationIds, status, recruiterId, notes = '') {
    try {
      const applications = await Application.find({
        _id: { $in: applicationIds }
      }).populate('jobId', 'recruiterId');

      const authorizedIds = applications
        .filter(app => app.jobId.recruiterId.toString() === recruiterId.toString())
        .map(app => app._id);

      if (authorizedIds.length === 0) {
        return { modifiedCount: 0 };
      }

      const result = await Application.updateMany(
        { _id: { $in: authorizedIds } },
        {
          status,
          $push: {
            statusHistory: {
              status,
              changedBy: recruiterId,
              changedAt: new Date(),
              notes
            }
          }
        }
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Count total applications
   */
  async countDocuments(filters) {
    try {
      return await Application.countDocuments(filters);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get applications by candidate ID
   */
  async getApplicationsByCandidate(candidateId) {
    try {
      const applications = await Application.find({ candidateId })
        .populate('jobId', 'title company location status')
        .sort({ createdAt: -1 });

      return applications;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate magic link for interview
   */
  async generateMagicLink(applicationId, recruiterId) {
    try {
      const application = await Application.findById(applicationId)
        .populate('jobId', 'recruiterId title interviewQuestions')
        .populate('candidateId', 'name email');

      if (!application) {
        return null;
      }

      if (application.jobId.recruiterId.toString() !== recruiterId.toString()) {
        return null;
      }

      const token = jwt.sign(
        {
          applicationId,
          candidateId: application.candidateId._id,
          jobId: application.jobId._id,
          type: 'magic_interview_link'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '24h',
          issuer: process.env.JWT_ISSUER || 'ai-recruiter-platform'
        }
      );

      application.interviewLink = {
        token,
        generatedBy: recruiterId,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isUsed: false
      };

      if (application.status !== 'interview_scheduled') {
        application.status = 'interview_scheduled';
      }

      await application.save();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const magicLinkUrl = `${frontendUrl}/interview/magic/${token}`;

      try {
        await NotificationService.sendInterviewInvitation(
          application.candidateId.email,
          application.jobId.title,
          magicLinkUrl,
          application.interviewLink.expiresAt
        );
      } catch (emailError) {
        console.error('Failed to send magic link email:', emailError);
      }

      return {
        token,
        magicLinkUrl,
        expiresAt: application.interviewLink.expiresAt
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate a magic link token
   */
  async validateMagicLink(token) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== 'magic_interview_link') {
        throw new Error('Invalid token type');
      }

      const application = await Application.findById(decoded.applicationId)
        .populate('jobId', 'title description requirements company location interviewDuration recruiterId')
        .populate('candidateId', 'name email');

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.interviewLink && application.interviewLink.token !== token) {
        throw new Error('Token mismatch');
      }

      if (application.interviewLink && application.interviewLink.expiresAt < new Date()) {
        throw new Error('Token has expired');
      }

      const Interview = require('../models/Interview');
      const interview = await Interview.findOne({ applicationId: application._id });

      if (!interview) {
        throw new Error('Interview record not found for this application');
      }

      const questions = (interview.questions || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(q => ({
          _id: q.id,
          question: q.question,
          type: q.type,
          expectedDuration: q.expectedDuration,
          order: q.order,
        }));

      return {
        application,
        job: application.jobId,
        candidate: application.candidateId,
        interviewId: interview._id.toString(),
        candidateName: application.candidateId.name,
        questions,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark a magic link as used
   */
  async useMagicLink(token) {
    try {
      const application = await Application.findOne({
        'interviewLink.token': token
      });

      if (!application) {
        return false;
      }

      application.interviewLink.isUsed = true;
      await application.save();
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get application statistics by recruiter
   */
  async getRecruiterStats(recruiterId) {
    try {
      const jobs = await Job.find({ recruiterId });

      if (jobs.length === 0) {
        return {
          totalApplications: 0,
          pendingApplications: 0,
          interviewedApplications: 0,
          hiredApplications: 0,
          jobStats: []
        };
      }

      const jobIds = jobs.map(job => job._id);

      const applications = await Application.find({
        jobId: { $in: jobIds }
      });

      const totalApplications = applications.length;
      const pendingApplications = applications.filter(app => app.status === 'pending').length;
      const interviewedApplications = applications.filter(app => app.status === 'interviewed').length;
      const hiredApplications = applications.filter(app => app.status === 'hired').length;

      const jobStats = jobs.map(job => {
        const jobApps = applications.filter(app => app.jobId.toString() === job._id.toString());

        return {
          jobId: job._id,
          jobTitle: job.title,
          totalApplications: jobApps.length,
          pendingApplications: jobApps.filter(app => app.status === 'pending').length,
          interviewedApplications: jobApps.filter(app => app.status === 'interviewed').length,
          hiredApplications: jobApps.filter(app => app.status === 'hired').length
        };
      });

      return {
        totalApplications,
        pendingApplications,
        interviewedApplications,
        hiredApplications,
        jobStats
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ApplicationService();