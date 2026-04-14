import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import authService from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Validate the token by checking expiration
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          // Token is expired, try to refresh
          refreshToken();
        } else {
          // Token is valid, set the user
          console.log('Decoded Token on Init:', decodedToken);  
          setCurrentUser({
            id: decodedToken.userId,
            name: `${decodedToken.name}`.trim(),
            email: decodedToken.email,
            role: decodedToken.role,
            company: decodedToken.company,
            phoneNumber: decodedToken.phoneNumber,
            profileData: decodedToken.profileData || {}
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authService.refreshToken(refreshToken);

      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      const decodedToken = jwtDecode(response.accessToken);
      console.log('Decoded Token on Refresh:', decodedToken);

      setCurrentUser({
        id: decodedToken.userId,
        name: `${decodedToken.name}`.trim(),
        email: decodedToken.email,
        role: decodedToken.role,
        company: decodedToken.company,
        phoneNumber: decodedToken.phoneNumber,
        profileData: decodedToken.profileData || {}
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);

      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      const decodedToken = jwtDecode(response.accessToken);
      console.log('Decoded Token on Login:', decodedToken);

      const userData = {
        id: decodedToken.userId,
        name: `${decodedToken.name}`.trim(),
        email: decodedToken.email,
        role: decodedToken.role,
        company: decodedToken.company,
        phoneNumber: decodedToken.phoneNumber,
        profileData: decodedToken.profileData || {}
      };

      setCurrentUser(userData);
      toast.success(`Welcome back, ${userData.name || userData.email}!`);
      return { success: true, role: decodedToken.role };
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
      toast.error(error.response?.data?.message || 'Invalid email or password');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.register(userData);

      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      const decodedToken = jwtDecode(response.accessToken);

      const newUserData = {
        id: decodedToken.userId,
        name: `${decodedToken.name}`.trim(),
        email: decodedToken.email,
        role: decodedToken.role,
        company: decodedToken.company,
        phoneNumber: decodedToken.phoneNumber,
        profileData: decodedToken.profileData || {}
      };

      setCurrentUser(newUserData);
      toast.success('Account created successfully!');
      return { success: true, role: decodedToken.role };
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to register');
      toast.error(error.response?.data?.message || 'Registration failed');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API success/failure
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setCurrentUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (updatedUserData) => {
    setCurrentUser(prev => ({
      ...prev,
      ...updatedUserData
    }));
  };

  const forgotPassword = async (email) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(email);
      toast.success('Password reset instructions sent to your email');
      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.message || 'Failed to process password reset request');
      toast.error(error.response?.data?.message || 'Failed to send reset email');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token, newPassword);
      toast.success('Password reset successfully. Please login with your new password.');
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message || 'Failed to reset password');
      toast.error(error.response?.data?.message || 'Failed to reset password');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    updateUser,
    isLoading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    refreshToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}