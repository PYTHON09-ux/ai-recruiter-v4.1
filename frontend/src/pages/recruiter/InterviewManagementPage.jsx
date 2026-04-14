import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search,
  RefreshCw
} from 'lucide-react';
import InterviewList from '../../components/interviews/InterviewList';
import InterviewScheduler from '../../components/interviews/InterviewScheduler';
import interviewService from '../../services/interviewService';
import applicationService from '../../services/applicationService';
import toast from 'react-hot-toast';

const InterviewManagementPage = () => {
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateRange: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Fetch interviews — only re-runs when individual filter values change,
  //    NOT on every render (avoids infinite loop from object reference change)
  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await interviewService.getAllInterviews({
        status: filters.status || undefined,
        type: filters.type || undefined,
        search: searchTerm || undefined,
        page: currentPage,
        limit: 20
      });
      // response = { success, data: [...], pagination: { totalPages, ... } }
      setInterviews(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.type, searchTerm, currentPage]);

  // Fetch applications once on mount only
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await applicationService.getAllApplications({
          status: 'shortlisted',
          limit: 100
        });
        setApplications(response.data || []);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };
    fetchApplications();
  }, []);

  // Re-fetch interviews when filters/search/page change
  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const handleScheduleInterview = async (interviewData) => {
    try {
      // Use scheduleInterview — createInterview does not exist in the service
      await interviewService.scheduleInterview(interviewData);
      await fetchInterviews();
      setShowScheduler(false);
      setSelectedApplication(null);
      toast.success('Interview scheduled successfully');
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw error;
    }
  };

  const handleEditInterview = (interview) => {
    setSelectedApplication({
      ...interview.application,
      _id: interview.applicationId,
      candidate: interview.candidate,
      job: interview.job
    });
    setShowScheduler(true);
  };

  const handleDeleteInterview = async (interview) => {
    if (window.confirm('Are you sure you want to delete this interview?')) {
      try {
        await interviewService.deleteInterview(interview._id);
        await fetchInterviews();
        toast.success('Interview deleted successfully');
      } catch (error) {
        console.error('Error deleting interview:', error);
        toast.error('Failed to delete interview');
      }
    }
  };

  const handleStartInterview = (interview) => {
    if (interview.meetingLink) {
      window.open(interview.meetingLink, '_blank');
    }
    toast.info('Interview session opened');
  };

  const handleRescheduleInterview = async (interview) => {
    const newDate = prompt('Enter new date and time (YYYY-MM-DD HH:MM):');
    if (newDate) {
      try {
        await interviewService.rescheduleInterview(
          interview._id,
          newDate,
          'Rescheduled by recruiter'
        );
        await fetchInterviews();
        toast.success('Interview rescheduled successfully');
      } catch (error) {
        console.error('Error rescheduling interview:', error);
        toast.error('Failed to reschedule interview');
      }
    }
  };

  const handleCancelInterview = async (interview) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      try {
        await interviewService.cancelInterview(interview._id, reason);
        await fetchInterviews();
        toast.success('Interview cancelled successfully');
      } catch (error) {
        console.error('Error cancelling interview:', error);
        toast.error('Failed to cancel interview');
      }
    }
  };

  const handleOpenScheduler = () => {
    if (applications.length === 0) {
      toast.error('No shortlisted applications available to schedule an interview.');
      return;
    }
    setSelectedApplication(null);
    setShowScheduler(true);
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'video', label: 'Video Call' },
    { value: 'phone', label: 'Phone Call' },
    { value: 'in-person', label: 'In-Person' },
    { value: 'voice', label: 'AI Voice' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Management</h1>
            <p className="text-gray-600 mt-2">Schedule and manage all interviews</p>
          </div>

          <button
            onClick={handleOpenScheduler}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Interview</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by candidate name or job title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // reset to page 1 on new search
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center space-x-4">
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, type: e.target.value }));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={fetchInterviews}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interview List */}
      <InterviewList
        interviews={interviews}
        loading={loading}
        onEdit={handleEditInterview}
        onDelete={handleDeleteInterview}
        onStart={handleStartInterview}
        onReschedule={handleRescheduleInterview}
        onCancel={handleCancelInterview}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
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
      )}

      {/* Interview Scheduler Modal — only mount when we have a valid application */}
      {showScheduler && (
        <InterviewScheduler
          application={selectedApplication || applications[0] || null}
          onSchedule={handleScheduleInterview}
          onClose={() => {
            setShowScheduler(false);
            setSelectedApplication(null);
          }}
        />
      )}
    </div>
  );
};

export default InterviewManagementPage;