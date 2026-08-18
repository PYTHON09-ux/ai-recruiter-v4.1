import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import applicationService from '../../services/applicationService';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    dot: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    text: '#d97706',
    border: 'rgba(245,158,11,0.2)',
    description: 'Your application is being reviewed by the recruiting team.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  reviewing: {
    label: 'Reviewing',
    dot: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    text: '#2563eb',
    border: 'rgba(59,130,246,0.2)',
    description: 'Your application is actively being reviewed. Next steps will be communicated soon.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  },
  reviewed: {
    label: 'Reviewed',
    dot: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    text: '#2563eb',
    border: 'rgba(59,130,246,0.2)',
    description: 'Your application has been reviewed. Next steps will be communicated soon.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  },
  shortlisted: {
    label: 'Shortlisted',
    dot: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    text: '#059669',
    border: 'rgba(16,185,129,0.2)',
    description: 'You have been shortlisted. The team will be in touch shortly.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    dot: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    text: '#7c3aed',
    border: 'rgba(139,92,246,0.2)',
    description: 'An AI-powered interview has been scheduled for you. Complete it at your own pace.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  interview_completed: {
    label: 'Interview Done',
    dot: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    text: '#4f46e5',
    border: 'rgba(99,102,241,0.2)',
    description: 'You have completed the interview. Results will be shared with you soon.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  interviewed: {
    label: 'Interviewed',
    dot: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    text: '#4f46e5',
    border: 'rgba(99,102,241,0.2)',
    description: 'You have completed the interview. Results will be shared with you soon.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  hired: {
    label: 'Hired',
    dot: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    text: '#047857',
    border: 'rgba(5,150,105,0.2)',
    description: 'Congratulations! You have been selected for this position. Welcome aboard!',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  },
  rejected: {
    label: 'Not Selected',
    dot: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    text: '#dc2626',
    border: 'rgba(239,68,68,0.2)',
    description: 'Thank you for applying. Unfortunately, the team decided to move forward with other candidates.',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  },
};

const INTERVIEW_DONE_STATUSES = new Set([
  'interview_completed',
  'interviewed',
  'hired',
  'rejected',
]);

const PIPELINE = [
  'pending',
  'reviewing',
  'shortlisted',
  'interview_scheduled',
  'interview_completed',
  'hired',
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const companyInitial = (app) =>
  app.jobId?.company?.name?.charAt(0)?.toUpperCase() ||
  app.jobId?.title?.charAt(0)?.toUpperCase() || 'J';

const companyColor = (name = '') => {
  const cs = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#0ea5e9', '#ef4444'];
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    dot: '#9ca3af',
    bg: 'rgb(var(--muted))',
    text: 'rgb(var(--muted-foreground))',
    border: 'rgb(var(--border))',
  };
  return (
    <span
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0"
    >
      <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full inline-block shrink-0" />
      {cfg.label}
    </span>
  );
}

function PipelineBar({ status }) {
  if (status === 'rejected') return null;
  const idx = PIPELINE.indexOf(status);
  const current = idx === -1 ? 0 : idx;
  return (
    <div className="flex items-center mt-3">
      {PIPELINE.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        const cfg = STATUS_CONFIG[step];
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div
              title={cfg?.label}
              style={{
                background: done ? cfg?.dot : 'rgb(var(--border))',
                boxShadow: active ? `0 0 0 3px ${cfg?.bg}` : 'none',
                width: 10,
                height: 10,
                borderRadius: '50%',
                flexShrink: 0,
                transition: 'all 0.3s',
              }}
            />
            {i < PIPELINE.length - 1 && (
              <div
                style={{
                  background: i < current ? cfg?.dot : 'rgb(var(--border))',
                  flex: 1,
                  height: 2,
                  margin: '0 2px',
                  transition: 'all 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AppCard({ application }) {
  const [coverExpanded, setCoverExpanded] = useState(false);
  const status = application.status || 'pending';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const job = application.jobId || {};
  const co = job.company?.name || '';
  const color = companyColor(co || job.title || '');

  const canStartInterview =
    status === 'interview_scheduled' &&
    !INTERVIEW_DONE_STATUSES.has(status) &&
    application.interviewLink?.token &&
    !application.interviewLink?.usedAt;

  const interviewIsDone =
    (status === 'interview_completed' || status === 'interviewed') &&
    application.interviewLink?.token;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow duration-200 hover:shadow-md"
      style={{
        backgroundColor: 'rgb(var(--card))',
        border: '1px solid rgb(var(--border))',
      }}
    >
      <div style={{ height: 3, background: cfg.dot }} />

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
            style={{ background: color }}
          >
            {companyInitial(application)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h3
                  className="text-sm font-bold leading-snug truncate"
                  style={{ color: 'rgb(var(--foreground))' }}
                >
                  {job.title || 'Unknown Position'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted-foreground))' }}>
                  {co || 'Company'}{job.location ? ` · ${job.location}` : ''}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>

            <p
              className="text-xs mt-1.5 flex items-center gap-1"
              style={{ color: 'rgb(var(--muted-foreground))' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Applied {fmtDate(application.createdAt)}
            </p>

            <PipelineBar status={status} />
          </div>
        </div>

        {/* Status description */}
        <div
          className="mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs"
          style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
        >
          <span className="mt-0.5 shrink-0">{cfg.icon}</span>
          <p className="font-medium leading-relaxed">{cfg.description}</p>
        </div>

        {/* Start Interview CTA — only when scheduled and not yet used */}
        {canStartInterview && (
          <div
            className="mt-4 flex items-center justify-between gap-4 p-4 rounded-xl"
            style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                Your interview is ready
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted-foreground))' }}>
                Complete the AI-powered interview at your own pace.
              </p>
            </div>
            <Link
              to={`/interview/magic/${application.interviewLink.token}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-lg transition shrink-0"
              style={{ backgroundColor: 'rgb(var(--primary))' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Interview
            </Link>
          </div>
        )}

        {/* Interview completed notice — shown instead of button */}
        {interviewIsDone && (
          <div
            className="mt-4 flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.18)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
            >
              <svg
                className="w-4 h-4"
                style={{ color: '#22c55e' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                Interview completed
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted-foreground))' }}>
                Your responses have been recorded and are under review.
              </p>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div
          className="mt-4 flex items-center flex-wrap gap-2 pt-4"
          style={{ borderTop: '1px solid rgb(var(--border))' }}
        >
          {job._id && (
            <Link
              to={`/candidate/jobs/${job._id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
              style={{
                border: '1px solid rgb(var(--border))',
                color: 'rgb(var(--foreground))',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgb(var(--muted))'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Job
            </Link>
          )}

          {application.resume?.url && (
            <a
              href={application.resume.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
              style={{
                border: '1px solid rgb(var(--border))',
                color: 'rgb(var(--foreground))',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgb(var(--muted))'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Resume
            </a>
          )}

          {application.coverLetter && (
            <button
              onClick={() => setCoverExpanded(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
              style={{
                border: '1px solid rgb(var(--border))',
                color: 'rgb(var(--foreground))',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgb(var(--muted))'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {coverExpanded ? 'Hide Letter' : 'Cover Letter'}
            </button>
          )}
        </div>

        {/* Cover letter expandable */}
        {coverExpanded && application.coverLetter && (
          <div
            className="mt-3 p-4 rounded-xl"
            style={{
              backgroundColor: 'rgb(var(--muted))',
              border: '1px solid rgb(var(--border))',
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'rgb(var(--muted-foreground))' }}
            >
              Cover Letter
            </p>
            <p
              className="text-sm leading-relaxed whitespace-pre-line"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              {application.coverLetter}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
      style={{
        border: `1px solid ${active ? 'rgb(var(--primary))' : 'rgb(var(--border))'}`,
        backgroundColor: active ? 'rgb(var(--primary))' : 'transparent',
        color: active ? 'rgb(var(--primary-foreground))' : 'rgb(var(--muted-foreground))',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'rgb(var(--primary))';
          e.currentTarget.style.color = 'rgb(var(--foreground))';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'rgb(var(--border))';
          e.currentTarget.style.color = 'rgb(var(--muted-foreground))';
        }
      }}
    >
      {children}
      {count != null && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={{
            backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'rgb(var(--muted))',
            color: active ? 'rgb(var(--primary-foreground))' : 'rgb(var(--muted-foreground))',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function ApplicationStatusPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const filtered = applications.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'interview_completed') {
      return a.status === 'interview_completed' || a.status === 'interviewed';
    }
    return a.status === filter;
  });

  const FILTERS = [
    { key: 'all',                 label: 'All' },
    { key: 'pending',             label: 'Pending' },
    { key: 'reviewing',           label: 'Reviewing' },
    { key: 'shortlisted',         label: 'Shortlisted' },
    { key: 'interview_scheduled', label: 'Interview Ready' },
    { key: 'interview_completed', label: 'Interview Done' },
    { key: 'hired',               label: 'Hired' },
    { key: 'rejected',            label: 'Rejected' },
  ];

  const stats = [
    {
      label: 'Applied',
      value: applications.length,
      color: 'rgb(var(--primary))',
    },
    {
      label: 'In Progress',
      value: applications.filter(
        a => !['hired', 'rejected', 'interview_completed', 'interviewed'].includes(a.status)
      ).length,
      color: '#f59e0b',
    },
    {
      label: 'Interviews',
      value: applications.filter(
        a => ['interview_scheduled', 'interview_completed', 'interviewed'].includes(a.status)
      ).length,
      color: '#8b5cf6',
    },
    {
      label: 'Offers',
      value: applications.filter(a => a.status === 'hired').length,
      color: '#22c55e',
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--background))' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--foreground))' }}
          >
            My Applications
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted-foreground))' }}>
            Track every application and upcoming interview in one place.
          </p>
        </div>

        {/* Stats strip */}
        {!isLoading && applications.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {stats.map(s => (
              <div
                key={s.label}
                className="rounded-xl px-4 py-4 flex flex-col gap-1"
                style={{
                  backgroundColor: 'rgb(var(--card))',
                  border: '1px solid rgb(var(--border))',
                }}
              >
                <span className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'rgb(var(--muted-foreground))' }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filter pills */}
        {!isLoading && applications.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTERS.map(f => {
              const count =
                f.key === 'all'
                  ? applications.length
                  : f.key === 'interview_completed'
                  ? (countByStatus('interview_completed') + countByStatus('interviewed')) || null
                  : countByStatus(f.key) || null;
              return (
                <FilterPill
                  key={f.key}
                  active={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  count={count}
                >
                  {f.label}
                </FilterPill>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: 'rgb(var(--border))',
                borderTopColor: 'rgb(var(--primary))',
              }}
            />
            <p className="text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>
              Loading your applications…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div
            className="rounded-2xl p-16 text-center"
            style={{
              backgroundColor: 'rgb(var(--card))',
              border: '1px solid rgb(var(--border))',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgb(var(--muted))' }}
            >
              <svg
                className="w-7 h-7"
                style={{ color: 'rgb(var(--muted-foreground))' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: 'rgb(var(--foreground))' }}>
              {filter === 'all'
                ? 'No applications yet'
                : `No ${STATUS_CONFIG[filter]?.label || filter} applications`}
            </h3>
            <p
              className="text-sm mb-6 max-w-xs mx-auto"
              style={{ color: 'rgb(var(--muted-foreground))' }}
            >
              {filter === 'all'
                ? 'Start applying to jobs and your applications will appear here.'
                : 'Try a different filter to see other applications.'}
            </p>
            {filter === 'all' ? (
              <Link
                to="/candidate/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition"
                style={{
                  backgroundColor: 'rgb(var(--primary))',
                  color: 'rgb(var(--primary-foreground))',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Browse Jobs
              </Link>
            ) : (
              <button
                onClick={() => setFilter('all')}
                className="text-sm font-semibold hover:underline"
                style={{ color: 'rgb(var(--primary))' }}
              >
                View all applications
              </button>
            )}
          </div>
        ) : (
          /* Application cards */
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