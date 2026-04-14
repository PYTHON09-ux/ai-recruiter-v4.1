import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Service for managing proctoring-related API calls
 */
class ProctoringService {
  /**
   * Initialize proctoring for an interview
   * @param {string} interviewId - The ID of the interview
   * @returns {Promise<Object>} The initialization response
   */
  async initializeProctoring(interviewId) {
    try {
      const response = await axios.post(`${API_URL}/interviews/${interviewId}/proctoring/initialize`, {}, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error initializing proctoring:', error);
      throw error;
    }
  }

  /**
   * Submit face detection data
   * @param {string} interviewId - The ID of the interview
   * @param {Object} faceData - The face detection data
   * @returns {Promise<Object>} The response data
   */
  async submitFaceData(interviewId, faceData) {
    try {
      const response = await axios.post(`${API_URL}/interviews/${interviewId}/proctoring/face`, faceData, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting face data:', error);
      throw error;
    }
  }

  /**
   * Submit audio analysis data
   * @param {string} interviewId - The ID of the interview
   * @param {Object} audioData - The audio analysis data
   * @returns {Promise<Object>} The response data
   */
  async submitAudioData(interviewId, audioData) {
    try {
      const response = await axios.post(`${API_URL}/interviews/${interviewId}/proctoring/audio`, audioData, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting audio data:', error);
      throw error;
    }
  }

  /**
   * Submit screen activity data
   * @param {string} interviewId - The ID of the interview
   * @param {Object} screenData - The screen activity data
   * @returns {Promise<Object>} The response data
   */
  async submitScreenData(interviewId, screenData) {
    try {
      const response = await axios.post(`${API_URL}/interviews/${interviewId}/proctoring/screen`, screenData, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting screen data:', error);
      throw error;
    }
  }

  /**
   * Report a potential violation
   * @param {string} interviewId - The ID of the interview
   * @param {Object} violationData - The violation data
   * @returns {Promise<Object>} The response data
   */
  async reportViolation(interviewId, violationData) {
    try {
      const response = await axios.post(`${API_URL}/interviews/${interviewId}/proctoring/violation`, violationData, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error reporting violation:', error);
      throw error;
    }
  }

  /**
   * Get the proctoring summary for an interview
   * @param {string} interviewId - The ID of the interview
   * @returns {Promise<Object>} The proctoring summary data
   */
  async getProctoringResults(interviewId) {
    try {
      const response = await axios.get(`${API_URL}/interviews/${interviewId}/proctoring/results`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching proctoring results:', error);
      throw error;
    }
  }
}

export const proctoringService = new ProctoringService();
export default proctoringService; // For backward compatibility