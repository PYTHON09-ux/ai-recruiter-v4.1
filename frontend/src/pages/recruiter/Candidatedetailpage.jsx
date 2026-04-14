import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import applicationService from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import { applicationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const initials = (first = '', last = '') => `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
const avatarColor = (name = '') => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#0ea5e9', '#ef4444'];
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  reviewing: { label: 'Reviewing', bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  shortlisted: { label: 'Shortlisted', bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  interviewed: { label: 'Interviewed', bg: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6' },
  interview_scheduled: { label: 'Int. Scheduled', bg: '#cffafe', text: '#155e75', dot: '#06b6d4' },
  interview_completed: { label: 'Int. Completed', bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
  hired: { label: 'Hired', bg: '#d1fae5', text: '#064e3b', dot: '#059669' },
  rejected: { label: 'Rejected', bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
};

const getGoogleViewerUrl = (url) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel = 'Confirm', confirmClass = 'bg-indigo-600 hover:bg-indigo-700', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resume Modal ─────────────────────────────────────────────────────────────
function ResumeModal({ resumeUrl, candidateName, onClose }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">Resume</h3>
            <p className="text-sm text-gray-500">{candidateName}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" download
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden rounded-b-2xl bg-gray-100">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-500">Loading document…</p>
            </div>
          )}
          <iframe src={getGoogleViewerUrl(resumeUrl)} className="w-full h-full border-0" title={`Resume — ${candidateName}`} onLoad={() => setLoading(false)} />
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
        <span className="text-indigo-500">{icon}</span>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <span className="text-gray-500 text-sm w-24 shrink-0">{label}</span>
      <span className="text-gray-900 text-sm font-medium break-all">{value || '—'}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CandidateDetailPage() {
  const { id: applicationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [interview, setInterview] = useState(null);
  const [magicLink, setMagicLink] = useState('');   // the shareable URL sent to candidate
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm }
  const [resumeOpen, setResumeOpen] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  // ── Build full URL from a token ─────────────────────────────────────────────
  const buildMagicUrl = (token) =>
    token ? `${window.location.origin}/interview/${token}` : '';

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const appRes = await applicationService.getApplicationById(applicationId);
        const appData = appRes.data || appRes;
        setApplication(appData);

        // Restore existing magic link if already generated
        if (appData.magicLinkToken) {
          setMagicLink(buildMagicUrl(appData.magicLinkToken));
        } else if (appData.magicLink) {
          // Some backends return the full URL directly
          setMagicLink(appData.magicLink);
        }

        try {
          const intRes = await interviewService.getInterviewsByApplication(applicationId);
          const list = intRes.data || intRes.interviews || [];
          if (list.length > 0) setInterview(list[0]);
        } catch (e) {
          /* no interview record yet — fine */
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load candidate data');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId]);

  // ── Confirm helper ──────────────────────────────────────────────────────────
  const askConfirm = useCallback((title, message, onConfirm) => {
    setConfirm({ title, message, onConfirm });
  }, []);

  // ── Generate / Regenerate interview link ────────────────────────────────────
  // Flow (mirrors InterviewScheduler / old component):
  //   1. scheduleInterview — creates/upserts the Interview record with questions
  //   2. generateMagicLink  — generates a signed JWT token on the Application and
  //                           returns { token, magicLink } or { data: { token, magicLink } }
  const doGenerateLink = async () => {
    setLinkLoading(true);
    try {
      // Step 1 — create/upsert the Interview record.
      // Must pass jobId and candidateId so the backend can load questions from the Job.
      const appData = application; // already in state
      const jobId = appData.jobId?._id || appData.jobId;
      const candidateId = appData.candidateId?._id || appData.candidateId;

      if (!jobId || !candidateId) {
        toast.error('Missing job or candidate data — cannot schedule interview.');
        return;
      }

      const scheduleRes = await interviewService.scheduleInterview({
        applicationId,
        jobId,
        candidateId,
      });
      const createdInterview = scheduleRes.data || scheduleRes;
      setInterview(createdInterview);

      // Step 2 — generate (or regenerate) the magic link token on the Application.
      const linkRes = await applicationsAPI.generateMagicLink(applicationId);
      const linkData = linkRes.data?.data || linkRes.data || linkRes;

      // Backend may return token, magicLink, or url — handle all shapes
      const token = linkData.token || linkData.magicLinkToken;
      const url = linkData.magicLink || linkData.url || buildMagicUrl(token);

      if (!url && !token) {
        throw new Error('No link returned from server');
      }

      const finalUrl = url || buildMagicUrl(token);
      setMagicLink(finalUrl);

      // Also update the application state so the existing-link panel shows
      setApplication(prev => ({
        ...prev,
        magicLink: finalUrl,
        magicLinkToken: token,
      }));

      toast.success('Interview link generated!');
    } catch (e) {
      console.error('Generate link error:', e);
      toast.error(e?.response?.data?.message || 'Failed to generate interview link');
    } finally {
      setLinkLoading(false);
      setConfirm(null);
    }
  };

  const handleGenerateLink = () => {
    const isRegen = !!magicLink;
    askConfirm(
      isRegen ? 'Regenerate Interview Link?' : 'Generate Interview Link?',
      isRegen
        ? 'This will invalidate the current link and create a new one. Make sure to send the new link to the candidate.'
        : 'This will create an AI-powered voice interview link. The candidate can complete the interview at their own pace.',
      doGenerateLink
    );
  };

  const handleCopyLink = () => {
    if (!magicLink) return;
    navigator.clipboard.writeText(magicLink).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  };

  // ── Status update ───────────────────────────────────────────────────────────
  const doUpdateStatus = async (status) => {
    try {
      // Must pass { status } object — backend PATCH handler reads req.body.status.
      // Passing a bare string (e.g. "hired") serialises as a JSON primitive,
      // making req.body.status undefined and causing a 400.
      await applicationService.updateApplicationStatus(applicationId, { status });
      setApplication(prev => ({ ...prev, status }));
      toast.success(`Candidate marked as ${STATUS_CONFIG[status]?.label || status}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'Failed to update status';
      console.error('updateApplicationStatus error:', e?.response?.data || e);
      toast.error(msg);
    } finally {
      setConfirm(null);
    }
  };

  const handleHire = () => askConfirm(
    'Hire this candidate?',
    'This will mark the application as Hired. Make sure you have reviewed all evaluation details.',
    () => doUpdateStatus('hired')
  );

  const handleReject = () => askConfirm(
    'Reject this candidate?',
    'This will mark the application as Rejected. This action can be undone by updating the status manually.',
    () => doUpdateStatus('rejected')
  );

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-gray-500 text-sm">Loading candidate profile…</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-sm">
          <p className="text-red-600 font-semibold">Candidate not found</p>
          <Link to="/recruiter/candidates" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">← Back to candidates</Link>
        </div>
      </div>
    );
  }
  const cand = application.candidateId || application.candidate || {};
  const job = application.jobId || application.job || {};
  const profile = cand.profileData.profilePicture || 'no profile picture';
  const evaluation = interview?.evaluation || null;
  const hasInterview = !!interview;
  const hasEval = hasInterview && evaluation;
  const hasLink = !!magicLink;              // magic link lives on Application, not Interview
  const statusCfg = STATUS_CONFIG[application.status] || { label: application.status, bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  const name = `${cand.fullName}`.trim() || 'Unknown Candidate';

  console.log(cand); // alias for easier access to nested fields
  // Completion check: either status says completed, or interview has responses
  const interviewCompleted =
    application.status === 'interview_completed' ||
    application.status === 'interviewed' ||
    (interview?.responses?.length > 0) ||
    interview?.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .cd-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="cd-root max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        {/* ── Back nav ───────────────────────────────────────────────────────── */}
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Candidates
          </button>
        </div>

        {/* ── Hero card ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          <div className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar / photo */}
            {profile ? (
              <img src={profile} alt={name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md shrink-0" />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0"
                style={{ background: avatarColor(name) }}
              >
                {initials(cand.fullName)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <span
                  style={{ background: statusCfg.bg, color: statusCfg.text }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                >
                  <span style={{ background: statusCfg.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
                  {statusCfg.label}
                </span>
              </div>
              {job.title && (
                <p className="text-indigo-600 font-semibold mt-1">Applied for: {job.title}</p>
              )}
              <p className="text-gray-400 text-sm mt-1">Applied on {fmtDate(application.createdAt)}</p>
            </div>

            {/* Resume quick actions */}
            {application.resume?.url && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setResumeOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-2 border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Resume
                </button>
                <a
                  href={application.resume.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Two-column: Profile + Job info ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Profile info */}
          <Section
            title="Profile Information"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} label="Email" value={cand.email} />
            <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} label="Phone" value={cand.profileData.phoneNumber} />
            {/* <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>} label="Location" value={cand.profileData.location || cand.location} /> */}
            <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} label="Experience" value={cand.profileData.experience ? `${cand.profileData.experience} years` : undefined} />
            <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} label="Education" value={cand.profileData.education} />

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Cover letter + job */}
          <div className="space-y-6">
            {application.coverLetter && (
              <Section
                title="Cover Letter"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                <p className="text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto">{application.coverLetter}</p>
              </Section>
            )}

            <Section
              title="Job Details"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            >
              <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Position" value={job.title} />
              <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>} label="Location" value={job.location} />
              {/* <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Type" value={job.jobType || job.type} /> */}
              {/* <InfoRow icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} label="Department" value={job.department} /> */}
            </Section>
          </div>
        </div>

        {/* ── Interview Link Section ────────────────────────────────────────── */}
        <Section
          title="AI Interview"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        >
          {hasLink ? (
            <div className="space-y-4">
              {/* Link display — magicLink is the candidate-facing URL */}
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">Interview link active</p>
                  <a href={magicLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-700 hover:underline truncate block mt-0.5">
                    {magicLink}
                  </a>
                </div>
                <button onClick={handleCopyLink}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition min-w-[70px]">
                  {copyMsg || 'Copy'}
                </button>
              </div>

              {/* Interview meta — from the Interview record if present */}
              {interview && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-500 text-xs mb-1">Created</p>
                    <p className="font-semibold text-gray-800">
                      {fmtDateTime(interview.createdAt || interview.aiMetadata?.scheduledAt)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-500 text-xs mb-1">Questions</p>
                    <p className="font-semibold text-gray-800">
                      {interview.questions?.length || 0} question{interview.questions?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Regenerate */}
              <button
                onClick={handleGenerateLink}
                disabled={linkLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border-2 border-orange-200 text-orange-700 rounded-xl hover:bg-orange-50 transition disabled:opacity-50"
              >
                {linkLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-700 rounded-full animate-spin" />
                    Regenerating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate Link
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium">No interview link generated yet.</p>
                <p className="text-xs text-gray-400 mt-1">Generate an AI-powered voice interview link that the candidate can complete asynchronously.</p>
              </div>
              <button
                onClick={handleGenerateLink}
                disabled={linkLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shrink-0"
              >
                {linkLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Generate Interview Link
                  </>
                )}
              </button>
            </div>
          )}
        </Section>

        {/* ── Evaluation CTA (only if interview completed) ──────────────────── */}
        {interviewCompleted && (
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">Interview Complete</span>
              </div>
              <h3 className="text-white text-lg font-bold">AI evaluation is ready</h3>
              <p className="text-indigo-200 text-sm mt-1">View the full analysis, scores, strengths, and AI recommendation.</p>
            </div>
            <Link
              to={`/recruiter/candidates/${applicationId}/evaluation`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition shrink-0 shadow-md"
            >
              See Evaluation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* ── Hire / Reject (only if not already decided) ───────────────────── */}
        {application.status !== 'hired' && application.status !== 'rejected' && (
          <Section
            title="Final Decision"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <p className="text-sm text-gray-500 mb-5">Make a hiring decision for this candidate. This will update their application status.</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleHire}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Hire Candidate
              </button>
              <button
                onClick={handleReject}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold bg-white text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject Candidate
              </button>
            </div>
          </Section>
        )}

        {/* Already decided */}
        {(application.status === 'hired' || application.status === 'rejected') && (
          <div className={`rounded-2xl p-5 flex items-center gap-4 border-2 ${application.status === 'hired' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${application.status === 'hired' ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {application.status === 'hired' ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-bold ${application.status === 'hired' ? 'text-emerald-800' : 'text-red-800'}`}>
                {application.status === 'hired' ? 'Candidate hired' : 'Candidate rejected'}
              </p>
              <p className={`text-sm mt-0.5 ${application.status === 'hired' ? 'text-emerald-600' : 'text-red-600'}`}>
                {application.status === 'hired'
                  ? 'This candidate has been marked as hired. Proceed with onboarding.'
                  : 'This application has been rejected. You can reverse this by updating the status.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Resume Modal ──────────────────────────────────────────────────────── */}
      {resumeOpen && application.resume?.url && (
        <ResumeModal
          resumeUrl={application.resume.url}
          candidateName={name}
          onClose={() => setResumeOpen(false)}
        />
      )}

      {/* ── Confirm Dialog ───────────────────────────────────────────────────── */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Yes, confirm"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}