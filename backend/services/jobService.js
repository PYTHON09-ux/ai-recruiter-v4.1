const Job = require('../models/Job');
const User = require('../models/User');
const mongoose = require('mongoose');

class JobService {
  /**
   * Create a new job posting
   */
  async createJob(recruiterId, jobData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
        const error = new Error('Invalid recruiter ID');
        error.statusCode = 400;
        throw error;
      }

      const recruiter = await User.findOne({ _id: recruiterId, role: 'recruiter' });
      if (!recruiter) {
        const error = new Error('Recruiter not found');
        error.statusCode = 404;
        throw error;
      }

      const job = new Job({
        ...jobData,
        recruiterId,
        status: jobData.status || 'active',
      });

      await job.save();
      return job;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all active jobs with optional filters
   */
  async getActiveJobs(filters = {}) {
    try {
      return await Job.findActiveJobs(filters);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get job by ID.
   * When fetchForEdit = true, interviewQuestions are included (needed by the edit form).
   * Default keeps them excluded for the public detail view.
   */
  async getJobById(jobId, { fetchForEdit = false } = {}) {
    try {
      let query = Job.findById(jobId)
        .populate('recruiterId', 'name profileData.company');

      // Only strip interviewQuestions for the public view
      if (!fetchForEdit) {
        query = query.select('-interviewQuestions');
      }

      const job = await query;

      if (!job) {
        return { status: 'error', message: 'Job not found', data: null };
      }

      // Increment view count only on public views, not edit fetches
      if (!fetchForEdit) {
        await job.incrementViewCount();
      }

      return { status: 'success', message: 'Job retrieved successfully', data: job };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Internal server error',
        data: null,
      };
    }
  }

  /**
   * Get jobs posted by a recruiter
   * BUG FIX: was Job.find(query.recruiterId) — now correctly Job.find(query)
   */
  async getRecruiterJobs(recruiterId, filters = {}) {

  const id = typeof recruiterId === 'object'
    ? recruiterId.recruiterId
    : recruiterId;

  console.log('JobService.getRecruiterJobs called with recruiterId:', id, 'filters:', filters);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid recruiter ID');
    error.statusCode = 400;
    throw error;
  }

  const query = { recruiterId: id };

  if (filters.status) {
    query.status = filters.status;
  }

  return await Job.find(query)
    .select('-interviewQuestions')
    .sort({ createdAt: -1 });
}

  /**
   * Update job
   */
  async updateJob(jobId, recruiterId, updateData) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
      }
      console.log(`Comparing job recruiter ID ${job.recruiterId} with provided recruiter ID ${recruiterId}`);
      console.log(job.recruiterId.toString(), recruiterId.toString());
      if (job.recruiterId.toString() !== recruiterId.toString()) {
        const error = new Error('Not authorized to update this job');
        error.statusCode = 403;
        throw error;
      }

      const allowedUpdates = [
        'title',
        'description',
        'requirements',
        'location',
        'salary',
        'salaryRange',
        'status',
        'interviewQuestions',
        'interviewDuration',
        'jobType',
        'experienceLevel',
        'department',
        'skills',
        'benefits',
        'applicationDeadline',
        'isUrgent',
        'tags',
        'company',
      ];

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
   * Delete (archive) job
   */
  async deleteJob(jobId, recruiterId) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
      }

      if (job.recruiterId.toString() !== recruiterId.toString()) {
        const error = new Error('Not authorized to delete this job');
        error.statusCode = 403;
        throw error;
      }

      job.status = 'archived';
      await job.save();
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search jobs by keyword
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
   * Add / replace interview questions for a job
   */
  async addInterviewQuestions(jobId, questions, recruiterId) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
      }

      if (job.recruiterId.toString() !== recruiterId.toString()) {
        const error = new Error('Not authorized to update this job');
        error.statusCode = 403;
        throw error;
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        const error = new Error('Questions must be a non-empty array');
        error.statusCode = 400;
        throw error;
      }

      job.interviewQuestions = questions.map(q =>
        typeof q === 'string' ? { question: q, category: 'general' } : q
      );

      await job.save();
      return job;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all jobs (admin / paginated recruiter list)
   */
  async getAllJobs(filters, options) {
    try {
      const res = await Job.find(filters)
        .select('-interviewQuestions')
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1 });

      const total = await Job.countDocuments(filters);

      return {
        jobs:        res,
        currentPage: options.page,
        totalPages:  Math.ceil(total / options.limit),
        totalJobs:   total,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new JobService();