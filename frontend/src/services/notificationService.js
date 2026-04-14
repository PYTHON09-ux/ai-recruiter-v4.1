import api from './api';

class NotificationService {
  // Get notifications
  async getNotifications(page = 1, limit = 10, unreadOnly = false) {
    try {
      const response = await api.get(`/dashboard/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await api.patch(`/dashboard/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      // This would need to be implemented in the backend
      const notifications = await this.getNotifications(1, 100, true);
      const promises = notifications.data.notifications.map(notification => 
        this.markAsRead(notification.id)
      );
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount() {
    try {
      const response = await this.getNotifications(1, 1, true);
      return response.data.unreadCount || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Create local notification (for real-time updates)
  createLocalNotification(title, message, type = 'info') {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: `ai-recruiter-${Date.now()}`
      });
    }
  }

  // Request notification permission
  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

export default new NotificationService();