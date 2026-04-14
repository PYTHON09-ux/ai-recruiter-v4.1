import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import applicationService from '../../services/applicationService';
import toast from 'react-hot-toast';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    dot: '#f59e0b',
    bg: '#fef3c7',
    text: '#92400e',
    description: 'Your application is being reviewed by the recruiting team.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  reviewing: {
    label: 'Reviewing',
    dot: '#3b82f6',
    bg: '#dbeafe',
    text: '#1e40af',
    description: 'Your application has been reviewed. Next steps will be communicated soon.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  reviewed: {
    label: 'Reviewed',
    dot: '#3b82f6',
    bg: '#dbeafe',
    text: '#1e40af',
    description: 'Your application has been reviewed. Next steps will be communicated soon.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  shortlisted: {
    label: 'Shortlisted',
    dot: '#10b981',
    bg: '#d1fae5',
    text: '#065f46',
    description: 'Great news — you have been shortlisted! The team will be in touch shortly.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    dot: '#8b5cf6',
    bg: '#ede9fe',
    text: '#5b21b6',
    description: 'Congratulations! An AI-powered interview has been scheduled for you.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  interview_completed: {
    label: 'Interview Done',
    dot: '#6366f1',
    bg: '#e0e7ff',
    text: '#3730a3',
    description: 'You have completed the interview. Results will be shared with you soon.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  interviewed: {
    label: 'Interviewed',
    dot: '#6366f1',
    bg: '#e0e7ff',
    text: '#3730a3',
    description: 'You have completed the interview. Results will be shared with you soon.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  hired: {
    label: 'Hired 🎉',
    dot: '#059669',
    bg: '#d1fae5',
    text: '#064e3b',
    description: 'Congratulations! You have been selected for this position. Welcome aboard!',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  rejected: {
    label: 'Not Selected',
    dot: '#ef4444',
    bg: '#fee2e2',
    text: '#991b1b',
    description: 'Thank you for applying. Unfortunately, the team decided to move forward with other candidates.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const companyInitial = (app) =>
  app.jobId?.company?.name?.charAt(0)?.toUpperCase() ||
  app.jobId?.title?.charAt(0)?.toUpperCase() || 'J';

const companyColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#0ea5e9','#ef4444'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: '#9ca3af', bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      style={{ background: cfg.bg, color: cfg.text }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide shrink-0"
    >
      <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full inline-block shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── Progress Step ────────────────────────────────────────────────────────────
const PIPELINE = ['pending', 'reviewing', 'shortlisted', 'interview_scheduled', 'interview_completed', 'hired'];

function PipelineBar({ status }) {
  if (status === 'rejected') return null;
  const idx = PIPELINE.indexOf(status);
  const current = idx === -1 ? 0 : idx;

  return (
    <div className="flex items-center gap-0 mt-3">
      {PIPELINE.map((step, i) => {
        const done    = i <= current;
        const active  = i === current;
        const cfg     = STATUS_CONFIG[step];
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div
              title={cfg?.label}
              style={{
                background: done ? cfg?.dot : '#e5e7eb',
                boxShadow: active ? `0 0 0 3px ${cfg?.bg}` : 'none',
              }}
              className="w-3 h-3 rounded-full shrink-0 transition-all duration-300"
            />
            {i < PIPELINE.length - 1 && (
              <div
                style={{ background: i < current ? '#a5b4fc' : '#e5e7eb' }}
                className="flex-1 h-0.5 mx-0.5 transition-all duration-300"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────
function AppCard({ application }) {
  const [coverExpanded, setCoverExpanded] = useState(false);
  const status = application.status || 'pending';
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const job    = application.jobId || {};
  const co     = job.company?.name || '';
  const color  = companyColor(co || job.title || '');

  const hasInterviewLink =
    status === 'interview_scheduled' &&
    application.interviewLink?.token;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Accent bar — colour matches status */}
      <div className="h-1" style={{ background: cfg.dot }} />

      <div className="p-6">
        {/* ── Top row ── */}
        <div className="flex items-start gap-4">
          {/* Company logo / initial */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0"
            style={{ background: color }}
          >
            {companyInitial(application)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 leading-snug truncate">
                  {job.title || 'Unknown Position'}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {co || 'Company'}{job.location ? ` · ${job.location}` : ''}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>

            {/* Applied date */}
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Applied {fmtDate(application.createdAt)}
            </p>

            {/* Pipeline progress */}
            <PipelineBar status={status} />
          </div>
        </div>

        {/* ── Status description ── */}
        <div
          className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          <span className="mt-0.5 shrink-0" style={{ color: cfg.dot }}>{cfg.icon}</span>
          <p className="font-medium leading-snug">{cfg.description}</p>
        </div>

        {/* ── Interview CTA ── */}
        {hasInterviewLink && (
          <div className="mt-4 flex items-center justify-between gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div>
              <p className="text-sm font-bold text-indigo-800">Your interview is ready</p>
              <p className="text-xs text-indigo-600 mt-0.5">Complete the AI-powered interview at your own pace.</p>
            </div>
            <Link
              to={`/interview/magic/${application.interviewLink.token}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shrink-0 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Interview
            </Link>
          </div>
        )}

        {/* ── Bottom row: actions ── */}
        <div className="mt-4 flex items-center flex-wrap gap-2 pt-4 border-t border-gray-100">
          {/* View Job */}
          {job._id && (
            <Link
              to={`/candidate/jobs/${job._id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Job
            </Link>
          )}

          {/* Resume download */}
          {application.resume?.url && (
            <a
              href={application.resume.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Resume
            </a>
          )}

          {/* Cover letter toggle */}
          {application.coverLetter && (
            <button
              onClick={() => setCoverExpanded(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {coverExpanded ? 'Hide' : 'Cover Letter'}
            </button>
          )}
        </div>

        {/* Cover letter expandable */}
        {coverExpanded && application.coverLetter && (
          <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cover Letter</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {application.coverLetter}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
      }`}
    >
      {children}
      {count != null && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApplicationStatusPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [filter,       setFilter]       = useState('all');

  useEffect(() => { loadApplications(); }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await applicationService.getAllApplications();
      setApplications(response.data || response || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast.error('Failed to load your applications');
    } finally {
      setIsLoading(false);
    }
  };

  const countByStatus = (s) => applications.filter(a => a.status === s).length;

  const filtered = applications.filter(a => filter === 'all' || a.status === filter);

  const FILTERS = [
    { key: 'all',                  label: 'All' },
    { key: 'pending',              label: 'Pending' },
    { key: 'reviewing',            label: 'Reviewing' },
    { key: 'shortlisted',          label: 'Shortlisted' },
    { key: 'interview_scheduled',  label: 'Interview' },
    { key: 'interview_completed',  label: 'Completed' },
    { key: 'hired',                label: 'Hired' },
    { key: 'rejected',             label: 'Rejected' },
  ];

  // Quick stats for the hero strip
  const stats = [
    { label: 'Applied',    value: applications.length,                                  color: '#6366f1' },
    { label: 'In Progress', value: applications.filter(a => !['hired','rejected'].includes(a.status)).length, color: '#f59e0b' },
    { label: 'Interviews', value: applications.filter(a => ['interview_scheduled','interview_completed','interviewed'].includes(a.status)).length, color: '#8b5cf6' },
    { label: 'Offers',     value: applications.filter(a => a.status === 'hired').length, color: '#059669' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .asp-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="asp-root max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Applications</h1>
          <p className="text-gray-500 mt-1 text-sm">Track every application and upcoming interview in one place.</p>
        </div>

        {/* ── Stats strip ─────────────────────────────────────────────────────── */}
        {!isLoading && applications.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex flex-col gap-1 shadow-sm">
                <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter pills ────────────────────────────────────────────────────── */}
        {!isLoading && applications.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTERS.map(f => (
              <FilterPill
                key={f.key}
                active={filter === f.key}
                onClick={() => setFilter(f.key)}
                count={f.key === 'all' ? applications.length : (countByStatus(f.key) || null)}
              >
                {f.label}
              </FilterPill>
            ))}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading your applications…</p>
          </div>

        ) : filtered.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────────────────── */
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {filter === 'all' ? 'No applications yet' : `No ${STATUS_CONFIG[filter]?.label || filter} applications`}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              {filter === 'all'
                ? "Start applying to jobs and your applications will appear here."
                : "Try a different filter to see other applications."}
            </p>
            {filter === 'all' ? (
              <Link
                to="/candidate/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Browse Jobs
              </Link>
            ) : (
              <button
                onClick={() => setFilter('all')}
                className="text-sm text-indigo-600 font-semibold hover:underline"
              >
                View all applications
              </button>
            )}
          </div>

        ) : (
          /* ── Application cards ──────────────────────────────────────────────── */
          <div className="space-y-4">
            {filtered.map(app => (
              <AppCard key={app._id} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}