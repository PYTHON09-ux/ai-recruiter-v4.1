import { applicationsAPI } from './api';

const applicationService = {
  getAllApplications: async (params) => {
    try {
      const response = await applicationsAPI.getAllApplications(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  },

  getApplicationById: async (id) => {
    try {
      const response = await applicationsAPI.getApplicationById(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching application:', error);
      throw error;
    }
  },

  // Step 1: Upload resume file → get back { resumeUrl, originalName }
  uploadResume: async (file, onUploadProgress) => {
    try {
      const response = await applicationsAPI.uploadResume(file, onUploadProgress);
      return response.data; // { success: true, data: { resumeUrl, originalName } }
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw error;
    }
  },

  // Step 2: Submit application as plain JSON with resumeUrl
  submitApplication: async (applicationData) => {
    try {
      const payload = {
        jobId: applicationData.jobId,
        coverLetter: applicationData.coverLetter || '',
        resumeUrl: applicationData.resumeUrl,       // ✅ full Cloudinary URL
        originalName: applicationData.originalName, // ✅ original filename
      };

      console.log('Submitting application payload:', payload);

      const response = await applicationsAPI.createApplication(payload);
      return response.data;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  },

  updateApplication: async (id, applicationData) => {
    try {
      const response = await applicationsAPI.updateApplication(id, applicationData);
      return response.data;
    } catch (error) {
      console.error('Error updating application:', error);
      throw error;
    }
  },

  deleteApplication: async (id) => {
    try {
      const response = await applicationsAPI.deleteApplication(id);
      return response.data;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  },

  getApplicationsByJob: async (jobId) => {
    try {
      const response = await applicationsAPI.getApplicationsByJob(jobId);
      return response.data;
    } catch (error) {
      console.error('Error fetching applications by job:', error);
      throw error;
    }
  },

  getApplicationsByUser: async (userId) => {
    try {
      const response = await applicationsAPI.getApplicationsByUser(userId);
      return response.data;
    } catch (error) {
      console.error('Error fetching applications by user:', error);
      throw error;
    }
  },

  updateApplicationStatus: async (id, data) => {
    try {
      const response = await applicationsAPI.updateApplicationStatus(id, data);
      return response.data;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  },

  generateMagicLink: async (id) => {
    try {
      const response = await applicationsAPI.generateMagicLink(id);
      return response.data;
    } catch (error) {
      console.error('Error generating magic link:', error);
      throw error;
    }
  },

  getApplicationStats: async () => {
    try {
      const response = await applicationsAPI.getApplicationStats();
      return response.data;
    } catch (error) {
      console.error('Error fetching application stats:', error);
      throw error;
    }
  },

  bulkUpdateStatus: async (applicationIds, status, notes) => {
    try {
      const response = await applicationsAPI.bulkUpdateStatus(applicationIds, status, notes);
      return response.data;
    } catch (error) {
      console.error('Error bulk updating statuses:', error);
      throw error;
    }
  },

  validateMagicLink: async (token) => {
    try {
      const response = await applicationsAPI.validateMagicLink(token);
      return response.data;
    } catch (error) {
      console.error('Error validating magic link:', error);
      throw error;
    }
  },
};

export default applicationService;