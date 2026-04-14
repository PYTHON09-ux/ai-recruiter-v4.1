import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class UploadService {
  /**
   * Upload resume file
   * @param {File} file - Resume file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadResume(file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await api.post('/upload/resume', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('Resume upload error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to upload resume'
      );
    }
  }

  /**
   * Upload profile picture
   * @param {File} file - Profile picture file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadProfilePicture(file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/upload/profile-picture', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('Profile picture upload error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to upload profile picture'
      );
    }
  }

  /**
   * Delete resume
   * @returns {Promise<Object>} Delete result
   */
  async deleteResume() {
    try {
      const response = await api.delete('/upload/resume');
      return response.data;
    } catch (error) {
      console.error('Resume deletion error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to delete resume'
      );
    }
  }

  /**
   * Delete profile picture
   * @returns {Promise<Object>} Delete result
   */
  async deleteProfilePicture() {
    try {
      const response = await api.delete('/upload/profile-picture');
      return response.data;
    } catch (error) {
      console.error('Profile picture deletion error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to delete profile picture'
      );
    }
  }

  /**
   * Upload interview recording
   * @param {Blob} audioBlob - Audio recording blob
   * @param {String} interviewId - Interview ID
   * @param {Number} questionIndex - Question index
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadInterviewRecording(audioBlob, interviewId, questionIndex, onProgress) {
    try {
      const formData = new FormData();
      formData.append('recording', audioBlob, `interview_${interviewId}_q${questionIndex}.webm`);
      formData.append('interviewId', interviewId);
      formData.append('questionIndex', questionIndex);

      const response = await api.post('/upload/interview-recording', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('Interview recording upload error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to upload interview recording'
      );
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @param {String} type - File type ('resume' | 'profilePicture')
   * @returns {Object} Validation result
   */
  validateFile(file, type) {
    const validation = {
      isValid: true,
      errors: []
    };

    if (!file) {
      validation.isValid = false;
      validation.errors.push('No file selected');
      return validation;
    }

    if (type === 'resume') {
      // Resume validation
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        validation.isValid = false;
        validation.errors.push('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
      }

      if (file.size > maxSize) {
        validation.isValid = false;
        validation.errors.push('File size too large. Maximum size is 10MB.');
      }
    } else if (type === 'profilePicture') {
      // Profile picture validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        validation.isValid = false;
        validation.errors.push('Invalid file type. Only JPEG, PNG, and GIF images are allowed.');
      }

      if (file.size > maxSize) {
        validation.isValid = false;
        validation.errors.push('File size too large. Maximum size is 5MB.');
      }
    }

    return validation;
  }

  /**
   * Format file size for display
   * @param {Number} bytes - File size in bytes
   * @returns {String} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   * @param {String} filename - File name
   * @returns {String} File extension
   */
  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  }

  /**
   * Generate file preview URL
   * @param {File} file - File object
   * @returns {String} Preview URL
   */
  generatePreviewUrl(file) {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }
}

export default new UploadService();