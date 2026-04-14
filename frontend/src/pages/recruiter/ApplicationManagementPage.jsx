import React, { useState, useEffect } from 'react';
import {useAuth} from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Eye, 
  MessageSquare, 
  Calendar, 
  Download,
  MoreHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ApplicationFilters from '../../components/applications/ApplicationFilters';
import ApplicationStatistics from '../../components/applications/ApplicationStatistics';
import BulkActionsPanel from '../../components/applications/BulkActionsPanel';
import applicationService from '../../services/applicationService';
import jobService from '../../services/jobService';
import interviewService from '../../services/interviewService';
import InterviewScheduler from '../../components/interviews/InterviewScheduler';
import toast from 'react-hot-toast';

const ApplicationManagementPage = () => {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
    // fetchJobs();
    fetchStats();
  }, [filters, searchTerm, currentPage]);


  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationService.getAllApplications({
        ...filters,
        search: searchTerm,
        page: currentPage,
        limit: 20
      });
      console.log('Fetched applications:', response);
      setApplications(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await jobService.getMyJobs({currentUserId: currentUser.id});
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await applicationService.getApplicationStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleBulkAction = async (applicationIds, status, notes) => {
    try {
      await applicationService.bulkUpdateStatus(applicationIds, status, notes);
      await fetchApplications();
      await fetchStats();
    } catch (error) {
      throw error;
    }
  };

  const handleSelectApplication = (applicationId) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(applications.map(app => app._id));
    }
  };

  const handleScheduleInterview = async (interviewData) => {
    try {
      await interviewService.scheduleInterview(interviewData);
      fetchApplications();
    } catch (error) {
      console.error("Failed to schedule interview:", error);
      throw new Error(error.response?.data?.message || 'Failed to schedule interview');
    }
  };

  const openScheduler = (application) => {
    setSelectedApp(application);
    setIsSchedulerOpen(true);
  };

  const closeScheduler = () => {
    setSelectedApp(null);
    setIsSchedulerOpen(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'bg-green-100 text-green-800';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'interview_completed':
        return 'bg-indigo-100 text-indigo-800';
      case 'interviewed':
      case 'interviewing':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'hired':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Application Management</h1>
        <p className="text-gray-600 mt-2">
          Manage and review all job applications
        </p>
      </div>

      {/* Statistics */}
      <ApplicationStatistics stats={stats} />

      {/* Filters */}
      <ApplicationFilters
        filters={filters}
        onFilterChange={setFilters}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        jobs={jobs}
      />

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedApplications?.length === applications.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All</span>
              </button>
              
              {selectedApplications?.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedApplications?.length} selected
                </span>
              )}
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading applications...</p>
          </div>
        ) : applications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr 
                    key={application._id}
                    className={`hover:bg-gray-50 ${
                      selectedApplications.includes(application._id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleSelectApplication(application._id)}
                          className="mr-3"
                        >
                          {selectedApplications.includes(application._id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.candidateId?.fullName || 'Unknown Candidate'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.candidateId?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {application.jobId?.title || 'Unknown Job'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {application.jobId?.company.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link to={`/recruiter/candidates/${application._id}`} className="text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="text-green-600 hover:text-green-900">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openScheduler(application)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No applications found matching your criteria.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Panel */}
      <BulkActionsPanel
        selectedApplications={selectedApplications}
        onBulkAction={handleBulkAction}
        onClearSelection={() => setSelectedApplications([])}
      />

      {/* Interview Scheduler Modal */}
      {isSchedulerOpen && selectedApp && (
        <InterviewScheduler
          application={selectedApp}
          onSchedule={handleScheduleInterview}
          onClose={closeScheduler}
        />
      )}
    </div>
  );
};

export default ApplicationManagementPage;