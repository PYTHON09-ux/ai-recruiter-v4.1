import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import PreInterviewProctorSetup from '../../components/interview/PreInterviewProctorSetup';
import VoiceInterviewComponent from '../../components/interviews/VoiceInterviewComponent';
import interviewService from '../../services/interviewService';

const MagicLinkInterviewPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('validating');
  const [interviewData, setInterviewData] = useState(null);
  const [error, setError] = useState(null);
  const [completionResult, setCompletionResult] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(8);

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
        err?.response?.data?.message || 'Invalid or expired interview link.';
      setStatus('invalid');
      setError(msg);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { setStatus('invalid'); setError('No interview token provided in the URL.'); return; }
    validateAndLoad();
  }, [token, validateAndLoad]);

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

  const handleSetupReady = () => setStatus('interview');
  const handleSetupAbort = () => { setStatus('invalid'); setError('Interview setup was cancelled. Use your interview link again when you are ready.'); };
  const handleInterviewComplete = (result) => { setCompletionResult(result); setStatus('completed'); };
  const handleInterviewError = (err) => {
    if (err?.terminated && err?.result) {
      setCompletionResult({ ...err.result, terminatedEarly: true, terminationReason: err.message?.replace('Terminated: ', '') });
      setStatus('completed');
    } else {
      setStatus('error');
      setError(err?.message || 'An unexpected error occurred during the interview.');
    }
  };

  if (status === 'validating') return (
    <Shell>
      <div style={{ width: 32, height: 32, border: '2px solid #27272a', borderTopColor: '#71717a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <h2 style={titleStyle}>Verifying your link</h2>
      <p style={subtitleStyle}>This will only take a moment.</p>
    </Shell>
  );

  if (status === 'setup' && interviewData) return (
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

  if (status === 'interview' && interviewData) return (
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

  if (status === 'invalid') return (
    <Shell accent="red">
      <div style={iconCircleStyle('#7f1d1d', '#1a0505')}>
        <XCircle size={24} color="#f87171" />
      </div>
      <h2 style={titleStyle}>Invalid interview link</h2>
      <p style={subtitleStyle}>{error || 'This link is invalid or has expired. Please contact your recruiter for a new invitation.'}</p>
      <button style={btnStyle} onClick={() => navigate('/')}>Go to homepage</button>
    </Shell>
  );

  if (status === 'error') return (
    <Shell accent="amber">
      <div style={iconCircleStyle('#78350f', '#1a0c00')}>
        <AlertTriangle size={24} color="#fbbf24" />
      </div>
      <h2 style={titleStyle}>Something went wrong</h2>
      <p style={subtitleStyle}>{error || 'An unexpected error occurred. Please try again or contact support.'}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button style={{ ...btnStyle, background: '#1c0f00', border: '1px solid #854d0e', color: '#fbbf24' }} onClick={() => window.location.reload()}>Try again</button>
        <button style={btnStyle} onClick={() => navigate('/')}>Go home</button>
      </div>
    </Shell>
  );

  if (status === 'completed') {
    const wasTerminated = completionResult?.terminatedEarly;
    return (
      <Shell accent={wasTerminated ? 'red' : 'green'}>
        <div style={iconCircleStyle(wasTerminated ? '#7f1d1d' : '#14532d', wasTerminated ? '#1a0505' : '#0a1a0a')}>
          {wasTerminated ? <AlertTriangle size={24} color="#f87171" /> : <CheckCircle size={24} color="#4ade80" />}
        </div>
        <h2 style={titleStyle}>{wasTerminated ? 'Interview terminated' : 'Interview complete'}</h2>
        <p style={subtitleStyle}>
          {wasTerminated
            ? `Your session was terminated due to: ${completionResult.terminationReason}. Your responses up to this point have been saved and will be reviewed.`
            : 'Thank you for completing your interview. Your responses have been recorded and will be reviewed by the team. Expect feedback within 2–3 business days.'}
        </p>

        {completionResult && (
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', margin: '20px 0' }}>
            {completionResult.durationSeconds != null && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fafafa' }}>{Math.floor(completionResult.durationSeconds / 60)}m {completionResult.durationSeconds % 60}s</p>
                <p style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>Duration</p>
              </div>
            )}
            {completionResult.transcript?.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fafafa' }}>{completionResult.transcript.filter(m => m.role === 'user').length}</p>
                <p style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>Responses</p>
              </div>
            )}
            {completionResult.proctoringViolations?.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: completionResult.proctoringFlagged ? '#f87171' : '#fb923c' }}>{completionResult.proctoringViolations.length}</p>
                <p style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{completionResult.proctoringFlagged ? 'Flagged' : 'Events'}</p>
              </div>
            )}
          </div>
        )}

        {(completionResult?.proctoringFlagged || wasTerminated) && (
          <div style={{ padding: '8px 14px', background: '#1a0505', border: '1px solid #7f1d1d', borderRadius: 6, marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#f87171', textAlign: 'center', fontWeight: 600 }}>This session has been flagged for integrity review.</p>
          </div>
        )}

        <div style={{ padding: '8px 16px', background: '#0c0c0e', border: '1px solid #1f1f1f', borderRadius: 6, marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: '#52525b', textAlign: 'center' }}>Redirecting in {redirectCountdown}s…</p>
        </div>
        <button style={btnStyle} onClick={() => navigate('/')}>Go to homepage now</button>
      </Shell>
    );
  }

  return null;
};

const titleStyle = { fontSize: 20, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' };
const subtitleStyle = { fontSize: 13, color: '#71717a', lineHeight: 1.65, maxWidth: 320, margin: '0 auto 20px', fontFamily: 'Inter, system-ui, sans-serif' };
const btnStyle = { padding: '9px 20px', background: 'transparent', border: '1px solid #27272a', borderRadius: 6, color: '#a1a1aa', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', transition: 'border-color 0.15s' };

function iconCircleStyle(border, bg) {
  return { width: 52, height: 52, borderRadius: '50%', border: `1px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' };
}

function Shell({ children, accent }) {
  return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        background: '#0c0c0e',
        border: `1px solid ${accent === 'red' ? '#3f1515' : accent === 'amber' ? '#3f2200' : accent === 'green' ? '#0a2a0a' : '#1f1f1f'}`,
        borderRadius: 12, padding: '36px 32px', maxWidth: 400, width: '100%', textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {children}
      </div>
    </div>
  );
}

export default MagicLinkInterviewPage;