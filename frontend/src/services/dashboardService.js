import { dashboardAPI } from './api';

const dashboardService = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      const response = await dashboardAPI.getStats();
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get recent activity
  getRecentActivity: async (params = {}) => {
    try {
      const response = await dashboardAPI.getRecentActivity(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  },

  // Get analytics data
  getAnalytics: async (params = {}) => {
    try {
      const response = await dashboardAPI.getAnalytics(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  },

  // Get reports
  getReports: async (params = {}) => {
    try {
      const response = await dashboardAPI.getReports(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  // Get notifications
  getNotifications: async (params = {}) => {
    try {
      const response = await dashboardAPI.getNotifications(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Real-time dashboard updates
  subscribeToUpdates: (callback) => {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll use polling
    const interval = setInterval(async () => {
      try {
        const stats = await dashboardService.getStats();
        const activity = await dashboardService.getRecentActivity({ limit: 10 });
        callback({ stats, activity });
      } catch (error) {
        console.error('Error in dashboard update subscription:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }
};

export default dashboardService;