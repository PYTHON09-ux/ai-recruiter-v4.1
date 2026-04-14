import React from 'react';
import { 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const MetricsCards = ({ dashboardData, userRole }) => {
  if (!dashboardData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const getMetricsForRole = () => {
    if (userRole === 'recruiter') {
      return [
        {
          title: 'Total Jobs',
          value: dashboardData.totalJobs || 0,
          icon: Briefcase,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          change: '+12%',
          changeType: 'positive'
        },
        {
          title: 'Active Jobs',
          value: dashboardData.activeJobs || 0,
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          change: '+5%',
          changeType: 'positive'
        },
        {
          title: 'Total Applications',
          value: dashboardData.totalApplications || 0,
          icon: Users,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          change: '+23%',
          changeType: 'positive'
        },
        {
          title: 'Pending Reviews',
          value: dashboardData.pendingApplications || 0,
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          change: '-8%',
          changeType: 'negative'
        }
      ];
    } else {
      return [
        {
          title: 'Applications Sent',
          value: dashboardData.totalApplications || 0,
          icon: Briefcase,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          change: '+3',
          changeType: 'positive'
        },
        {
          title: 'Pending Applications',
          value: dashboardData.pendingApplications || 0,
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          change: '0',
          changeType: 'neutral'
        },
        {
          title: 'Scheduled Interviews',
          value: dashboardData.scheduledInterviews || 0,
          icon: Calendar,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          change: '+1',
          changeType: 'positive'
        },
        {
          title: 'Profile Completion',
          value: '85%',
          icon: CheckCircle,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          change: '+15%',
          changeType: 'positive'
        }
      ];
    }
  };

  const metrics = getMetricsForRole();

  const getChangeColor = (changeType) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="w-3 h-3" />;
      case 'negative':
        return <XCircle className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {metric.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </p>
                <div className={`flex items-center mt-2 text-sm ${getChangeColor(metric.changeType)}`}>
                  {getChangeIcon(metric.changeType)}
                  <span className="ml-1">{metric.change}</span>
                  <span className="text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricsCards;