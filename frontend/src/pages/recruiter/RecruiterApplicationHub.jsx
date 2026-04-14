/**
 * RecruiterApplicationsHub.jsx
 *
 * Single unified entry-point for all recruiter application views.
 *
 * Routing contract (React Router v6):
 *   /recruiter/applications              → CandidateListTab  (default tab)
 *   /recruiter/applications/manage       → ApplicationManagementTab
 *   /recruiter/applications/:id          → CandidateEvaluationPage (child route)
 *
 * Usage in your router:
 *
 *   <Route path="/recruiter/applications" element={<RecruiterApplicationsHub />}>
 *     <Route index element={<CandidateListTab />} />
 *     <Route path="manage" element={<ApplicationManagementTab />} />
 *     <Route path=":id" element={<CandidateEvaluationPage />} />
 *   </Route>
 */

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { applicationsAPI, jobsAPI } from '../../services/api';
import applicationService from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import jobService from '../../services/jobService';
import ApplicationFilters from '../../components/applications/ApplicationFilters';
import ApplicationStatistics from '../../components/applications/ApplicationStatistics';
import BulkActionsPanel from '../../components/applications/BulkActionsPanel';
import InterviewScheduler from '../../components/interviews/InterviewScheduler';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

import {
  FiSearch, FiFilter, FiEye, FiMail, FiPhone, FiCalendar,
  FiDownload, FiUser, FiCheckCircle, FiXCircle, FiClock,
  FiX, FiFileText, FiAlertTriangle, FiCheck,
} from 'react-icons/fi';
import {
  Eye, MessageSquare, Calendar, Download,
  MoreHorizontal, CheckSquare, Square,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getGoogleViewerUrl = (url) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

const STATUS_COLORS = {
  pending:              'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewing:            'bg-blue-100   text-blue-800   border-blue-200',
  shortlisted:          'bg-green-100  text-green-800  border-green-200',
  interviewed:          'bg-purple-100 text-purple-800 border-purple-200',
  interview_scheduled:  'bg-purple-100 text-purple-800 border-purple-200',
  interview_completed:  'bg-indigo-100 text-indigo-800 border-indigo-200',
  rejected:             'bg-red-100    text-red-800    border-red-200',
  hired:                'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const getStatusColor     = (s) => STATUS_COLORS[s] || 'bg-gray-100 text-gray-800 border-gray-200';
const getStatusIcon      = (s) => {
  switch (s) {
    case 'pending':   return <FiClock      className="w-4 h-4" />;
    case 'shortlisted':
    case 'hired':     return <FiCheckCircle className="w-4 h-4" />;
    case 'rejected':  return <FiXCircle    className="w-4 h-4" />;
    default:          return <FiUser       className="w-4 h-4" />;
  }
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const getEvalScoreColor = (score) =>
  score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';

// ─────────────────────────────────────────────────────────────────────────────
// ResumeModal  (shared across both list tabs)
// ─────────────────────────────────────────────────────────────────────────────

function ResumeModal({ resumeUrl, filename, candidateName, onClose }) {
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center space-x-3">
            <FiFileText className="text-blue-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Resume</h3>
              <p className="text-sm text-gray-500">{candidateName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer"
              download={filename || 'resume'}
              className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FiDownload size={14} className="mr-1" /> Download
            </a>
            <button onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <FiX size={20} />
            </button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden rounded-b-xl bg-gray-100">
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3" />
              <p className="text-sm text-gray-500">Loading document...</p>
            </div>
          )}
          <iframe
            src={getGoogleViewerUrl(resumeUrl)}
            className="w-full h-full border-0"
            title={`Resume – ${candidateName}`}
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 – Candidate List  (was CandidateListPage)
// ─────────────────────────────────────────────────────────────────────────────

function CandidateListTab() {
  const { currentUser } = useAuth();
  const [applications, setApplications]           = useState([]);
  const [filteredApplications, setFiltered]       = useState([]);
  const [jobs, setJobs]                           = useState([]);
  const [isLoading, setIsLoading]                 = useState(true);
  const [searchTerm, setSearchTerm]               = useState('');
  const [statusFilter, setStatusFilter]           = useState('all');
  const [jobFilter, setJobFilter]                 = useState('all');
  const [showFilters, setShowFilters]             = useState(false);
  const [previewData, setPreviewData]             = useState(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [applications, searchTerm, statusFilter, jobFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [appsRes, jobsRes] = await Promise.all([
        applicationService.getAllApplications({ currentUserId: currentUser.id }),
        jobsAPI.getAllJobs({ page: 1, limit: 100 }),
      ]);
      setApplications(appsRes?.data || []);
      setJobs(jobsRes.data?.data || []);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let f = applications;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(a =>
        a.candidateId?.firstName?.toLowerCase().includes(q) ||
        a.candidateId?.lastName?.toLowerCase().includes(q)  ||
        a.candidateId?.email?.toLowerCase().includes(q)     ||
        a.jobId?.title?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') f = f.filter(a => a.status === statusFilter);
    if (jobFilter   !== 'all') f = f.filter(a => a.jobId?._id === jobFilter);
    setFiltered(f);
  };

  const updateStatus = async (id, status) => {
    try {
      await applicationsAPI.updateApplicationStatus(id, status);
      setApplications(prev => prev.map(a => a._id === id ? { ...a, status } : a));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const openResume  = (app) => {
    if (!app.resume?.url) { toast.error('No resume available'); return; }
    const name = `${app.candidateId?.firstName || ''} ${app.candidateId?.lastName || ''}`.trim() || 'Candidate';
    setPreviewData({ resumeUrl: app.resume.url, filename: app.resume.filename || 'resume.pdf', candidateName: name });
  };

  const downloadResume = (app) => {
    if (!app.resume?.url) { toast.error('No resume available'); return; }
    window.open(app.resume.url, '_blank');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <>
      {/* Search + Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or job title…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FiFilter className="mr-2" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['all','pending','reviewing','shortlisted','interviewed','rejected','hired'].map(s => (
                    <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Position</label>
                <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Positions</option>
                  {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
                </select>
              </div>
            </div>
          )}

          <span className="text-sm text-gray-500">{filteredApplications.length} applications found</span>
        </div>
      </div>

      {/* Cards */}
      {filteredApplications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FiUser className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No applications found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' || jobFilter !== 'all'
              ? 'Try adjusting your search criteria.'
              : 'Applications will appear here once candidates start applying.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app._id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-lg font-semibold text-gray-700">
                    {app.candidateId?.firstName?.charAt(0) || 'C'}
                    {app.candidateId?.lastName?.charAt(0)  || ''}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {app.candidateId?.firstName} {app.candidateId?.lastName}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      <span className="ml-1 capitalize">{app.status}</span>
                    </span>
                  </div>

                  <p className="text-blue-600 font-medium mb-2">Applied for: {app.jobId?.title}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                    <span className="flex items-center"><FiMail className="mr-1" size={14} />{app.candidateId?.email}</span>
                    {app.candidateId?.phoneNumber && (
                      <span className="flex items-center"><FiPhone className="mr-1" size={14} />{app.candidateId.phoneNumber}</span>
                    )}
                    <span className="flex items-center"><FiCalendar className="mr-1" size={14} />Applied {fmtDate(app.createdAt)}</span>
                  </div>

                  {app.coverLetter && (
                    <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                      <strong>Cover Letter:</strong> {app.coverLetter}
                    </p>
                  )}

                  {app.candidateId?.profileData?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {app.candidateId.profileData.skills.slice(0, 5).map((sk, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{sk}</span>
                      ))}
                      {app.candidateId.profileData.skills.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{app.candidateId.profileData.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Navigates to child route /:id */}
                    <Link to={`${app._id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <FiEye className="mr-1" size={14} /> View Details
                    </Link>
                    {app.resume?.url && (
                      <>
                        <button onClick={() => openResume(app)}
                          className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <FiFileText className="mr-1" size={14} /> View Resume
                        </button>
                        <button onClick={() => downloadResume(app)}
                          className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <FiDownload className="mr-1" size={14} /> Download
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

      {previewData && (
        <ResumeModal {...previewData} onClose={() => setPreviewData(null)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 – Application Management  (was ApplicationManagementPage)
// ─────────────────────────────────────────────────────────────────────────────

function ApplicationManagementTab() {
  const { currentUser } = useAuth();
  const [applications, setApplications]           = useState([]);
  const [jobs, setJobs]                           = useState([]);
  const [stats, setStats]                         = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [filters, setFilters]                     = useState({});
  const [searchTerm, setSearchTerm]               = useState('');
  const [selectedApplications, setSelected]       = useState([]);
  const [currentPage, setCurrentPage]             = useState(1);
  const [totalPages, setTotalPages]               = useState(1);
  const [isSchedulerOpen, setSchedulerOpen]       = useState(false);
  const [selectedApp, setSelectedApp]             = useState(null);

  useEffect(() => { fetchApplications(); fetchStats(); }, [filters, searchTerm, currentPage]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await applicationService.getAllApplications({
        ...filters, search: searchTerm, page: currentPage, limit: 20,
      });
      setApplications(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await applicationService.getApplicationStats();
      setStats(res.data);
    } catch { /* silent */ }
  };

  const handleBulkAction = async (ids, status, notes) => {
    await applicationService.bulkUpdateStatus(ids, status, notes);
    await fetchApplications();
    await fetchStats();
  };

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelected(selectedApplications.length === applications.length ? [] : applications.map(a => a._id));

  const handleScheduleInterview = async (data) => {
    try {
      await interviewService.scheduleInterview(data);
      fetchApplications();
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to schedule interview');
    }
  };

  return (
    <>
      <ApplicationStatistics stats={stats} />

      <ApplicationFilters
        filters={filters}
        onFilterChange={setFilters}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        jobs={jobs}
      />

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={toggleSelectAll}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900">
              {selectedApplications.length === applications.length
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />}
              <span>Select All</span>
            </button>
            {selectedApplications.length > 0 && (
              <span className="text-sm text-gray-600">{selectedApplications.length} selected</span>
            )}
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Download className="w-4 h-4" /><span>Export</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            <p className="text-gray-600 mt-2">Loading applications…</p>
          </div>
        ) : applications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Candidate','Job','Status','Applied','Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app._id}
                    className={`hover:bg-gray-50 ${selectedApplications.includes(app._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button onClick={() => toggleSelect(app._id)} className="mr-3">
                          {selectedApplications.includes(app._id)
                            ? <CheckSquare className="w-4 h-4 text-blue-600" />
                            : <Square className="w-4 h-4 text-gray-400" />}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.candidateId?.fullName || 'Unknown Candidate'}
                          </div>
                          <div className="text-sm text-gray-500">{app.candidateId?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.jobId?.title || 'Unknown Job'}</div>
                      <div className="text-sm text-gray-500">{app.jobId?.company?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* Navigates to child route /:id */}
                        <Link to={`${app._id}`} className="text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="text-green-600 hover:text-green-900">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelectedApp(app); setSchedulerOpen(true); }}
                          className="text-purple-600 hover:text-purple-900">
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
          <div className="p-8 text-center text-gray-500">No applications found.</div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                Previous
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <BulkActionsPanel
        selectedApplications={selectedApplications}
        onBulkAction={handleBulkAction}
        onClearSelection={() => setSelected([])}
      />

      {isSchedulerOpen && selectedApp && (
        <InterviewScheduler
          application={selectedApp}
          onSchedule={handleScheduleInterview}
          onClose={() => { setSelectedApp(null); setSchedulerOpen(false); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CandidateEvaluationPage  (was standalone page — now a child route)
// ─────────────────────────────────────────────────────────────────────────────

function CandidateEvaluationPage() {
  const { id: applicationId } = useParams();
  const { currentUser }       = useAuth();
  const navigate              = useNavigate();

  const [loading, setLoading]               = useState(true);
  const [application, setApplication]       = useState(null);
  const [interviewData, setInterviewData]   = useState(null);
  const [proctoringEvents, setProcEvents]   = useState([]);
  const [selectedStatus, setStatus]         = useState('');
  const [notes, setNotes]                   = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const appRes  = await applicationService.getApplicationById(applicationId);
        const appData = appRes.data || appRes;
        setApplication(appData);
        setStatus(appData.status || '');

        try {
          const iRes       = await interviewService.getInterviewsByApplication(applicationId);
          const interviews = iRes.data || iRes.interviews || [];
          if (interviews.length > 0) {
            setInterviewData(interviews[0]);
            if (interviews[0].technicalMetadata?.proctoringEvents)
              setProcEvents(interviews[0].technicalMetadata.proctoringEvents);
          }
        } catch { /* no interview yet */ }
      } catch {
        toast.error('Failed to load candidate evaluation data');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId]);

  const updateStatus = async () => {
    try {
      await applicationService.updateApplicationStatus(applicationId, selectedStatus, notes);
      toast.success('Status updated successfully');
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );

  if (!application) return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <p className="text-red-700">Candidate evaluation data not found.</p>
    </div>
  );

  const candidate  = application.candidateId || application.candidate || {};
  const job        = application.jobId        || application.job        || {};
  const evaluation = interviewData?.evaluation;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Back to Applications
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold">{candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown Candidate'}</h2>
          <p className="text-gray-500">Candidate for {job.title || 'Unknown Position'}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          {application.resume?.url && (
            <a href={application.resume.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <FiDownload className="mr-2" /> Download Resume
            </a>
          )}
          {job._id && (
            <Link to={`/recruiter/jobs/${job._id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              View Job Post
            </Link>
          )}
        </div>
      </div>

      {/* Info + Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4">Candidate Information</h3>
          <div className="space-y-3">
            <div className="flex items-center"><FiUser className="text-gray-400 mr-3" /><span className="text-gray-500 mr-2">Name:</span><span>{candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'N/A'}</span></div>
            <div className="flex items-center"><FiMail className="text-gray-400 mr-3" /><span className="text-gray-500 mr-2">Email:</span><span>{candidate.email || 'N/A'}</span></div>
            {(candidate.phone || candidate.phoneNumber) && (
              <div className="flex items-center"><FiPhone className="text-gray-400 mr-3" /><span className="text-gray-500 mr-2">Phone:</span><span>{candidate.phone || candidate.phoneNumber}</span></div>
            )}
            <div className="flex items-center"><FiClock className="text-gray-400 mr-3" /><span className="text-gray-500 mr-2">Applied:</span><span>{application.createdAt ? fmtDate(application.createdAt) : 'N/A'}</span></div>
          </div>
          {application.coverLetter && (
            <div className="mt-6">
              <h4 className="text-md font-medium mb-2 flex items-center"><FiFileText className="mr-2" /> Cover Letter</h4>
              <div className="bg-gray-50 p-4 rounded-md text-sm max-h-40 overflow-y-auto">{application.coverLetter}</div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4">Application Status</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={selectedStatus} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['pending','reviewing','interview_scheduled','interview_completed','hired','rejected'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add notes about this candidate…" />
            </div>
            <button onClick={updateStatus}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Update Status
            </button>
          </div>
        </div>
      </div>

      {/* Interview Results */}
      {interviewData && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4">AI Interview Evaluation</h3>

          {evaluation?.overallScore != null && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-center">
              <div>
                <p className="font-medium">Overall Score</p>
                <p className="text-gray-500 text-sm">Based on AI analysis</p>
              </div>
              <span className={`text-2xl font-bold ${getEvalScoreColor(evaluation.overallScore)}`}>
                {evaluation.overallScore}/100
              </span>
            </div>
          )}

          {evaluation?.scores?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Category Scores</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evaluation.scores.map((sc, i) => (
                  <div key={i} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{sc.category}</span>
                      <span className={`font-bold ${getEvalScoreColor(sc.score)}`}>{sc.score}/100</span>
                    </div>
                    {sc.feedback && <p className="text-xs text-gray-500 mt-1">{sc.feedback}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {interviewData.responses?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Interview Responses</h4>
              <div className="space-y-4">
                {interviewData.responses.map((resp, i) => {
                  const q = interviewData.questions?.find(qq => qq.id === resp.questionId);
                  return (
                    <div key={i} className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="bg-gray-50 p-3 font-medium text-sm">
                        Q{i + 1}: {q?.question || `Question ${resp.questionId}`}
                      </div>
                      <div className="p-3 space-y-2">
                        {resp.audioUrl && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Audio Response:</span>
                            <audio src={resp.audioUrl} controls className="h-8" />
                          </div>
                        )}
                        {resp.transcription && <p className="text-sm">{resp.transcription}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {evaluation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {evaluation.strengths?.length > 0 && (
                <div className="border border-green-200 bg-green-50 rounded-md p-3">
                  <h5 className="font-medium text-green-800 mb-2">Strengths</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start"><FiCheck className="mr-2 mt-0.5 flex-shrink-0" />{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.improvements?.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-md p-3">
                  <h5 className="font-medium text-amber-800 mb-2">Areas for Improvement</h5>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {evaluation.improvements.map((s, i) => (
                      <li key={i} className="flex items-start"><FiAlertTriangle className="mr-2 mt-0.5 flex-shrink-0" />{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="font-medium mb-3">Proctoring Analysis</h4>
            {proctoringEvents.length > 0 ? (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-50 p-3 font-medium flex justify-between">
                  <span>Potential Issues Detected</span>
                  <span className="text-red-600">{proctoringEvents.length} violation(s)</span>
                </div>
                <div className="divide-y divide-gray-200">
                  {proctoringEvents.map((ev, i) => (
                    <div key={i} className="p-3 flex items-start">
                      <FiAlertTriangle className="text-amber-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p>{ev.message || ev.description || 'Violation detected'}</p>
                        {ev.timestamp && <p className="text-xs text-gray-500">{new Date(ev.timestamp).toLocaleString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-green-200 bg-green-50 rounded-md p-3 flex items-start">
                <FiCheck className="text-green-500 mr-3 mt-1" />
                <div>
                  <p className="font-medium text-green-800">No violations detected</p>
                  <p className="text-sm text-green-700">The candidate completed the interview without any proctoring violations.</p>
                </div>
              </div>
            )}
          </div>

          {evaluation?.recommendation && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">AI Recommendation</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  evaluation.recommendation === 'hire'  ? 'bg-green-100  text-green-800'  :
                  evaluation.recommendation === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {evaluation.recommendation.charAt(0).toUpperCase() + evaluation.recommendation.slice(1)}
                </span>
                {evaluation.summary && <p className="mt-3 text-sm text-gray-700">{evaluation.summary}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Candidate List',          path: '',       end: true  },
  { label: 'Application Management',  path: 'manage', end: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// RecruiterApplicationsHub  — the ONE exported component
// ─────────────────────────────────────────────────────────────────────────────

export default function RecruiterApplicationsHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if we are inside a detail view (child /:id route)
  // so we can hide the tabs while viewing a specific candidate
  const segments       = location.pathname.split('/').filter(Boolean);
  const lastSegment    = segments[segments.length - 1];
  const isDetailView   = lastSegment !== 'applications' && lastSegment !== 'manage';

  // Active tab detection
  const isManageTab    = location.pathname.endsWith('/manage');
  const activeTab      = isManageTab ? 'manage' : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page heading */}
        {!isDetailView && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Applications Hub</h1>
            <p className="text-gray-600 mt-1">Manage every stage of your candidate pipeline.</p>
          </div>
        )}

        {/* Tab bar — hidden on detail view */}
        {!isDetailView && (
          <div className="flex border-b border-gray-200 mb-6">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path === '' ? '.' : tab.path)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/*
          Outlet renders whichever child route is currently active:
            index  → <CandidateListTab />
            manage → <ApplicationManagementTab />
            :id    → <CandidateEvaluationPage />
        */}
        <Outlet />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Named exports so the router can reference child components directly
// ─────────────────────────────────────────────────────────────────────────────

export { CandidateListTab, ApplicationManagementTab, CandidateEvaluationPage };