import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationsAPI, jobsAPI } from '../../services/api';
import applicationService from '../../services/applicationService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FiSearch,
  FiFilter,
  FiEye,
  FiMail,
  FiPhone,
  FiCalendar,
  FiDownload,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiX,
  FiFileText
} from 'react-icons/fi';

// Google Docs viewer renders any public URL in browser — no CORS issues
const getGoogleViewerUrl = (url) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

// ── Resume Preview Modal ─────────────────────────────────────────────────────
function ResumeModal({ resumeUrl, filename, candidateName, onClose }) {
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center space-x-3">
            <FiFileText className="text-blue-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Resume</h3>
              <p className="text-sm text-gray-500">{candidateName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Download — opens raw Cloudinary URL, browser downloads raw file */}
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={filename || 'resume'}
              className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload size={14} className="mr-1" />
              Download
            </a>
            <button onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* iframe — Google Docs renders the raw Cloudinary URL */}
        <div className="relative flex-1 overflow-hidden rounded-b-xl bg-gray-100">
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-sm text-gray-500">Loading document...</p>
            </div>
          )}
          <iframe
            src={getGoogleViewerUrl(resumeUrl)}
            className="w-full h-full border-0"
            title={`Resume - ${candidateName}`}
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CandidateListPage() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Resume modal state
  const [previewData, setPreviewData] = useState(null); // { resumeUrl, filename, candidateName }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { filterApplications(); }, [applications, searchTerm, statusFilter, jobFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const applicationsResponse = await applicationService.getAllApplications({ currentUserId: currentUser.id });
      const jobsResponse = await jobsAPI.getAllJobs({ page: 1, limit: 100 });
      setApplications(applicationsResponse?.data || []);
      setJobs(jobsResponse.data?.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;
    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.candidateId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.candidateId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.candidateId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.jobId?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(app => app.status === statusFilter);
    if (jobFilter !== 'all') filtered = filtered.filter(app => app.jobId?._id === jobFilter);
    setFilteredApplications(filtered);
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await applicationsAPI.updateApplicationStatus(applicationId, newStatus);
      setApplications(prev =>
        prev.map(app => app._id === applicationId ? { ...app, status: newStatus } : app)
      );
      toast.success('Application status updated successfully');
    } catch (error) {
      toast.error('Failed to update application status');
    }
  };

  const handleViewResume = (application) => {
    if (!application.resume?.url) {
      toast.error('No resume available');
      return;
    }
    const name = `${application.candidateId?.firstName || ''} ${application.candidateId?.lastName || ''}`.trim() || 'Candidate';
    setPreviewData({
      resumeUrl: application.resume.url,
      filename: application.resume.filename || 'resume.pdf',
      candidateName: name,
    });
  };

  const handleDownload = (application) => {
    if (!application.resume?.url) {
      toast.error('No resume available');
      return;
    }
    // Open raw Cloudinary URL — browser downloads raw file automatically
    window.open(application.resume.url, '_blank');
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      reviewing: 'bg-blue-100 text-blue-800 border-blue-200',
      shortlisted: 'bg-green-100 text-green-800 border-green-200',
      interviewed: 'bg-purple-100 text-purple-800 border-purple-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      hired: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="w-4 h-4" />;
      case 'shortlisted':
      case 'hired': return <FiCheckCircle className="w-4 h-4" />;
      case 'rejected': return <FiXCircle className="w-4 h-4" />;
      default: return <FiUser className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Candidate Applications</h1>
          <p className="text-gray-600 mt-2">Review and manage applications from candidates.</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidates by name, email, or job title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FiFilter className="mr-2" />Filters
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interviewed">Interviewed</option>
                    <option value="rejected">Rejected</option>
                    <option value="hired">Hired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Position</label>
                  <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Positions</option>
                    {jobs.map((job) => (
                      <option key={job._id} value={job._id}>{job.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <span className="text-sm text-gray-500">{filteredApplications.length} applications found</span>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FiUser className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || jobFilter !== 'all'
                ? 'Try adjusting your search criteria.'
                : 'Applications will appear here once candidates start applying to your jobs.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <div key={application._id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-gray-700">
                      {application.candidateId?.firstName?.charAt(0) || 'C'}
                      {application.candidateId?.lastName?.charAt(0) || ''}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.candidateId?.firstName} {application.candidateId?.lastName}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1 capitalize">{application.status}</span>
                      </span>
                    </div>

                    <p className="text-blue-600 font-medium mb-2">
                      Applied for: {application.jobId?.title}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        <FiMail className="mr-1" size={14} />{application.candidateId?.email}
                      </span>
                      {application.candidateId?.phoneNumber && (
                        <span className="flex items-center">
                          <FiPhone className="mr-1" size={14} />{application.candidateId?.phoneNumber}
                        </span>
                      )}
                      <span className="flex items-center">
                        <FiCalendar className="mr-1" size={14} />Applied {formatDate(application.createdAt)}
                      </span>
                    </div>

                    {application.coverLetter && (
                      <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                        <strong>Cover Letter:</strong> {application.coverLetter}
                      </p>
                    )}

                    {application.candidateId?.profileData?.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {application.candidateId.profileData.skills.slice(0, 5).map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{skill}</span>
                        ))}
                        {application.candidateId.profileData.skills.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{application.candidateId.profileData.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                      <Link to={`/recruiter/candidates/${application._id}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <FiEye className="mr-1" size={14} />View Details
                      </Link>

                      {application.resume?.url && (
                        <>
                          {/* View — Google Docs viewer in modal */}
                          <button onClick={() => handleViewResume(application)}
                            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            <FiFileText className="mr-1" size={14} />View Resume
                          </button>

                          {/* Download — opens raw Cloudinary URL */}
                          <button onClick={() => handleDownload(application)}
                            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            <FiDownload className="mr-1" size={14} />Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Preview Modal */}
      {previewData && (
        <ResumeModal
          resumeUrl={previewData.resumeUrl}
          filename={previewData.filename}
          candidateName={previewData.candidateName}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}