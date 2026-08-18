import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { jobsAPI, applicationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtType  = (t = '') => t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const fmtLevel = (l = '') => l.charAt(0).toUpperCase() + l.slice(1);
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const getDaysAgo = (date) => {
  const diff = Math.ceil(Math.abs(new Date() - new Date(date)) / 864e5);
  if (diff <= 1) return 'Today';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.ceil(diff / 7)}w ago`;
  return `${Math.ceil(diff / 30)}mo ago`;
};

const formatSalary = (r) => {
  if (!r?.min && !r?.max) return null;
  const fmt = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;
  return `${r.currency || 'USD'} ${fmt(r.min)}${r.max ? ` – ${fmt(r.max)}` : '+'} / yr`;
};

const companyColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#0ea5e9','#ef4444'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

const JOB_TYPE_COLORS = {
  'full-time':  { bg: 'rgba(59,130,246,0.12)',  text: 'rgb(var(--primary))' },
  'part-time':  { bg: 'rgba(245,158,11,0.12)',  text: '#d97706' },
  'contract':   { bg: 'rgba(139,92,246,0.12)',  text: '#7c3aed' },
  'internship': { bg: 'rgba(16,185,129,0.12)',  text: '#059669' },
  'remote':     { bg: 'rgba(14,165,233,0.12)',  text: '#0284c7' },
};
const LEVEL_COLORS = {
  'entry':  { bg: 'rgba(16,185,129,0.12)',  text: '#059669' },
  'mid':    { bg: 'rgba(59,130,246,0.12)',  text: 'rgb(var(--primary))' },
  'senior': { bg: 'rgba(139,92,246,0.12)', text: '#7c3aed' },
  'lead':   { bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
};

const isJobOpen = (job) => {
  if (!job) return false;
  if (job.status !== 'active') return false;
  if (!job.applicationDeadline) return true;
  return new Date(job.applicationDeadline) >= new Date();
};

const getClosedReason = (job) => {
  if (!job) return '';
  if (job.status === 'closed')   return 'This position has been filled.';
  if (job.status === 'paused')   return 'Applications are temporarily paused.';
  if (job.status === 'archived') return 'This position is no longer available.';
  if (job.status === 'draft')    return 'This position is not yet open.';
  if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date())
    return 'The application deadline has passed.';
  return 'This position is not accepting applications.';
};

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ children, style }) {
  return (
    <span style={style} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">
      {children}
    </span>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'rgb(var(--card))',
        color: 'rgb(var(--card-foreground))',
        border: '1px solid rgb(var(--border))',
      }}
    >
      <div
        className="flex items-center gap-2.5 px-6 py-4"
        style={{ borderBottom: '1px solid rgb(var(--border))' }}
      >
        <span style={{ color: 'rgb(var(--primary))' }}>{icon}</span>
        <h2 className="font-bold" style={{ color: 'rgb(var(--foreground))' }}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, href }) {
  return (
    <div
      className="flex items-start justify-between py-2 gap-4"
      style={{ borderBottom: '1px solid rgb(var(--border))' }}
    >
      <span className="text-sm shrink-0" style={{ color: 'rgb(var(--muted-foreground))' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-sm font-semibold hover:underline text-right break-all"
          style={{ color: 'rgb(var(--primary))' }}>
          {value}
        </a>
      ) : (
        <span className="text-sm font-semibold text-right" style={{ color: 'rgb(var(--foreground))' }}>
          {value || '—'}
        </span>
      )}
    </div>
  );
}

// ─── Application Modal ────────────────────────────────────────────────────────
function ApplicationModal({ job, onClose, onSuccess }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [isApplying,  setIsApplying]  = useState(false);
  const [resume, setResume] = useState({
    file: null, resumeUrl: null, originalName: null,
    uploading: false, uploaded: false, error: null, progress: 0,
  });

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

 const handleResumeChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setResume({ file, resumeUrl: null, originalName: null, uploading: true, uploaded: false, error: null, progress: 0 });
  try {
    const res = await applicationsAPI.uploadResume(file, (pe) => {
      setResume(prev => ({ ...prev, progress: Math.round((pe.loaded * 100) / pe.total) }));
    });

    // ✅ backend wraps response in res.data.data
    const payload = res.data?.data ?? res.data;

    setResume({
      file,
      resumeUrl:    payload.resumeUrl    || payload.url,
      originalName: payload.originalName || payload.filename || file.name,
      uploading: false, uploaded: true, error: null, progress: 100,
    });
    toast.success('Resume uploaded!');
  } catch (err) {
    setResume(prev => ({ ...prev, uploading: false, uploaded: false, progress: 0, error: err.response?.data?.message || 'Upload failed.' }));
    toast.error('Failed to upload resume');
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume.uploaded || !resume.resumeUrl) { toast.error('Please upload your resume first'); return; }
    setIsApplying(true);
    try {
      await applicationsAPI.createApplication({
        jobId:        job._id,
        coverLetter,
        resumeUrl:    resume.resumeUrl,
        originalName: resume.originalName,
      });
      toast.success('Application submitted!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl"
        style={{
          backgroundColor: 'rgb(var(--card))',
          color: 'rgb(var(--card-foreground))',
          border: '1px solid rgb(var(--border))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgb(var(--border))' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              Apply for this role
            </h2>
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'rgb(var(--primary))' }}>
              {job.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'rgb(var(--muted-foreground))' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--muted))';
              e.currentTarget.style.color = 'rgb(var(--foreground))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgb(var(--muted-foreground))';
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <form
          id="apply-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Resume */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'rgb(var(--foreground))' }}>
              Resume <span style={{ color: 'rgb(var(--destructive))' }}>*</span>
            </label>

            {!resume.uploaded ? (
              <label
                className="block rounded-xl p-6 text-center cursor-pointer transition-colors"
                style={{
                  border: `2px dashed ${resume.uploading ? 'rgb(var(--primary))' : 'rgb(var(--border))'}`,
                  backgroundColor: 'rgb(var(--muted))',
                }}
                onMouseEnter={e => { if (!resume.uploading) e.currentTarget.style.borderColor = 'rgb(var(--primary))'; }}
                onMouseLeave={e => { if (!resume.uploading) e.currentTarget.style.borderColor = 'rgb(var(--border))'; }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: 'rgb(var(--accent))' }}
                >
                  {resume.uploading
                    ? <div
                        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: 'rgb(var(--primary))', borderTopColor: 'transparent' }}
                      />
                    : <svg className="w-5 h-5" style={{ color: 'rgb(var(--primary))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                  }
                </div>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  {resume.uploading ? `Uploading… ${resume.progress}%` : 'Click to upload resume'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted-foreground))' }}>
                  PDF, DOC, DOCX — max 10 MB
                </p>
                {resume.uploading && (
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden mx-6" style={{ backgroundColor: 'rgb(var(--border))' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${resume.progress}%`, backgroundColor: 'rgb(var(--primary))' }}
                    />
                  </div>
                )}
                {resume.error && (
                  <p className="mt-2 text-xs font-medium" style={{ color: 'rgb(var(--destructive))' }}>
                    {resume.error}
                  </p>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  disabled={resume.uploading}
                  className="hidden"
                />
              </label>
            ) : (
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  backgroundColor: 'rgb(var(--muted))',
                  border: '1px solid rgb(var(--border))',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}
                >
                  <svg className="w-4 h-4" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'rgb(var(--foreground))' }}>
                    {resume.originalName || resume.file?.name}
                  </p>
                  <p className="text-xs font-medium" style={{ color: '#22c55e' }}>
                    Uploaded successfully
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResume({ file: null, resumeUrl: null, originalName: null, uploading: false, uploaded: false, error: null, progress: 0 })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0"
                  style={{ color: 'rgb(var(--muted-foreground))' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)';
                    e.currentTarget.style.color = 'rgb(var(--destructive))';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgb(var(--muted-foreground))';
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Cover letter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                Cover Letter
              </label>
              <span className="text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>Optional</span>
            </div>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Tell us why you're excited about this role…"
              className="w-full text-sm rounded-xl px-4 py-3 resize-none transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                color: 'rgb(var(--foreground))',
                backgroundColor: 'rgb(var(--background))',
                border: '1px solid rgb(var(--border))',
              }}
            />
            <p className="text-xs text-right mt-1" style={{ color: 'rgb(var(--muted-foreground))' }}>
              {coverLetter.length} / 2000
            </p>
          </div>
        </form>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid rgb(var(--border))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
            style={{
              color: 'rgb(var(--foreground))',
              backgroundColor: 'transparent',
              border: '1px solid rgb(var(--border))',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgb(var(--muted))'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="apply-form"
            disabled={isApplying || !resume.uploaded || resume.uploading}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgb(var(--primary))',
              color: 'rgb(var(--primary-foreground))',
              border: 'none',
            }}
          >
            {isApplying ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }}
                />
                Submitting…
              </>
            ) : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recruiter Stats Bar ──────────────────────────────────────────────────────
function RecruiterStatsBar({ job }) {
  const stats = [
    { label: 'Applications', value: job.applicationCount ?? 0,                                                    icon: '👥' },
    { label: 'Views',        value: job.viewCount        ?? 0,                                                    icon: '👁️' },
    { label: 'Status',       value: job.status?.charAt(0).toUpperCase() + job.status?.slice(1) ?? 'Unknown',      icon: job.status === 'active' ? '✅' : '📝' },
    { label: 'Posted',       value: getDaysAgo(job.createdAt),                                                    icon: '📅' },
  ];
  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'rgb(var(--card))',
        border: '1px solid rgb(var(--border))',
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0" style={{ borderColor: 'rgb(var(--border))' }}>
        {stats.map(s => (
          <div key={s.label} className="flex items-center gap-3 px-5 py-4">
            <span className="text-xl">{s.icon}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--muted-foreground))' }}>{s.label}</p>
              <p className="text-lg font-black" style={{ color: 'rgb(var(--foreground))' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Closed Banner ────────────────────────────────────────────────────────────
function ClosedBanner({ job }) {
  const reason = getClosedReason(job);
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-2xl mb-6"
      style={{
        backgroundColor: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.3)',
      }}
    >
      <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-sm font-bold" style={{ color: '#d97706' }}>Applications Closed</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted-foreground))' }}>{reason}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JobDetailPage() {
  const { id, jobId }   = useParams();
  const resolvedJobId   = jobId || id;
  const navigate        = useNavigate();
  const { currentUser } = useAuth();
  const isRecruiter     = currentUser?.role === 'recruiter';

  const [job,        setJob]        = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  useEffect(() => {
    if (!resolvedJobId) return;
    loadJob();
    if (!isRecruiter) checkApplied();
  }, [resolvedJobId]);

  const loadJob = async () => {
    try {
      setIsLoading(true);
      const res = await jobsAPI.getJobById(resolvedJobId, isRecruiter);
      const data = res?.data?.data ?? res?.data ?? null;
      if (!data) throw new Error('Not found');
      setJob(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load job details');
      navigate(isRecruiter ? '/recruiter/jobs' : '/candidate/jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const checkApplied = async () => {
    try {
      const res  = await applicationsAPI.getAllApplications();
      const apps = res?.data?.data ?? res?.data ?? [];
      setHasApplied(Array.isArray(apps) && apps.some(a => a.jobId?._id === resolvedJobId || a.jobId === resolvedJobId));
    } catch { /* silent */ }
  };

  const handleApplyClick = () => {
    if (!currentUser)    { toast.error('Please log in to apply'); navigate('/login'); return; }
    if (!isJobOpen(job)) { toast.error('This position is no longer accepting applications'); return; }
    setShowForm(true);
  };

  const handleBack = () => navigate(isRecruiter ? '/recruiter/jobs' : '/candidate/jobs');

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--background))' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgb(var(--primary))', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>Loading job details…</p>
      </div>
    </div>
  );

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'rgb(var(--background))' }}>
      <div
        className="rounded-2xl p-10 text-center max-w-sm"
        style={{ backgroundColor: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }}
      >
        <p className="font-bold mb-1" style={{ color: 'rgb(var(--foreground))' }}>Job not found</p>
        <p className="text-sm mb-4" style={{ color: 'rgb(var(--muted-foreground))' }}>This position may have been removed.</p>
        <button onClick={handleBack} className="text-sm font-semibold hover:underline" style={{ color: 'rgb(var(--primary))' }}>
          ← Back to {isRecruiter ? 'job listings' : 'job search'}
        </button>
      </div>
    </div>
  );

  const open     = isJobOpen(job);
  const co       = job.company?.name || '';
  const color    = companyColor(co || job.title);
  const salary   = formatSalary(job.salaryRange);
  const typeCol  = JOB_TYPE_COLORS[job.jobType]      || { bg: 'rgb(var(--muted))', text: 'rgb(var(--muted-foreground))' };
  const levelCol = LEVEL_COLORS[job.experienceLevel] || { bg: 'rgb(var(--muted))', text: 'rgb(var(--muted-foreground))' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--background))' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition mb-6"
          style={{ color: 'rgb(var(--muted-foreground))' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--primary))'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgb(var(--muted-foreground))'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isRecruiter ? 'Back to My Jobs' : 'Back to Jobs'}
        </button>

        {isRecruiter && <RecruiterStatsBar job={job} />}
        {!isRecruiter && !open && <ClosedBanner job={job} />}

        {/* Hero card */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ backgroundColor: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }}
        >
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-6 py-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0"
                style={{ background: color }}
              >
                {(co || job.title || 'J').charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-black leading-tight" style={{ color: 'rgb(var(--foreground))' }}>
                      {job.title}
                    </h1>
                    <p className="text-base font-semibold mt-0.5" style={{ color: 'rgb(var(--muted-foreground))' }}>
                      {co || 'Company'}
                      {job.location && (
                        <span className="inline-flex items-center gap-1 ml-2 font-normal">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* CTA */}
                  {isRecruiter ? (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Link
                        to={`/recruiter/jobs/${resolvedJobId}/edit`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl transition text-sm"
                        style={{
                          border: '1px solid rgb(var(--border))',
                          color: 'rgb(var(--foreground))',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgb(var(--muted))'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Job
                      </Link>
                      <Link
                        to={`/recruiter/candidates`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition text-sm"
                        style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        View Applications
                      </Link>
                    </div>
                  ) : hasApplied ? (
                    <div
                      className="inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl text-sm shrink-0"
                      style={{
                        backgroundColor: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#22c55e',
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Applied
                    </div>
                  ) : open ? (
                    <button
                      onClick={handleApplyClick}
                      className="inline-flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl transition text-sm shrink-0"
                      style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                      Apply Now
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div
                      className="inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl text-sm shrink-0 cursor-not-allowed"
                      style={{
                        backgroundColor: 'rgb(var(--muted))',
                        color: 'rgb(var(--muted-foreground))',
                        border: '1px solid rgb(var(--border))',
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Not Accepting Applications
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {job.jobType         && <Pill style={{ backgroundColor: typeCol.bg,  color: typeCol.text  }}>{fmtType(job.jobType)}</Pill>}
                  {job.experienceLevel && <Pill style={{ backgroundColor: levelCol.bg, color: levelCol.text }}>{fmtLevel(job.experienceLevel)}</Pill>}
                  {salary && (
                    <Pill style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {salary}
                    </Pill>
                  )}
                  <Pill style={{ backgroundColor: 'rgb(var(--muted))', color: 'rgb(var(--muted-foreground))' }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Posted {getDaysAgo(job.createdAt)}
                  </Pill>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-col body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Section title="Job Description" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            }>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgb(var(--muted-foreground))' }}>{job.description}</p>
            </Section>

            {job.requirements && (
              <Section title="Requirements" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              }>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgb(var(--muted-foreground))' }}>{job.requirements}</p>
              </Section>
            )}

            {job.skills?.length > 0 && (
              <Section title="Required Skills" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              }>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((sk, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg text-sm font-semibold"
                      style={{
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        color: 'rgb(var(--primary))',
                      }}
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {job.benefits?.length > 0 && (
              <Section title="Benefits" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              }>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {job.benefits.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl"
                      style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}
                      >
                        <svg className="w-3 h-3" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>{b}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isRecruiter ? (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5">
                <p className="text-white font-bold text-base mb-1">Manage this job</p>
                <p className="text-indigo-200 text-xs mb-4">Update the posting or review who applied.</p>
                <div className="space-y-2">
                  <Link
                    to={`/recruiter/jobs/${resolvedJobId}/edit`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit Job Posting
                  </Link>
                  <Link
                    to={`/recruiter/candidates`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    View Applicants
                  </Link>
                </div>
              </div>
            ) : open && !hasApplied ? (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5">
                <p className="text-white font-bold text-base mb-1">Interested in this role?</p>
                <p className="text-indigo-200 text-xs mb-4">Apply in under 2 minutes with your resume.</p>
                <button
                  onClick={handleApplyClick}
                  className="w-full py-2.5 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition text-sm"
                >
                  Apply Now →
                </button>
              </div>
            ) : null}

            <Section title="Company" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            }>
              <InfoRow label="Name"     value={co || 'Not specified'} />
              {job.company?.industry && <InfoRow label="Industry" value={job.company.industry} />}
              {job.company?.website  && <InfoRow label="Website"  value={job.company.website} href={job.company.website} />}
            </Section>

            <Section title="Overview" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            }>
              <InfoRow label="Applications" value={job.applicationCount ?? '—'} />
              <InfoRow label="Views"         value={job.viewCount        ?? '—'} />
              {job.applicationDeadline && <InfoRow label="Deadline" value={fmtDate(job.applicationDeadline)} />}
              <InfoRow label="Posted" value={fmtDate(job.createdAt)} />
            </Section>
          </div>
        </div>
      </div>

      {/* Apply modal */}
      {!isRecruiter && showForm && open && (
        <ApplicationModal
          job={job}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setHasApplied(true); setShowForm(false); }}
        />
      )}
    </div>
  );
}