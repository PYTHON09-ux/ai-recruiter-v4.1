import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  XCircle, 
  User, 
  Briefcase, 
  Calendar,
  MessageSquare
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationItem = ({ notification }) => {
  const { markAsRead } = useNotifications();

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application_received':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'interview_scheduled':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'interview_completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'job_posted':
        return <Briefcase className="w-5 h-5 text-purple-500" />;
      case 'feedback_received':
        return <MessageSquare className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'application_received':
      case 'info':
        return 'border-l-blue-500';
      case 'interview_scheduled':
      case 'interview_completed':
      case 'success':
        return 'border-l-green-500';
      case 'job_posted':
        return 'border-l-purple-500';
      case 'feedback_received':
        return 'border-l-orange-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${getNotificationColor(notification.type)} ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                {notification.title || notification.message}
              </p>
              {notification.title && notification.message && notification.title !== notification.message && (
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
              )}
              
              {/* Metadata */}
              {notification.metadata && (
                <div className="mt-2 text-xs text-gray-500">
                  {notification.metadata.jobTitle && (
                    <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-2">
                      {notification.metadata.jobTitle}
                    </span>
                  )}
                  {notification.metadata.candidateName && (
                    <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-2">
                      {notification.metadata.candidateName}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Unread indicator */}
            {!notification.read && (
              <div className="flex-shrink-0 ml-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(notification.timestamp || notification.createdAt), { 
              addSuffix: true 
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;