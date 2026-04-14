import { jobsAPI } from './api';

const jobService = {
  // Get all jobs with filters
  getAllJobs: async (params = {}) => {
    try {
      const response = await jobsAPI.getAllJobs(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
  },

  // Get job by ID
  getJobById: async (id) => {
    try {
      const response = await jobsAPI.getJobById(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching job:', error);
      throw error;
    }
  },

  // Create new job (recruiter only)
  createJob: async (jobData) => {
    try {
      const response = await jobsAPI.createJob(jobData);
      return response.data;
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  },

  // Update job (recruiter only)
  updateJob: async (id, jobData) => {
    try {
      const response = await jobsAPI.updateJob(id, jobData);
      return response.data;
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  },

  // Delete job (recruiter only)
  deleteJob: async (id) => {
    try {
      const response = await jobsAPI.deleteJob(id);
      return response.data;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  },

  // Search jobs
  searchJobs: async (query, params = {}) => {
    try {
      const response = await jobsAPI.searchJobs(query);
      return response.data;
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw error;
    }
  },

  // Get jobs by company
  getJobsByCompany: async (companyId, params = {}) => {
    try {
      const response = await jobsAPI.getJobsByCompany(companyId);
      return response.data;
    } catch (error) {
      console.error('Error fetching company jobs:', error);
      throw error;
    }
  },

  // Get recruiter's own jobs
  getMyJobs: async (params = {}) => {
    try {
      const response = await jobsAPI.getMyJobs(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching my jobs:', error);
      throw error;
    }
  },

  // Get job analytics
  getJobAnalytics: async (id) => {
    try {
      const response = await jobsAPI.getJobAnalytics(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching job analytics:', error);
      throw error;
    }
  },

  // Update job status
  updateJobStatus: async (id, status) => {
    try {
      const response = await jobsAPI.updateJobStatus(id, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  }
};

export default jobService;