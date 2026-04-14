import axios from 'axios';

const API_URL = '/auth';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
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

// Add a response interceptor for handling token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Attempt to refresh the token
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}${API_URL}/refresh`, { refreshToken });
        
        if (response.data.success && response.data.accessToken) {
          localStorage.setItem('token', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

const authService = {
  register: async (userData) => {
    try {
      const response = await api.post(`${API_URL}/register`, userData);
      return response.data; // Return full response data
    } catch (error) {
      throw error;
    }
  },
  
  login: async (email, password) => {
    try {
      const response = await api.post(`${API_URL}/login`, { email, password });
      return response.data; // Return full response data
    } catch (error) {
      throw error;
    }
  },
  
  logout: async (refreshToken) => {
    try {
      await api.post(`${API_URL}/logout`, { refreshToken });
    } catch (error) {
      throw error;
    }
  },
  
  refreshToken: async (refreshToken) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}${API_URL}/refresh`, { refreshToken });
      return response.data; // Return full response data
    } catch (error) {
      throw error;
    }
  },
  
  forgotPassword: async (email) => {
    try {
      const response = await api.post(`${API_URL}/forgot-password`, { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post(`${API_URL}/reset-password`, {
        token,
        password: newPassword // Fixed: backend expects 'password', not 'newPassword'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    try {
      const response = await api.get(`${API_URL}/me`);
      return response.data.user; // Extract user from response
    } catch (error) {
      throw error;
    }
  },
  
  updateProfile: async (userData) => {
    try {
      const response = await api.put(`${API_URL}/profile`, userData);

      // Update the user in local storage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user; // Extract user from response
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post(`${API_URL}/change-password`, {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default authService;

// Export the API instance for use in other services
export { api };