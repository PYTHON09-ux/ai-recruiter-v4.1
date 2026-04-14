import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import PreInterviewProctorSetup from '../../components/interview/PreInterviewProctorSetup';
import VoiceInterviewComponent from '../../components/interviews/VoiceInterviewComponent';
import interviewService from '../../services/interviewService';

const MagicLinkInterviewPage = () => {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [status,            setStatus]            = useState('validating');
  // 'validating' | 'setup' | 'interview' | 'invalid' | 'completed' | 'error'

  const [interviewData,     setInterviewData]     = useState(null);
  const [error,             setError]             = useState(null);
  const [completionResult,  setCompletionResult]  = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(8);

  // ── Token validation ───────────────────────────────────────────────────────
  const validateAndLoad = useCallback(async () => {
    try {
      const data = await interviewService.validateMagicLink(token);
      setInterviewData(data);
      setStatus('setup');
    } catch (err) {
      const msg =
        err?.response?.status === 404 ? 'This interview link does not exist.' :
        err?.response?.status === 410 ? 'This interview link has already been used.' :
        err?.response?.status === 401 ? 'This interview link has expired. Please contact the recruiter for a new one.' :
        err?.response?.data?.message  || 'Invalid or expired interview link.';
      setStatus('invalid');
      setError(msg);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { setStatus('invalid'); setError('No interview token provided in the URL.'); return; }
    validateAndLoad();
  }, [token, validateAndLoad]);

  // ── Auto-redirect after completion ────────────────────────────────────────
  useEffect(() => {
    if (status !== 'completed') return;
    const timer = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); navigate('/', { replace: true }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, navigate]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSetupReady = () => setStatus('interview');

  const handleSetupAbort = () => {
    setStatus('invalid');
    setError('Interview setup was cancelled. Please use your interview link again when you are ready.');
  };

  const handleInterviewComplete = (result) => {
    setCompletionResult(result);
    setStatus('completed');
  };

  // FIX: terminated interviews also go to 'completed' screen, not 'error'
  // The VoiceInterviewComponent now saves data before calling onError,
  // and passes { terminated: true, result } so we can distinguish the case.
  const handleInterviewError = (err) => {
    if (err?.terminated && err?.result) {
      // Termination due to violation — data was saved, show completion screen
      setCompletionResult({
        ...err.result,
        terminatedEarly: true,
        terminationReason: err.message?.replace('Terminated: ', ''),
      });
      setStatus('completed');
    } else {
      // Genuine technical error
      setStatus('error');
      setError(err?.message || 'An unexpected error occurred during the interview.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  STATES
  // ─────────────────────────────────────────────────────────────────────────

  if (status === 'validating') {
    return (
      <FullScreenCard gradient="from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-14 w-14 border-2 border-white/10 border-t-white/80 mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-white mb-2">Verifying your interview link</h2>
        <p className="text-white/40 text-sm">This will only take a moment…</p>
      </FullScreenCard>
    );
  }

  if (status === 'setup' && interviewData) {
    return (
      <PreInterviewProctorSetup
        candidateName={interviewData.candidateName}
        jobTitle={interviewData.job?.title}
        companyName={interviewData.job?.company?.name}
        totalQuestions={(interviewData.questions || []).length}
        durationMins={interviewData.job?.interviewDuration || 10}
        onReady={handleSetupReady}
        onAbort={handleSetupAbort}
      />
    );
  }

  if (status === 'interview' && interviewData) {
    return (
      <VoiceInterviewComponent
        token={token}
        jobData={interviewData.job}
        candidateName={interviewData.candidateName}
        interviewId={interviewData.interviewId}
        questions={interviewData.questions || []}
        onComplete={handleInterviewComplete}
        onError={handleInterviewError}
      />
    );
  }

  if (status === 'invalid') {
    return (
      <FullScreenCard gradient="from-rose-950 to-slate-900">
        <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-white mb-3">Invalid Interview Link</h2>
        <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed mb-8">
          {error || 'This link is invalid or has expired. Please contact your recruiter for a new invitation.'}
        </p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-all">
          Go to Homepage
        </button>
      </FullScreenCard>
    );
  }

  if (status === 'error') {
    return (
      <FullScreenCard gradient="from-amber-950 to-slate-900">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-white mb-3">Something went wrong</h2>
        <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed mb-8">
          {error || 'An unexpected error occurred. Please try again or contact support.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-sm transition-all">Try Again</button>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-all">Go Home</button>
        </div>
      </FullScreenCard>
    );
  }

  if (status === 'completed') {
    const wasTerminated = completionResult?.terminatedEarly;
    return (
      <FullScreenCard gradient={wasTerminated ? 'from-rose-950 to-slate-900' : 'from-emerald-950 to-slate-900'}>
        <div className="relative mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
            wasTerminated
              ? 'bg-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.3)]'
              : 'bg-emerald-500/20 shadow-[0_0_40px_rgba(52,211,153,0.3)]'
          }`}>
            {wasTerminated
              ? <AlertTriangle className="w-10 h-10 text-rose-400" />
              : <CheckCircle className="w-10 h-10 text-emerald-400" />
            }
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          {wasTerminated ? 'Interview Terminated' : 'Interview Complete!'}
        </h2>
        <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed mb-6">
          {wasTerminated
            ? `Your interview was terminated due to: ${completionResult.terminationReason}. Your responses up to this point have been saved and will be reviewed.`
            : 'Thank you for completing your interview. Your responses have been recorded and will be reviewed by the team. Expect feedback within 2–3 business days.'
          }
        </p>

        {/* Stats */}
        {completionResult && (
          <div className="flex gap-6 justify-center mb-8">
            {completionResult.durationSeconds != null && (
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {Math.floor(completionResult.durationSeconds / 60)}m {completionResult.durationSeconds % 60}s
                </p>
                <p className="text-xs text-white/30 mt-1">Duration</p>
              </div>
            )}
            {completionResult.transcript?.length > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {completionResult.transcript.filter(m => m.role === 'user').length}
                </p>
                <p className="text-xs text-white/30 mt-1">Responses</p>
              </div>
            )}
            {completionResult.proctoringViolations?.length > 0 && (
              <div className="text-center">
                <p className={`text-2xl font-bold ${completionResult.proctoringFlagged ? 'text-rose-400' : 'text-amber-400'}`}>
                  {completionResult.proctoringViolations.length}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {completionResult.proctoringFlagged ? 'Flagged' : 'Events'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Flagged or terminated note */}
        {(completionResult?.proctoringFlagged || wasTerminated) && (
          <div className="mb-6 px-4 py-2 bg-rose-900/30 border border-rose-800/40 rounded-xl">
            <p className="text-rose-400 text-xs text-center">
              ⚠ This session has been flagged for integrity review.
            </p>
          </div>
        )}

        <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm text-white/40 mb-6">
          Redirecting in {redirectCountdown}s…
        </div>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-all">
          Go to Homepage Now
        </button>
      </FullScreenCard>
    );
  }

  return null;
};

function FullScreenCard({ gradient, children }) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradient} flex items-center justify-center p-6`}
      style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&display=swap');`}</style>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export default MagicLinkInterviewPage;