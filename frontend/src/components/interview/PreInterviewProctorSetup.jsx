import { useState, useRef, useEffect, useCallback } from 'react';

export default function PreInterviewProctorSetup({
  candidateName = 'Candidate',
  jobTitle = 'Interview',
  companyName = '',
  totalQuestions = 0,
  durationMins = 10,
  onReady,
  onAbort,
}) {
  const [step, setStep] = useState('instructions');
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [fsOk, setFsOk] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [cameraErr, setCameraErr] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [fsError, setFsError] = useState('');
  const [requesting, setRequesting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioAnimRef = useRef(null);

  const allPassed = cameraOk && micOk && fsOk && agreed;

  useEffect(() => {
    if (step !== 'checks') return;
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOk(true);
        setTimeout(() => { if (active) setFaceDetected(true); }, 1500);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
          const level = Math.min(100, (avg / 128) * 100);
          if (active) { setAudioLevel(level); if (level > 8) setMicOk(true); }
          audioAnimRef.current = requestAnimationFrame(tick);
        };
        audioAnimRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!active) return;
        setCameraErr(err.name === 'NotAllowedError'
          ? 'Camera and microphone access denied. Allow them in your browser settings and reload.'
          : 'Could not access camera or microphone: ' + err.message);
      }
    })();
    return () => {
      active = false;
      cancelAnimationFrame(audioAnimRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, [step]);

  useEffect(() => {
    const onFsChange = () => {
      setFsOk(!!document.fullscreenElement);
      if (!document.fullscreenElement) setFsError('Fullscreen exited. Re-enter to continue.');
      else setFsError('');
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const requestFs = async () => {
    setRequesting(true); setFsError('');
    try { await document.documentElement.requestFullscreen(); setFsOk(true); }
    catch { setFsError('Fullscreen not allowed. Click the button again and accept the prompt.'); setFsOk(false); }
    finally { setRequesting(false); }
  };

  const handleStart = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    cancelAnimationFrame(audioAnimRef.current);
    onReady?.();
  }, [onReady]);

  const RULES = [
    { icon: <FsIcon />, color: '#f97316', title: 'Fullscreen required', body: 'You cannot exit fullscreen during the interview. Exiting is flagged immediately.' },
    { icon: <TabIcon />, color: '#eab308', title: 'No tab switching', body: '3 warnings trigger automatic termination. All events are logged permanently.' },
    { icon: <FaceIcon />, color: '#a78bfa', title: 'One person only', body: 'Multiple faces in frame = immediate violation. Be alone in a private space.' },
    { icon: <MicIcon />, color: '#2dd4bf', title: 'One voice only', body: 'Your voice must be the only one audible. Background conversation is detected.' },
    { icon: <CamIcon />, color: '#60a5fa', title: 'Camera always on', body: 'Keep your face fully visible. Any absence from frame is flagged.' },
    { icon: <RecIcon />, color: '#f472b6', title: 'Fully recorded', body: 'Session is recorded. All violations and responses are reviewed by the hiring team.' },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#09090b', fontFamily: 'Inter, system-ui, sans-serif', color: '#e4e4e7' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .pi-btn-primary { background: #fafafa; color: #09090b; border: none; border-radius: 6px; padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s; font-family: inherit; }
        .pi-btn-primary:hover { opacity: .88; }
        .pi-btn-primary:disabled { background: #27272a; color: #52525b; cursor: not-allowed; opacity: 1; }
        .pi-btn-ghost { background: transparent; color: #71717a; border: 1px solid #27272a; border-radius: 6px; padding: 9px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: border-color .15s, color .15s; font-family: inherit; }
        .pi-btn-ghost:hover { border-color: #52525b; color: #a1a1aa; }
        .pi-btn-warn { background: #1c1200; color: #fbbf24; border: 1px solid #854d0e; border-radius: 6px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s; width: 100%; }
        .pi-btn-warn:hover { background: #292105; }
      `}</style>

      {step === 'instructions' && (
        <div style={{ maxWidth: 680, width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', border: '1px solid #3f3f46', borderRadius: 4, marginBottom: 20 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa' }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#a78bfa', textTransform: 'uppercase' }}>Proctored Interview</span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, color: '#fafafa' }}>Before you begin</h1>
          <p style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>
            {[companyName, jobTitle].filter(Boolean).join(' · ')} &nbsp;·&nbsp; Hi {candidateName}, read these rules carefully before continuing.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {RULES.map(({ icon, color, title, body }) => (
              <div key={title} style={{ padding: '12px 14px', border: '1px solid #27272a', borderRadius: 8, background: '#111113', display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #27272a', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7', marginBottom: 3 }}>{title}</p>
                  <p style={{ fontSize: 11, color: '#52525b', lineHeight: 1.55 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 14px', border: '1px solid #3f1515', borderRadius: 6, background: '#110808', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <WarningIcon style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
              <strong style={{ color: '#f87171' }}>3 warnings triggers automatic termination.</strong> Violations include tab switching, fullscreen exit, multiple faces, and multiple voices. All violations are sent to the recruiter.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #1f1f1f', borderRadius: 6, background: '#0c0c0e', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['Questions', totalQuestions], ['Duration', `~${durationMins}m`], ['Mode', 'AI Voice'], ['Proctored', 'Yes']].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fafafa' }}>{v}</p>
                  <p style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{l}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="pi-btn-ghost" onClick={() => onAbort?.()}>Not ready</button>
              <button className="pi-btn-primary" onClick={() => setStep('checks')}>Continue →</button>
            </div>
          </div>
        </div>
      )}

      {step === 'checks' && (
        <div style={{ maxWidth: 720, width: '100%' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: 3 }}>System check</h2>
            <p style={{ fontSize: 12, color: '#52525b' }}>All checks are mandatory. The interview cannot begin until everything passes.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Camera column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionLabel>Camera preview</SectionLabel>
              <div
                style={{
                  position: 'relative', borderRadius: 8, overflow: 'hidden',
                  border: `1px solid ${cameraErr ? '#7f1d1d' : cameraOk ? '#14532d' : '#27272a'}`,
                  background: '#0a0a0b', aspectRatio: '16/9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {cameraErr ? (
                  <div style={{ textAlign: 'center', padding: '0 16px' }}>
                    <CamBlockedIcon />
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 4, marginTop: 8 }}>Camera blocked</p>
                    <p style={{ fontSize: 11, color: '#52525b', lineHeight: 1.5 }}>{cameraErr}</p>
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                )}
                {cameraOk && (
                  <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.75)', padding: '3px 7px', borderRadius: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: faceDetected ? '#22c55e' : '#f59e0b' }} />
                    <span style={{ fontSize: 9, color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {faceDetected ? 'Face detected' : 'Searching…'}
                    </span>
                  </div>
                )}
              </div>
              <CheckRow ok={cameraOk} bad={!!cameraErr} label="Camera access granted" required />
              <CheckRow ok={faceDetected && cameraOk} bad={false} label="Face visible in frame" required />
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionLabel>Audio & permissions</SectionLabel>

              {/* Mic */}
              <div style={{
                padding: '12px 14px', borderRadius: 8, background: '#0a0a0b',
                border: `1px solid ${micOk ? '#14532d' : cameraErr ? '#7f1d1d' : '#27272a'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7' }}>Microphone</p>
                  <StatusBadge ok={micOk} warn={!micOk && !cameraErr}>
                    {micOk ? 'Detected' : 'Say something…'}
                  </StatusBadge>
                </div>
                <MicBars level={audioLevel} />
                <p style={{ fontSize: 10, color: '#3f3f46', marginTop: 6 }}>
                  {micOk ? 'Microphone is working correctly.' : 'Speak normally — bars should react to your voice.'}
                </p>
              </div>

              {/* Fullscreen */}
              <div style={{
                padding: '12px 14px', borderRadius: 8, background: '#0a0a0b',
                border: `1px solid ${fsOk ? '#14532d' : '#854d0e'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7' }}>Fullscreen mode</p>
                    <p style={{ fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: 1 }}>Mandatory</p>
                  </div>
                  <StatusBadge ok={fsOk} warn={!fsOk}>{fsOk ? 'Active' : 'Not active'}</StatusBadge>
                </div>
                {fsError && <p style={{ fontSize: 11, color: '#fca5a5', marginBottom: 6, lineHeight: 1.5 }}>{fsError}</p>}
                {!fsOk
                  ? <button className="pi-btn-warn" onClick={requestFs} disabled={requesting}>{requesting ? 'Requesting…' : 'Enter fullscreen'}</button>
                  : <p style={{ fontSize: 11, color: '#3f3f46', textAlign: 'center', padding: '4px 0' }}>Fullscreen active — do not exit during the interview</p>
                }
              </div>

              {/* Agree */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', border: '1px solid #1f1f1f', borderRadius: 8, background: '#0c0c0e' }}>
                <div
                  onClick={() => setAgreed(a => !a)}
                  style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 1, cursor: 'pointer',
                    border: `1px solid ${agreed ? '#fafafa' : '#52525b'}`,
                    background: agreed ? '#fafafa' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {agreed && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <p style={{ fontSize: 11, color: '#71717a', lineHeight: 1.6, marginTop: 0 }}>
                  I have read and accept all proctoring rules. I understand that violations are logged and may result in immediate session termination.
                </p>
              </label>

              {/* Status summary */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label: 'Camera', ok: cameraOk, bad: !!cameraErr },
                  { label: 'Mic', ok: micOk, bad: false },
                  { label: 'Face', ok: faceDetected && cameraOk, bad: false },
                  { label: 'Fullscreen', ok: fsOk, bad: !!fsError },
                  { label: 'Agreed', ok: agreed, bad: false },
                ].map(({ label, ok, bad }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                    border: `1px solid ${bad ? '#7f1d1d' : ok ? '#14532d' : '#1f1f1f'}`,
                    borderRadius: 4, background: bad ? '#110808' : ok ? '#0a1a0a' : '#0c0c0e',
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: bad ? '#ef4444' : ok ? '#22c55e' : '#3f3f46' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: bad ? '#f87171' : ok ? '#4ade80' : '#52525b' }}>{label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="pi-btn-ghost" onClick={() => setStep('instructions')} style={{ flex: 1 }}>← Back</button>
                <button
                  className="pi-btn-primary"
                  onClick={handleStart}
                  disabled={!allPassed}
                  style={{ flex: 2 }}
                >
                  {!cameraOk || !!cameraErr ? 'Waiting for camera…'
                    : !micOk ? 'Speak to verify mic…'
                    : !faceDetected ? 'Detecting face…'
                    : !fsOk ? 'Enter fullscreen first'
                    : !agreed ? 'Accept rules to continue'
                    : 'Begin interview →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#52525b', marginBottom: 4 }}>{children}</p>;
}

function CheckRow({ ok, bad, label, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: `1px solid ${bad ? '#7f1d1d' : ok ? '#14532d' : '#1f1f1f'}`, borderRadius: 6, background: '#0c0c0e' }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: bad ? '#7f1d1d' : ok ? '#14532d' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {bad ? <XSvg /> : ok ? <CheckSvg /> : <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3f3f46' }} />}
      </div>
      <span style={{ fontSize: 11, color: bad ? '#f87171' : ok ? '#a1a1aa' : '#52525b', flex: 1 }}>{label}</span>
      {required && <span style={{ fontSize: 9, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>required</span>}
    </div>
  );
}

function StatusBadge({ ok, warn, children }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 600,
      background: ok ? '#14532d' : warn ? '#451a03' : '#1a1a1a',
      color: ok ? '#4ade80' : warn ? '#fb923c' : '#71717a',
    }}>{children}</span>
  );
}

function MicBars({ level }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
      {Array.from({ length: 20 }, (_, i) => {
        const threshold = (i / 20) * 100;
        const on = level > threshold;
        return (
          <div key={i} style={{
            flex: 1, borderRadius: 2,
            background: on ? (level > 75 ? '#ef4444' : level > 40 ? '#22c55e' : '#15803d') : '#1f1f1f',
            height: `${Math.max(15, (i % 3 === 0 ? 70 : i % 2 === 0 ? 45 : 30))}%`,
            transition: 'background .1s',
          }} />
        );
      })}
    </div>
  );
}

function CheckSvg() { return <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function XSvg() { return <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" /><line x1="10" y1="2" x2="2" y2="10" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function WarningIcon({ style }) { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>; }
function CamBlockedIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block' }}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><line x1="1" y1="1" x2="23" y2="23" strokeWidth="1.5" /></svg>; }
function FsIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>; }
function TabIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>; }
function CamIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>; }
function MicIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>; }
function FaceIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 10-16 0" /></svg>; }
function RecIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>; }