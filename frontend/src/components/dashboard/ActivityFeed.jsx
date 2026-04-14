import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  User, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';

const ActivityFeed = ({ userRole }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async (pageNum = 1) => {
    try {
      setLoading(pageNum === 1);
      const response = await dashboardService.getActivities(pageNum, 10);
      
      if (pageNum === 1) {
        setActivities(response.data.activities);
      } else {
        setActivities(prev => [...prev, ...response.data.activities]);
      }
      
      setHasMore(response.data.currentPage < response.data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchActivities(page + 1);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'application_received':
      case 'application_submitted':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'job_posted':
      case 'job_updated':
        return <Briefcase className="w-4 h-4 text-purple-500" />;
      case 'interview_scheduled':
      case 'interview_completed':
        return <Calendar className="w-4 h-4 text-green-500" />;
      case 'feedback_received':
      case 'feedback_provided':
        return <MessageSquare className="w-4 h-4 text-orange-500" />;
      case 'application_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'application_rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'application_received':
      case 'application_submitted':
        return 'border-l-blue-500';
      case 'job_posted':
      case 'job_updated':
        return 'border-l-purple-500';
      case 'interview_scheduled':
      case 'interview_completed':
        return 'border-l-green-500';
      case 'feedback_received':
      case 'feedback_provided':
        return 'border-l-orange-500';
      case 'application_approved':
        return 'border-l-green-500';
      case 'application_rejected':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {activities.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {activities.map((activity, index) => (
              <div
                key={activity.id || index}
                className={`p-4 hover:bg-gray-50 border-l-4 ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.message}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.timestamp), { 
                          addSuffix: true 
                        })}
                      </p>
                      {activity.metadata && (
                        <div className="flex items-center space-x-2">
                          {activity.metadata.jobTitle && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {activity.metadata.jobTitle}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No recent activity</p>
          </div>
        )}
        
        {hasMore && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more activities'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;