const Job = require('../models/Job');
const User = require('../models/User');
const mongoose = require('mongoose');

class JobService {
  /**
   * Create a new job posting
   * @param {Object} jobData - Job data
   * @param {String} recruiterId - Recruiter ID
   * @returns {Promise<Object>} Created job
   */
  async createJob(recruiterId, jobData) {
    try {
      // Verify recruiter exists

      if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
        const error = new Error('invalid id');
        error.statusCode = 404;
        throw error;
      }
      const recruiter = await User.findOne({ _id: recruiterId, role: 'recruiter' });

      if (!recruiter) {
        const error = new Error('Recruiter not found');
        error.statusCode = 404;
        throw error;
      }

      // Create job
      const job = new Job({
        ...jobData,
        recruiterId,
        status: jobData.status || 'active'
      });

      await job.save();

      return job;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all active jobs with optional filters
   * @param {Object} filters - Optional filters for jobs
   * @returns {Promise<Array>} Array of jobs
   */
  async getActiveJobs(filters = {}) {
    try {
      return await Job.findActiveJobs(filters);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get job by ID
   * @param {String} jobId - Job ID
   * @returns {Promise<Object>} Job object
   */
  async getJobById(jobId, recruiterId) {
    try {
      const job = await Job.findById(jobId)
        .populate('recruiterId', 'name profileData.company')
        .select('-interviewQuestions');

      if (!job) {
        return {
          status: 'error',
          message: 'Job not found',
          data: null
        };
      }

      // Increment view count
      await job.incrementViewCount();

      return {
        status: 'success',
        message: 'Job retrieved successfully',
        data: job
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Internal server error',
        data: null
      };
    }
  }

  /**
   * Get jobs posted by a recruiter
   * @param {String} recruiterId - Recruiter ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of jobs
   */
  async getRecruiterJobs(recruiterId, filters = {}) {
    try {
      const query = { recruiterId };
      console.log(query)

      if (filters.status) {
        query.status = filters.status;
      }

      return await Job.find(query.recruiterId).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update job
   * @param {String} jobId - Job ID
   * @param {String} recruiterId - Recruiter ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated job
   */
  async updateJob(jobId, recruiterId, updateData) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if recruiter owns the job
      if (job.recruiterId.toString() !== recruiterId.toString()) {
        const error = new Error('Not authorized to update this job');
        error.statusCode = 403;
        throw error;
      }

      // Fields that can be updated
      const allowedUpdates = [
        'title',
        'description',
        'requirements',
        'location',
        'salary',
        'status',
        'interviewQuestions',
        'jobType',
        'experienceLevel',
        'department',
        'skills',
        'benefits',
        'applicationDeadline',
        'isUrgent',
        'tags',
        'company'
      ];

      // Update job with allowed fields
      allowedUpdates.forEach(field => {
        if (updateData[field] !== undefined) {
          job[field] = updateData[field];
        }
      });

      await job.save();

      return job;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete job
   * @param {String} jobId - Job ID
   * @param {String} recruiterId - Recruiter ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteJob(jobId, recruiterId) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if recruiter owns the job
      if (job.recruiterId.toString() !== recruiterId.toString()) {
        const error = new Error('Not authorized to delete this job');
        error.statusCode = 403;
        throw error;
      }

      // Instead of deleting, archive the job
      job.status = 'archived';
      await job.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search jobs by keyword
   * @param {String} keyword - Search keyword
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of jobs
   */
  async searchJobs(keyword, filters = {}) {
    try {
      filters.search = keyword;
      return await Job.findActiveJobs(filters);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate interview questions for a job
   * @param {String} jobId - Job ID
   * @param {Array} questions - Array of questions
   * @param {String} recruiterId - Recruiter ID
   * @returns {Promise<Object>} Updated job
   */
  async addInterviewQuestions(jobId, questions, recruiterId) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if recruiter owns the job
      if (job.recruiterId.toString() !== recruiterId.toString()) {
        const error = new Error('Not authorized to update this job');
        error.statusCode = 403;
        throw error;
      }

      // Validate questions
      if (!Array.isArray(questions) || questions.length === 0) {
        const error = new Error('Questions must be a non-empty array');
        error.statusCode = 400;
        throw error;
      }

      // Format questions
      const formattedQuestions = questions.map(q => {
        return typeof q === 'string'
          ? { question: q, category: 'general' }
          : q;
      });

      job.interviewQuestions = formattedQuestions;
      await job.save();

      return job;
    } catch (error) {
      throw error;
    }
  }

  async getAllJobs(filters, options) {
    try {
      const res = await Job.find(filters)
        .select("-interviewQuestions")
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1 });
      console.log(res);
      return {
        jobs: res,
        currentPage: options.page,
        totalPages: Math.ceil(await Job.countDocuments(filters) / options.limit),
        totalJobs: await Job.countDocuments(filters)
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new JobService();