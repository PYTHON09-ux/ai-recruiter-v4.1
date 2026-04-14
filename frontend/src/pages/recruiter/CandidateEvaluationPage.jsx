import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import applicationService from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const initials = (first = '', last = '') => `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
const avatarColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#0ea5e9','#ef4444'];
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

const getScoreColor = (score) => {
  if (score >= 80) return { text: '#059669', bg: '#d1fae5', label: 'Excellent' };
  if (score >= 65) return { text: '#d97706', bg: '#fef3c7', label: 'Good' };
  if (score >= 50) return { text: '#ea580c', bg: '#ffedd5', label: 'Average' };
  return { text: '#dc2626', bg: '#fee2e2', label: 'Needs Work' };
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, confirmClass = 'bg-indigo-600 hover:bg-indigo-700', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 44, circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const col = getScoreColor(score);
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={col.text} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="text-center">
        <span className="text-2xl font-black" style={{ color: col.text }}>{score}</span>
        <span className="text-xs text-gray-400 block -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ category, score, feedback }) {
  const col = getScoreColor(score);
  return (
    <div className="p-4 border border-gray-100 rounded-xl hover:shadow-sm transition">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">{category}</span>
        <span className="text-sm font-bold" style={{ color: col.text }}>{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: col.text }}
        />
      </div>
      {feedback && <p className="text-xs text-gray-500 mt-1.5">{feedback}</p>}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CandidateEvaluationPage() {
  const { id: applicationId } = useParams();
  const navigate = useNavigate();

  const [loading,     setLoading]     = useState(true);
  const [application, setApplication] = useState(null);
  const [interview,   setInterview]   = useState(null);
  const [confirm,     setConfirm]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const appRes  = await applicationService.getApplicationById(applicationId);
        setApplication(appRes.data || appRes);

        const intRes = await interviewService.getInterviewsByApplication(applicationId);
        const list   = intRes.data || intRes.interviews || [];
        if (list.length > 0) setInterview(list[0]);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load evaluation data');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId]);

  const askConfirm = (title, message, confirmLabel, confirmClass, onConfirm) =>
    setConfirm({ title, message, confirmLabel, confirmClass, onConfirm });

  const doUpdateStatus = async (status) => {
    try {
      // applicationService.updateApplicationStatus(id, data) → PATCH /applications/:id/status
      // Backend expects body: { status: "hired" } — must be an object, not a bare string.
      await applicationService.updateApplicationStatus(applicationId, { status });
      setApplication(prev => ({ ...prev, status }));
      toast.success(status === 'hired' ? '🎉 Candidate hired!' : 'Candidate rejected');
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
    'This will mark the application as Hired. Are you sure you want to proceed?',
    'Yes, Hire',
    'bg-emerald-600 hover:bg-emerald-700',
    () => doUpdateStatus('hired')
  );

  const handleReject = () => askConfirm(
    'Reject this candidate?',
    'This will mark the application as Rejected. This can be undone by updating the status from the profile page.',
    'Yes, Reject',
    'bg-red-600 hover:bg-red-700',
    () => doUpdateStatus('rejected')
  );

  // ── Loading / not-found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading evaluation…</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-sm">
          <p className="text-red-600 font-semibold">Evaluation not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-indigo-600 hover:underline">← Go back</button>
        </div>
      </div>
    );
  }

  const cand     = application.candidateId || application.candidate || {};
  const job      = application.jobId        || application.job        || {};
  const eval_    = interview?.evaluation    || null;
  const proct    = interview?.technicalMetadata?.proctoringEvents || [];
  const responses = interview?.responses || [];
  const questions = interview?.questions  || [];
  const name     = `${cand.fullName}`.trim() || 'Unknown Candidate';

  const alreadyDecided = application.status === 'hired' || application.status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .eval-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="eval-root max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </button>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow shrink-0"
              style={{ backgroundImage: `url(${cand.profileData?.profilePicture || ''})`, backgroundSize: 'cover', backgroundColor: avatarColor(cand.fullName) }}
            >
              {/* {initials(cand.fullName)} */}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{name}</h1>
              <p className="text-indigo-600 font-semibold text-sm">{job.title || '—'}</p>
              <p className="text-gray-400 text-xs mt-0.5">Applied {fmtDate(application.createdAt)}</p>
            </div>
            {/* Overall score hero */}
            {eval_?.overallScore != null && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                <ScoreRing score={eval_.overallScore} />
                <span className="text-xs font-semibold text-gray-500">Overall Score</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={getScoreColor(eval_.overallScore)}>
                  {getScoreColor(eval_.overallScore).label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── No evaluation placeholder ──────────────────────────────────────── */}
        {!interview && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-bold text-amber-800 mb-1">Interview not yet completed</h3>
            <p className="text-sm text-amber-700">The candidate hasn't completed their interview. Evaluation will appear here once done.</p>
          </div>
        )}

        {interview && (
          <>
            {/* ── Category scores ──────────────────────────────────────────────── */}
            {eval_?.scores?.length > 0 && (
              <Section title="Category Scores" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {eval_.scores.map((s, i) => (
                    <ScoreBar key={i} category={s.category} score={s.score} feedback={s.feedback} />
                  ))}
                </div>
              </Section>
            )}

            {/* ── Strengths + Improvements ─────────────────────────────────────── */}
            {eval_ && (eval_?.strengths?.length > 0 || eval_?.improvements?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {eval_?.strengths?.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <h3 className="font-bold text-emerald-800 flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {eval_.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                          <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {eval_?.improvements?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {eval_.improvements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Interview Responses ──────────────────────────────────────────── */}
            {responses.length > 0 && (
              <Section title="Interview Responses" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }>
                <div className="space-y-4">
                  {responses.map((resp, i) => {
                    const q = questions.find(q => q.id === resp.questionId);
                    return (
                      <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="bg-indigo-50 px-4 py-3">
                          <p className="text-sm font-semibold text-indigo-800">Q{i + 1}: {q?.question || `Question ${i + 1}`}</p>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          {resp.audioUrl && (
                            <audio src={resp.audioUrl} controls className="h-8 w-full" />
                          )}
                          {resp.transcription && (
                            <p className="text-sm text-gray-700 leading-relaxed">{resp.transcription}</p>
                          )}
                          {resp.score != null && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                              style={getScoreColor(resp.score)}>
                              Score: {resp.score}/100
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ── AI Recommendation ────────────────────────────────────────────── */}
            {eval_?.recommendation && (
              <div className={`rounded-2xl p-6 border-2 ${
                eval_.recommendation === 'hire'  ? 'bg-emerald-50 border-emerald-200' :
                eval_.recommendation === 'maybe' ? 'bg-amber-50 border-amber-200' :
                                                   'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    eval_.recommendation === 'hire'  ? 'bg-emerald-100' :
                    eval_.recommendation === 'maybe' ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    {eval_.recommendation === 'hire' ? (
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : eval_.recommendation === 'maybe' ? (
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Recommendation</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        eval_.recommendation === 'hire'  ? 'bg-emerald-200 text-emerald-800' :
                        eval_.recommendation === 'maybe' ? 'bg-amber-200 text-amber-800' :
                                                           'bg-red-200 text-red-800'
                      }`}>
                        {eval_.recommendation.charAt(0).toUpperCase() + eval_.recommendation.slice(1)}
                      </span>
                    </div>
                    {eval_.summary && <p className="text-sm text-gray-700 leading-relaxed">{eval_.summary}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Proctoring ───────────────────────────────────────────────────── */}
            <Section title="Integrity Report" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }>
              {proct.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-semibold text-red-700">{proct.length} violation{proct.length > 1 ? 's' : ''} detected</span>
                  </div>
                  {proct.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-800">{ev.message || ev.description || 'Violation detected'}</p>
                        {ev.timestamp && <p className="text-xs text-gray-400 mt-0.5">{fmtTime(ev.timestamp)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">No violations detected</p>
                    <p className="text-xs text-emerald-600 mt-0.5">The candidate completed the interview without any proctoring flags.</p>
                  </div>
                </div>
              )}
            </Section>
          </>
        )}

        {/* ── Final Decision ───────────────────────────────────────────────────── */}
        {!alreadyDecided ? (
          <Section title="Final Decision" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }>
            <p className="text-sm text-gray-500 mb-5">Based on the evaluation above, make your final hiring decision for this candidate.</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleHire}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-sm shadow-emerald-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Hire Candidate
              </button>
              <button
                onClick={handleReject}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          </Section>
        ) : (
          <div className={`rounded-2xl p-5 flex items-center gap-4 border-2 ${
            application.status === 'hired' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              application.status === 'hired' ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
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
                {application.status === 'hired' ? '🎉 Candidate hired' : 'Candidate rejected'}
              </p>
              <p className={`text-sm mt-0.5 ${application.status === 'hired' ? 'text-emerald-600' : 'text-red-600'}`}>
                {application.status === 'hired'
                  ? 'Proceed with onboarding steps.'
                  : 'You can reverse this from the candidate profile.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          confirmClass={confirm.confirmClass}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}