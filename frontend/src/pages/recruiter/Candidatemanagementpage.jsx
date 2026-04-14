import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import applicationService from '../../services/applicationService';
import { jobsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:             { label: 'Pending',             dot: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  reviewing:           { label: 'Reviewing',           dot: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  shortlisted:         { label: 'Shortlisted',         dot: '#10b981', bg: '#d1fae5', text: '#065f46' },
  interviewed:         { label: 'Interviewed',         dot: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6' },
  interview_scheduled: { label: 'Int. Scheduled',      dot: '#06b6d4', bg: '#cffafe', text: '#155e75' },
  interview_completed: { label: 'Int. Completed',      dot: '#6366f1', bg: '#e0e7ff', text: '#3730a3' },
  hired:               { label: 'Hired',               dot: '#059669', bg: '#d1fae5', text: '#064e3b' },
  rejected:            { label: 'Rejected',            dot: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
};

const initials = (first = '', last = '') =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';

const avatarColor = (name = '') => {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#06b6d4'];
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: '#9ca3af', bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{ background: cfg.bg, color: cfg.text }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide">
      <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
      {cfg.label}
    </span>
  );
}

// ─── CandidateRow ─────────────────────────────────────────────────────────────
// Uses the SAME grid-cols-[2fr_2fr_1fr_auto] as the header so columns align.
function CandidateRow({ app, onClick }) {
  const cand = app.candidateId || {};
  const job  = app.jobId       || {};

  // Support both firstName/lastName and name/fullName from different API shapes
  const firstName = cand.firstName || '';
  const lastName  = cand.lastName  || '';
  const name = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : cand.name || cand.fullName || 'Unknown';

  const photo = cand.profileData?.profilePicture || cand.profilePicture || null;
  const bg    = avatarColor(name);

  return (
    <div
      onClick={() => onClick(app._id)}
      className="group grid grid-cols-[2fr_2fr_1fr_auto] gap-4 items-center px-6 py-3.5 cursor-pointer transition-all duration-150 hover:bg-indigo-50/60 border-b border-gray-100 last:border-0"
    >
      {/* ── Col 1: Avatar + name + email + status badge ── */}
      <div className="flex items-center gap-3 min-w-0">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-sm border border-white"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
            style={{ background: bg }}
          >
            {initials(firstName, lastName) || name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
              {name}
            </span>
            <StatusBadge status={app.status} />
          </div>
          <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 truncate">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {cand.email || '—'}
          </span>
        </div>
      </div>

      {/* ── Col 2: Job title + skills ── */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-700 truncate">{job.title || '—'}</p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {(cand.profileData?.skills || []).slice(0, 3).map((sk, i) => (
            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
              {sk}
            </span>
          ))}
          {(cand.profileData?.skills || []).length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
              +{cand.profileData.skills.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* ── Col 3: Applied date ── */}
      <div className="text-xs text-gray-500 whitespace-nowrap">
        {fmtDate(app.createdAt)}
      </div>

      {/* ── Col 4: Chevron ── */}
      <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CandidateManagementPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [jobFilter, setJobFilter]       = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]                 = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [appRes, jobRes] = await Promise.all([
          applicationService.getAllApplications({ currentUserId: currentUser?.id }),
          jobsAPI.getAllJobs({ page: 1, limit: 100 }),
        ]);
        setApplications(appRes?.data || []);
        setJobs(jobRes.data?.data || []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load candidates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useCallback(() => {
    let list = [...applications];
    const q = search.toLowerCase();
    if (q) list = list.filter(a => {
      const c = a.candidateId || {};
      return (
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (a.jobId?.title || '').toLowerCase().includes(q)
      );
    });
    if (jobFilter    !== 'all') list = list.filter(a => a.jobId?._id === jobFilter);
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    return list;
  }, [applications, search, jobFilter, statusFilter])();

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Group stats
  const stats = Object.entries(
    applications.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {})
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .cm-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="cm-root max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Candidates</h1>
          <p className="text-gray-500 mt-1 text-sm">All applications across your job postings.</p>
        </div>

        {/* Stats strip */}
        {!loading && stats.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-xs text-sm font-medium text-gray-700">
              <span className="text-lg font-bold text-indigo-600">{applications.length}</span> Total
            </div>
            {stats.map(([status, count]) => {
              const cfg = STATUS_CONFIG[status];
              if (!cfg) return null;
              return (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(s => s === status ? 'all' : status); setPage(1); }}
                  style={{ borderColor: statusFilter === status ? cfg.dot : 'transparent', background: statusFilter === status ? cfg.bg : '#fff' }}
                  className="flex items-center gap-2 px-4 py-2 border-2 rounded-xl shadow-xs text-sm font-medium transition-all"
                >
                  <span style={{ color: cfg.dot }} className="font-bold">{count}</span>
                  <span style={{ color: cfg.text }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or job title..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* Job filter */}
          <select
            value={jobFilter}
            onChange={e => { setJobFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[170px]"
          >
            <option value="all">All Positions</option>
            {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[150px]"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800">{filtered.length}</span> candidate{filtered.length !== 1 ? 's' : ''}
          </p>
          {(search || jobFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setJobFilter('all'); setStatusFilter('all'); setPage(1); }}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading candidates…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">No candidates found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Candidate</span>
              <span>Position</span>
              <span>Applied</span>
              <span />
            </div>

            {paginated.map(app => (
              <CandidateRow
                key={app._id}
                app={app}
                onClick={(id) => navigate(`/recruiter/candidates/${id}`)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}