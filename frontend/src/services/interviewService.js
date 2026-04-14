import { interviewsAPI } from './api';

const interviewService = {

  // Get interview status
  getInterviewStatus: async (id) => {
    try {
      const response = await interviewsAPI.getInterviewStatus(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching interview status:', error);
      throw error;
    }
  },

  // Get all interviews
  // Backend returns: { success, data: [...interviews], pagination: { currentPage, totalPages, ... } }
  // Axios wraps in response.data, so response.data = { success, data, pagination }
  // We return response.data so callers get { data, pagination } directly
  getAllInterviews: async (params = {}) => {
    try {
      const response = await interviewsAPI.getAllInterviews(params);
      return response.data; // { success, data: [...], pagination: {...} }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      throw error;
    }
  },

  // Get interview by ID
  getInterviewById: async (id) => {
    try {
      const response = await interviewsAPI.getInterviewById(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching interview:', error);
      throw error;
    }
  },

  // Schedule new interview (recruiter only)
  // NOTE: createInterview is an alias for scheduleInterview — use either name
  scheduleInterview: async (interviewData) => {
    try {
      const response = await interviewsAPI.scheduleInterview(interviewData);
      return response.data;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw error;
    }
  },

  // Alias so both scheduleInterview and createInterview work
  createInterview: async (interviewData) => {
    return interviewService.scheduleInterview(interviewData);
  },

  // Update interview
  updateInterview: async (id, updateData) => {
    try {
      const response = await interviewsAPI.updateInterview(id, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating interview:', error);
      throw error;
    }
  },

  // Delete interview
  deleteInterview: async (id) => {
    try {
      const response = await interviewsAPI.deleteInterview(id);
      return response.data;
    } catch (error) {
      console.error('Error deleting interview:', error);
      throw error;
    }
  },

  // Get interviews by application
  getInterviewsByApplication: async (applicationId, params = {}) => {
    try {
      const response = await interviewsAPI.getInterviewsByApplication(applicationId);
      return response.data;
    } catch (error) {
      console.error('Error fetching application interviews:', error);
      throw error;
    }
  },

  // Start interview
  startInterview: async (id) => {
    try {
      const response = await interviewsAPI.startInterview(id);
      return response.data;
    } catch (error) {
      console.error('Error starting interview:', error);
      throw error;
    }
  },

  // End interview
  endInterview: async (id, endData) => {
    try {
      const response = await interviewsAPI.endInterview(id, endData);
      return response.data;
    } catch (error) {
      console.error('Error ending interview:', error);
      throw error;
    }
  },

  // Validate magic link
  // Backend returns { success, message, data: { job, candidateName, interviewId, questions, ... } }
  // Axios wraps → response.data = { success, message, data: {...} }
  // We return response.data.data so callers get the inner payload directly
  validateMagicLink: async (token) => {
    try {
      const response = await interviewsAPI.validateMagicLink(token);
      return response.data.data;
    } catch (error) {
      console.error('Error validating magic link:', error);
      throw error;
    }
  },

  startInterviewByMagicLink: async (token) => {
    try {
      const response = await interviewsAPI.startInterviewByMagicLink(token);
      return response.data.data;
    } catch (error) {
      console.error('Error starting interview by magic link:', error);
      throw error;
    }
  },

  submitResponse: async (interviewId, responseData) => {
    try {
      const response = await interviewsAPI.submitResponse(interviewId, responseData);
      return response.data;
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  },

  completeInterview: async (interviewId, completionData) => {
    try {
      const response = await interviewsAPI.completeInterview(interviewId, completionData);
      return response.data;
    } catch (error) {
      console.error('Error completing interview:', error);
      throw error;
    }
  },

  // Reschedule interview
  rescheduleInterview: async (id, scheduledAt, reason = '') => {
    try {
      const response = await interviewsAPI.rescheduleInterview(id, { scheduledAt, reason });
      return response.data;
    } catch (error) {
      console.error('Error rescheduling interview:', error);
      throw error;
    }
  },

  // Cancel interview
  cancelInterview: async (id, reason = '') => {
    try {
      const response = await interviewsAPI.cancelInterview(id, { reason });
      return response.data;
    } catch (error) {
      console.error('Error cancelling interview:', error);
      throw error;
    }
  }
};

export default interviewService;