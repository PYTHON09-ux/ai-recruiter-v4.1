import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }

    if (!error.response) {
      console.error('Network error:', error.message);
      throw new Error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadProfilePicture: (formData) =>
    api.post('/auth/profile/picture', formData, {
      headers: { 'Content-Type': undefined }, // let axios set multipart/form-data boundary
    }),
  deleteProfilePicture: () => api.delete('/auth/profile/picture'),
};

// Jobs API methods
export const jobsAPI = {
  getAllJobs: (params) => api.get('/jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${id}`),
  createJob: (jobData) => api.post('/jobs', jobData),
  updateJob: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  searchJobs: (query) => api.get('/jobs/search', { params: { q: query } }),
  getJobsByCompany: (companyId) => api.get(`/jobs/company/${companyId}`),
  getMyJobs: (params) => api.get('/jobs/recruiter/my-jobs', { params }),
  getJobAnalytics: (id) => api.get(`/jobs/${id}/analytics`),
};

// Applications API methods
export const applicationsAPI = {
  getAllApplications: (params) => api.get('/applications', { params }),
  getApplicationById: (id) => api.get(`/applications/${id}`),

  // Step 1: Upload resume file → get back { filename, url }
  uploadResume: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/applications/upload-resume', formData, {
      headers: { 'Content-Type': undefined }, // let axios set multipart boundary automatically
      onUploadProgress,
    });
  },

  // Step 2: Submit application as plain JSON with resumeUrl from step 1
  createApplication: (applicationData) => api.post('/applications', applicationData),

  updateApplication: (id, applicationData) => api.put(`/applications/${id}`, applicationData),
  deleteApplication: (id) => api.delete(`/applications/${id}`),
  getApplicationsByJob: (jobId) => api.get(`/applications/job/${jobId}`),
  getApplicationsByUser: (userId) => api.get(`/applications/user/${userId}`),
  updateApplicationStatus: (id, data) => api.patch(`/applications/${id}/status`, data),
  generateMagicLink: (id) => api.post(`/applications/${id}/generate-link`),
  getApplicationStats: () => api.get('/applications/stats/overview'),
  bulkUpdateStatus: (applicationIds, status, notes) =>
    api.patch('/applications/bulk/status', { applicationIds, status, notes }),

  validateMagicLink: (token) => api.get(`/interview/magic/${token}`),
};

// Interviews API methods
export const interviewsAPI = {
  getAllInterviews: (params) => api.get('/interview', { params }),
  getInterviewById: (id) => api.get(`/interview/${id}`),
  createInterview: (interviewData) => api.post('/interview', interviewData),
  updateInterview: (id, interviewData) => api.put(`/interview/${id}`, interviewData),
  deleteInterview: (id) => api.delete(`/interview/${id}`),
  getInterviewStatus: (id) => api.get(`/interview/${id}/status`),
  getInterviewsByApplication: (applicationId) =>
    api.get(`/interview/application/${applicationId}`),
  scheduleInterview: (data) => api.post('/interview', data),
  startInterview: (id) => api.post(`/interview/${id}/start`),
  endInterview: (id, data) => api.post(`/interview/${id}/end`, data),
  rescheduleInterview: (id, data) => api.patch(`/interview/${id}/reschedule`, data),
  cancelInterview: (id, data) => api.patch(`/interview/${id}/cancel`, data),
  validateMagicLink: (token) => api.get(`/interview/magic/${token}`),
  completeInterview: (interviewId, data) =>
    api.post(`/interview/${interviewId}/complete`, data),
  notifyCallStarted: (interviewId, data) =>
    api.post(`/interview/${interviewId}/call-started`, data),
  startInterviewByMagicLink: (token) => api.post(`/interview/start/${token}`),
  submitResponse: (interviewId, responseData) =>
    api.post(`/interview/${interviewId}/response`, responseData),
};

// Dashboard API methods
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/activity'),
  getAnalytics: (params) => api.get('/dashboard/analytics', { params }),
  getReports: (params) => api.get('/dashboard/reports', { params }),
  getNotifications: (params) => api.get('/dashboard/notifications', { params }),
};

// Voice API methods
export const voiceAPI = {
  startCall: (data) => api.post('/voice/start', data),
  endCall: (callId) => api.post(`/voice/end/${callId}`),
  getCallHistory: () => api.get('/voice/history'),
  getCallById: (id) => api.get(`/voice/${id}`),
  webhook: (data) => api.post('/voice/webhook', data),
};

// Upload API methods
export const uploadAPI = {
  uploadFile: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress,
    });
  },
  uploadResume: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/upload/resume', formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress,
    });
  },
  deleteFile: (fileId) => api.delete(`/upload/${fileId}`),
};

// Generic API methods
export const genericAPI = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;