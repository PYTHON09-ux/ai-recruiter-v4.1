import { useState, useRef, useEffect, useCallback } from 'react';
import vapiService from '../../services/vapiService';

export default function VoiceInterviewComponent({
  token, jobData, candidateName = 'Candidate',
  interviewId, questions: questionsProp = [], onComplete, onError,
}) {
  const [phase, setPhase] = useState('ready');
  const [isMuted, setIsMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [questionsDone, setQuestionsDone] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showWarnBanner, setShowWarnBanner] = useState(false);
  const [warnMsg, setWarnMsg] = useState('');
  const [warnSeverity, setWarnSeverity] = useState('amber');
  const [violations, setViolations] = useState([]);
  const [flagged, setFlagged] = useState(false);

  const candidateVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const micAudioCtxRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micAnimRef = useRef(null);
  const tabWarnsRef = useRef(0);
  const violationsRef = useRef([]);
  const warnCoolRef = useRef(false);
  const faceCheckRef = useRef(null);
  const voiceCheckRef = useRef(null);
  const canvasRef = useRef(null);
  const voiceBaselineRef = useRef(0);
  const terminated = useRef(false);
  const transcriptRef = useRef(null);
  const callIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptAccRef = useRef([]);
  const currentQuestionRef = useRef('');

  const job = jobData?._doc ?? jobData ?? null;
  const questions = questionsProp.length > 0 ? questionsProp : (job?.interviewQuestions || []);
  const totalQ = questions.length;
  const durationMins = job?.interviewDuration || 10;
  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isLive = phase === 'active' || phase === 'connecting';

  // Camera + mic
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360, facingMode: 'user' }, audio: true });
        if (!live) { stream.getTracks().forEach(t => t.stop()); return; }
        cameraStreamRef.current = stream;
        if (candidateVideoRef.current) candidateVideoRef.current.srcObject = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        micAudioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        micAnalyserRef.current = analyser;
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
          if (live) setMicLevel(Math.min(100, (avg / 128) * 100));
          micAnimRef.current = requestAnimationFrame(tick);
        };
        micAnimRef.current = requestAnimationFrame(tick);
      } catch { if (live) setCameraError(true); }
    })();
    return () => {
      live = false;
      cancelAnimationFrame(micAnimRef.current);
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      micAudioCtxRef.current?.close();
    };
  }, []);

  const logViolation = useCallback((type, severity, desc) => {
    const v = { type, severity, desc, ts: new Date().toISOString() };
    violationsRef.current = [...violationsRef.current, v];
    setViolations([...violationsRef.current]);
    if (violationsRef.current.filter(x => x.severity === 'high').length >= 2) setFlagged(true);
  }, []);

  const saveResult = useCallback(async (dur, reason = null) => {
    const fullTranscript = transcriptAccRef.current;
    const fv = violationsRef.current;
    const fl = fv.filter(v => v.severity === 'high').length >= 2;
    try {
      await vapiService.saveInterviewResult({
        interviewId, transcript: fullTranscript, callId: callIdRef.current,
        durationSeconds: dur, proctoringViolations: fv, proctoringFlagged: fl,
        tabSwitchCount: tabWarnsRef.current,
        ...(reason && { terminationReason: reason, terminated: true }),
      });
    } catch (e) { console.warn('Save failed:', e.message); }
    return { transcript: fullTranscript, callId: callIdRef.current, durationSeconds: dur, proctoringViolations: fv, proctoringFlagged: fl };
  }, [interviewId]);

  const stopDetection = useCallback(() => { clearInterval(faceCheckRef.current); clearInterval(voiceCheckRef.current); }, []);
  const stopTimer = useCallback(() => { clearInterval(timerRef.current); return Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000); }, []);

  const terminate = useCallback(async (reason) => {
    if (terminated.current) return;
    terminated.current = true;
    setWarnMsg(`Interview terminated — ${reason}`);
    setWarnSeverity('rose');
    setShowWarnBanner(true);
    vapiService.stopWebInterview?.();
    const dur = stopTimer();
    stopDetection();
    setPhase('saving');
    const result = await saveResult(dur, reason);
    setPhase('error');
    setErrorMsg(`Your interview was automatically terminated: ${reason}. This session has been flagged for review.`);
    onError?.({ message: `Terminated: ${reason}`, terminated: true, result });
  }, [stopTimer, stopDetection, saveResult, onError]);

  const triggerWarning = useCallback((type, violationType, desc) => {
    if (warnCoolRef.current || terminated.current) return;
    warnCoolRef.current = true;
    setTimeout(() => { warnCoolRef.current = false; }, 5000);
    tabWarnsRef.current += 1;
    const n = tabWarnsRef.current;
    setTabWarnings(n);
    logViolation(violationType, 'high', desc);
    if (n >= 3) { terminate(type); return; }
    const left = 3 - n;
    setWarnMsg(`Warning ${n} of 3 — ${type}. ${left} remaining before termination.`);
    setWarnSeverity('amber');
    setShowWarnBanner(true);
    setTimeout(() => setShowWarnBanner(false), 5000);
    window.focus();
  }, [logViolation, terminate]);

  const reenterFullscreen = useCallback(async () => { try { await document.documentElement.requestFullscreen(); } catch {} }, []);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && isLive) { reenterFullscreen(); triggerWarning('Fullscreen exited', 'fullscreen_exit', 'Candidate exited fullscreen'); }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isLive, reenterFullscreen, triggerWarning]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden && isLive) { triggerWarning('Tab switch detected', 'tab_switch', 'Candidate switched tab or minimized'); window.focus(); } };
    const onBlur = () => { if (phase === 'active') logViolation('window_blur', 'medium', 'Window lost focus'); };
    const onBeforeUnload = (e) => { if (isLive) { e.preventDefault(); e.returnValue = 'Interview in progress.'; return e.returnValue; } };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onBlur); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [phase, isLive, triggerWarning, logViolation]);

  const startFaceDetection = useCallback(() => {
    const W = 160, H = 90;
    if (!canvasRef.current) { canvasRef.current = document.createElement('canvas'); canvasRef.current.width = W; canvasRef.current.height = H; }
    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext('2d');
    const isSkin = (r, g, b) => r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15 && r < 250 && Math.max(r, g, b) - Math.min(r, g, b) > 10;
    faceCheckRef.current = setInterval(() => {
      const video = candidateVideoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        ctx2d.drawImage(video, 0, 0, W, H);
        const { data } = ctx2d.getImageData(0, 0, W, H);
        const mask = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) { const p = i * 4; mask[i] = isSkin(data[p], data[p + 1], data[p + 2]) ? 1 : 0; }
        const visited = new Uint8Array(W * H);
        const blobs = [];
        for (let start = 0; start < W * H; start++) {
          if (!mask[start] || visited[start]) continue;
          const queue = [start]; visited[start] = 1;
          let minX = W, maxX = 0, minY = H, maxY = 0, size = 0, qi = 0;
          while (qi < queue.length) {
            const idx = queue[qi++]; const x = idx % W, y = Math.floor(idx / W);
            size++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
            for (const nb of [idx - 1, idx + 1, idx - W, idx + W]) {
              if (nb >= 0 && nb < W * H && mask[nb] && !visited[nb] && Math.abs((nb % W) - (idx % W)) <= 1) { visited[nb] = 1; queue.push(nb); }
            }
          }
          const blobW = maxX - minX, blobH = maxY - minY;
          if (blobW >= 10 && blobH >= 12 && size >= 120) blobs.push({ minX, maxX, minY, maxY, size });
        }
        const merged = [];
        for (const blob of blobs) {
          let found = false;
          for (const m of merged) {
            if (Math.min(blob.maxX, m.maxX) - Math.max(blob.minX, m.minX) > -20 && Math.min(blob.maxY, m.maxY) - Math.max(blob.minY, m.minY) > -20) {
              m.minX = Math.min(m.minX, blob.minX); m.maxX = Math.max(m.maxX, blob.maxX);
              m.minY = Math.min(m.minY, blob.minY); m.maxY = Math.max(m.maxY, blob.maxY);
              m.size += blob.size; found = true; break;
            }
          }
          if (!found) merged.push({ ...blob });
        }
        const faces = merged.filter(b => (b.maxX - b.minX) >= 12 && (b.maxY - b.minY) >= 15);
        if (faces.length >= 2) triggerWarning('Multiple faces detected', 'multiple_faces', `${faces.length} faces detected`);
      } catch {}
    }, 3000);
  }, [triggerWarning]);

  const stopFaceDetection = useCallback(() => clearInterval(faceCheckRef.current), []);

  const startVoiceDetection = useCallback(() => {
    voiceBaselineRef.current = 0;
    let calibFrames = 0, calibSum = 0, calibrated = false, suspiciousStreak = 0;
    voiceCheckRef.current = setInterval(() => {
      const analyser = micAnalyserRef.current;
      if (!analyser) return;
      const fftSize = analyser.fftSize;
      const sampleRate = micAudioCtxRef.current?.sampleRate || 44100;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);
      const hzPerBin = sampleRate / fftSize;
      const lo = Math.floor(300 / hzPerBin), hi = Math.ceil(3400 / hzPerBin);
      const bandMax = Math.max(...buf.slice(lo, hi));
      const threshold = Math.max(40, bandMax * 0.6);
      const MIN_DIST = Math.floor(400 / hzPerBin);
      const peaks = [];
      for (let i = lo + 1; i < hi - 1 && i < buf.length - 1; i++) {
        if (buf[i] > threshold && buf[i] > buf[i - 1] && buf[i] > buf[i + 1]) {
          if (peaks.length === 0 || i - peaks[peaks.length - 1] > MIN_DIST) peaks.push(i);
        }
      }
      if (!calibrated) { calibSum += peaks.length; calibFrames++; if (calibFrames >= 5) { voiceBaselineRef.current = calibSum / calibFrames; calibrated = true; } return; }
      const suspicious = peaks.length >= Math.max(3, Math.floor(voiceBaselineRef.current * 2) + 1);
      if (suspicious) { suspiciousStreak++; if (suspiciousStreak >= 4) { suspiciousStreak = 0; triggerWarning('Multiple voices detected', 'multiple_voices', 'Multiple voices on microphone'); } }
      else suspiciousStreak = Math.max(0, suspiciousStreak - 1);
    }, 2000);
  }, [triggerWarning]);

  const stopVoiceDetection = useCallback(() => clearInterval(voiceCheckRef.current), []);

  const startTimer = () => { startTimeRef.current = Date.now(); timerRef.current = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000); };
  const scrollT = () => transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });

  const detectQProgress = useCallback((text) => {
    questions.forEach((q, i) => { if (text.toLowerCase().includes(q.question.slice(0, 20).toLowerCase())) setQuestionsDone(i); });
  }, [questions]);

  useEffect(() => {
    const { vapi } = vapiService;
    const onStart = () => { setPhase('active'); startTimer(); startFaceDetection(); startVoiceDetection(); };
    const onEnd = async () => {
      const dur = stopTimer(); stopFaceDetection(); stopVoiceDetection(); setPhase('saving');
      const result = await saveResult(dur); setPhase('ended'); onComplete?.(result);
    };
    const onSpeechStart = () => setAiSpeaking(true);
    const onSpeechEnd = () => setAiSpeaking(false);
    const onMsg = (msg) => {
      if (msg.type === 'call-update' && msg.call?.id) { callIdRef.current = msg.call.id; vapiService.notifyCallStarted?.(interviewId, msg.call); }
      if (msg.type === 'transcript' && msg.transcriptType === 'partial' && msg.role === 'user') setUserSpeaking(true);
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        if (msg.role === 'assistant') {
          setUserSpeaking(false); currentQuestionRef.current = msg.transcript;
          const e = { role: 'assistant', text: msg.transcript, timestamp: new Date() };
          transcriptAccRef.current = [...transcriptAccRef.current, e]; setTranscript([...transcriptAccRef.current]);
          detectQProgress(msg.transcript); setTimeout(scrollT, 50);
        }
        if (msg.role === 'user') {
          setUserSpeaking(false);
          const e = { role: 'user', text: msg.transcript, question: currentQuestionRef.current, timestamp: new Date() };
          transcriptAccRef.current = [...transcriptAccRef.current, e]; setAnswerCount(c => c + 1);
        }
      }
    };
    const onErr = async (err) => {
      const dur = stopTimer(); stopFaceDetection(); stopVoiceDetection(); setPhase('saving');
      await saveResult(dur); setPhase('error'); setErrorMsg(err?.message || 'An error occurred.');
      onError?.(err);
    };
    vapi.on('call-start', onStart); vapi.on('call-end', onEnd); vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end', onSpeechEnd); vapi.on('message', onMsg); vapi.on('error', onErr);
    return () => {
      vapi.off('call-start', onStart); vapi.off('call-end', onEnd); vapi.off('speech-start', onSpeechStart);
      vapi.off('speech-end', onSpeechEnd); vapi.off('message', onMsg); vapi.off('error', onErr);
      vapi.stop(); clearInterval(timerRef.current); stopFaceDetection(); stopVoiceDetection();
    };
  }, [interviewId, detectQProgress, onComplete, onError, startFaceDetection, stopFaceDetection, startVoiceDetection, stopVoiceDetection, saveResult, stopTimer]);

  const handleStart = async () => {
    if (!job) { setPhase('error'); setErrorMsg('Interview data not loaded.'); return; }
    setPhase('connecting');
    try { await vapiService.startWebInterview(job, candidateName, questions); }
    catch (err) { setPhase('error'); setErrorMsg(err?.message?.includes('Permission') ? 'Microphone permission denied.' : err?.message || 'Failed to start.'); }
  };
  const handleEnd = () => vapiService.stopWebInterview();
  const handleMute = () => { const n = !isMuted; vapiService.setMuted(n); setIsMuted(n); };
  const handleRetry = () => {
    if (terminated.current) return;
    setPhase('ready'); setErrorMsg(''); setTranscript([]); transcriptAccRef.current = [];
    setElapsedSecs(0); callIdRef.current = null; setViolations([]); violationsRef.current = [];
    setFlagged(false); tabWarnsRef.current = 0; setTabWarnings(0); setAnswerCount(0); currentQuestionRef.current = '';
  };

  if (!job) return (
    <div style={{ background: '#09090b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #27272a', borderTopColor: '#71717a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#52525b' }}>Loading interview…</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#09090b', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif', color: '#e4e4e7' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wave { 0%,100%{height:4px} 50%{height:18px} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{transform:translateY(-100%)} to{transform:translateY(0)} }
        .wave-bar { animation: wave 0.7s ease-in-out infinite; }
        .fade-up  { animation: fadeUp 0.3s ease forwards; }
        .slide-dn { animation: slideDown 0.25s ease forwards; }
      `}</style>

      {/* Warning banner */}
      {showWarnBanner && (
        <div className="slide-dn" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: warnSeverity === 'rose' ? '#7f1d1d' : '#78350f',
          borderBottom: `1px solid ${warnSeverity === 'rose' ? '#991b1b' : '#92400e'}`,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fef2f2' }}>{warnMsg}</span>
        </div>
      )}

      {/* Flagged bar */}
      {flagged && !showWarnBanner && (
        <div style={{ padding: '6px 16px', background: '#1a0505', borderBottom: '1px solid #7f1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Session flagged — integrity violations recorded</span>
        </div>
      )}

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid #18181b',
        background: '#09090b', position: 'sticky', top: 0, zIndex: 10,
        marginTop: showWarnBanner || flagged ? 0 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 11, color: '#52525b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{job?.company?.name || 'Interview'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isLive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4,
              border: `1px solid ${tabWarnings === 0 ? '#1f1f1f' : tabWarnings === 1 ? '#854d0e' : tabWarnings === 2 ? '#9a3412' : '#7f1d1d'}`,
              background: tabWarnings === 0 ? 'transparent' : tabWarnings === 1 ? '#1c0d00' : tabWarnings === 2 ? '#1a0800' : '#110303',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={tabWarnings === 0 ? '#3f3f46' : tabWarnings >= 2 ? '#f87171' : '#fb923c'} strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              <span style={{ fontSize: 10, fontWeight: 600, color: tabWarnings === 0 ? '#3f3f46' : tabWarnings >= 2 ? '#f87171' : '#fb923c' }}>{tabWarnings}/3</span>
            </div>
          )}
          {phase === 'active' && (
            <>
              <span style={{ fontSize: 12, color: '#52525b' }}>Q {Math.min(questionsDone + 1, totalQ)}/{totalQ}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: elapsedSecs > durationMins * 60 * 0.8 ? '#f87171' : '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsedSecs)}</span>
              <div style={{ width: 72, height: 2, background: '#27272a', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#3b82f6', borderRadius: 1, width: `${Math.min((elapsedSecs / (durationMins * 60)) * 100, 100)}%`, transition: 'width 1s linear' }} />
              </div>
            </>
          )}
          <PhasePill phase={phase} />
        </div>
      </header>

      {/* Body */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: AI panel */}
        <div style={{ width: '38%', borderRight: '1px solid #18181b', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          {/* AI avatar */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%', marginBottom: 14,
            background: aiSpeaking ? '#0c1a3a' : '#0e0e10',
            border: `1px solid ${aiSpeaking ? '#1e3a5f' : '#1f1f1f'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.4s, border-color 0.4s',
          }}>
            <svg width="42" height="42" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="22" r="14" stroke={aiSpeaking ? '#3b82f6' : '#3f3f46'} strokeWidth="1.5" />
              <circle cx="26" cy="20" r="2.5" fill={aiSpeaking ? '#60a5fa' : '#52525b'} />
              <circle cx="38" cy="20" r="2.5" fill={aiSpeaking ? '#60a5fa' : '#52525b'} />
              <path d="M26 27 Q32 31 38 27" stroke={aiSpeaking ? '#60a5fa' : '#52525b'} strokeWidth="1.5" strokeLinecap="round" />
              <path d="M18 42 Q32 36 46 42" stroke={aiSpeaking ? '#3b82f6' : '#3f3f46'} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <p style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', marginBottom: 2 }}>AI Interviewer</p>
          <p style={{ fontSize: 11, color: '#52525b', marginBottom: 16 }}>{job?.title || 'Interview Session'}</p>

          {/* Speaking indicator */}
          <div style={{ height: 24, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 20 }}>
            {aiSpeaking ? (
              <>
                {[0, 0.1, 0.2, 0.15, 0.05].map((d, i) => (
                  <div key={i} className="wave-bar" style={{ width: 3, background: '#3b82f6', borderRadius: 2, animationDelay: `${d}s` }} />
                ))}
                <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: 6 }}>Speaking</span>
              </>
            ) : userSpeaking ? (
              <>
                {[0, 0.1, 0.2, 0.15, 0.05].map((d, i) => (
                  <div key={i} className="wave-bar" style={{ width: 3, background: '#22c55e', borderRadius: 2, animationDelay: `${d}s` }} />
                ))}
                <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: 6 }}>Listening</span>
              </>
            ) : phase === 'active' ? (
              <span style={{ fontSize: 11, color: '#3f3f46' }}>Standby</span>
            ) : null}
          </div>

          {/* Controls */}
          {phase === 'ready' && (
            <button
              onClick={handleStart}
              style={{ padding: '10px 28px', background: '#fafafa', color: '#09090b', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', maxWidth: 220 }}
            >
              Begin interview
            </button>
          )}
          {phase === 'connecting' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', border: '1px solid #27272a', borderRadius: 6 }}>
              <div style={{ width: 14, height: 14, border: '2px solid #3f3f46', borderTopColor: '#a1a1aa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#71717a' }}>Connecting…</span>
            </div>
          )}
          {phase === 'active' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleMute} style={{
                width: 44, height: 44, borderRadius: '50%', border: `1px solid ${isMuted ? '#7f1d1d' : '#27272a'}`,
                background: isMuted ? '#1a0505' : '#111113', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                {isMuted ? <MicOffSvg /> : <MicSvg />}
              </button>
              <button onClick={handleEnd} style={{
                width: 44, height: 44, borderRadius: '50%', border: '1px solid #7f1d1d',
                background: '#1a0505', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <PhoneSvg />
              </button>
            </div>
          )}
          {phase === 'saving' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', border: '1px solid #27272a', borderRadius: 6 }}>
              <div style={{ width: 14, height: 14, border: '2px solid #27272a', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#71717a' }}>Saving…</span>
            </div>
          )}
          {phase === 'ended' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#0a1a0a', border: '1px solid #14532d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p style={{ fontSize: 13, color: '#52525b' }}>Interview complete</p>
            </div>
          )}
          {phase === 'error' && (
            <div style={{ width: '100%', maxWidth: 220 }}>
              <div style={{ padding: '10px 14px', background: '#110303', border: '1px solid #7f1d1d', borderRadius: 6, marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.55 }}>{errorMsg}</p>
              </div>
              {!terminated.current && (
                <button onClick={handleRetry} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #27272a', borderRadius: 6, color: '#71717a', fontSize: 12, cursor: 'pointer' }}>
                  Try again
                </button>
              )}
            </div>
          )}

          {phase === 'ready' && (
            <div style={{ marginTop: 24, width: '100%', maxWidth: 220, paddingTop: 16, borderTop: '1px solid #18181b' }}>
              {[['Quiet room', '🎤'], ['Good lighting', '💡'], ['Stable WiFi', '📶'], ['Face visible', '👁']].map(([label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#3f3f46', flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: '#52525b' }}>{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Camera + transcript */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Camera + monitors */}
          <div style={{ flexShrink: 0, padding: '14px 16px', borderBottom: '1px solid #18181b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#111113', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#52525b', fontWeight: 600 }}>{job?.company?.name?.[0] || '?'}</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#d4d4d8' }}>{job?.title || 'Interview'}</p>
                <p style={{ fontSize: 10, color: '#52525b' }}>{job?.company?.name} · {totalQ} questions · {durationMins} min</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* Camera */}
              <div style={{
                position: 'relative', borderRadius: 8, overflow: 'hidden',
                border: `1px solid ${flagged ? '#7f1d1d' : '#27272a'}`,
                background: '#0a0a0b', width: 200, aspectRatio: '16/9', flexShrink: 0,
              }}>
                {cameraError ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    <p style={{ fontSize: 9, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No camera</p>
                  </div>
                ) : (
                  <video ref={candidateVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                )}
                <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.75)', padding: '2px 6px', borderRadius: 3 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ fontSize: 8, color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>You</span>
                </div>
                {tabWarnings > 0 && (
                  <div style={{ position: 'absolute', top: 6, right: 6, padding: '2px 5px', borderRadius: 3, background: tabWarnings >= 3 ? '#7f1d1d' : '#78350f', fontSize: 8, color: 'white', fontWeight: 600 }}>
                    {tabWarnings}/3
                  </div>
                )}
              </div>

              {/* Monitors */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Mic level */}
                <div style={{ padding: '8px 10px', border: '1px solid #1a1a1a', borderRadius: 6, background: '#0c0c0e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 9, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Mic level</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: micLevel > 8 ? '#22c55e' : '#27272a' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 20 }}>
                    {Array.from({ length: 16 }, (_, i) => {
                      const on = micLevel > (i / 16) * 100;
                      return <div key={i} style={{ flex: 1, borderRadius: 1, background: on ? (micLevel > 75 ? '#ef4444' : '#22c55e') : '#1f1f1f', height: on ? `${Math.max(20, micLevel)}%` : '20%', transition: 'background 0.1s' }} />;
                    })}
                  </div>
                </div>

                {/* Integrity */}
                <div style={{ padding: '8px 10px', border: '1px solid #1a1a1a', borderRadius: 6, background: '#0c0c0e' }}>
                  <p style={{ fontSize: 9, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>Integrity</p>
                  {[
                    ['Warnings', `${tabWarnings}/3`, tabWarnings === 0, tabWarnings > 0 && tabWarnings < 3, tabWarnings >= 3],
                    ['Violations', violations.length, violations.length === 0, violations.length > 0 && !flagged, flagged],
                    ['Status', flagged ? 'Flagged' : 'Clear', !flagged, false, flagged],
                  ].map(([label, value, ok, warn, bad]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#52525b' }}>{label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: bad ? '#f87171' : warn ? '#fb923c' : ok ? '#4ade80' : '#71717a' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {isLive && (
                  <div style={{ padding: '8px 10px', border: '1px solid #14532d', borderRadius: 6, background: '#0a1a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#3f3f46' }}>Answers captured</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#4ade80' }}>{answerCount}/{totalQ}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Interview transcript</span>
              {transcript.filter(m => m.role === 'assistant').length > 0 && (
                <span style={{ fontSize: 10, color: '#3f3f46' }}>{transcript.filter(m => m.role === 'assistant').length} questions</span>
              )}
            </div>

            <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4, minHeight: 0 }}>
              {phase === 'ready' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#111113', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                  </div>
                  <p style={{ fontSize: 12, color: '#52525b', maxWidth: 240, lineHeight: 1.6 }}>AI questions will appear here. Your answers are captured automatically via voice.</p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[['Questions', totalQ], ['Duration', `~${durationMins}m`], ['Mode', 'Voice']].map(([l, v]) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa' }}>{v}</p>
                        <p style={{ fontSize: 9, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(phase === 'connecting' || (phase === 'active' && transcript.filter(m => m.role === 'assistant').length === 0)) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3f3f46', fontSize: 12, marginTop: 16 }}>
                  {[0, 150, 300].map(d => <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#3f3f46', animation: `wave 1s ease-in-out infinite`, animationDelay: `${d}ms` }} />)}
                  <span style={{ marginLeft: 4 }}>Waiting for first question…</span>
                </div>
              )}

              {transcript.filter(m => m.role === 'assistant').map((msg, i) => (
                <div key={i} className="fade-up" style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1e1b4b', border: '1px solid #312e81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#818cf8', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>AI</div>
                  <div>
                    <div style={{ background: '#111113', border: '1px solid #1f1f1f', borderRadius: 8, borderTopLeftRadius: 2, padding: '8px 12px', maxWidth: '80%' }}>
                      <p style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.55 }}>{msg.text}</p>
                    </div>
                    <span style={{ fontSize: 9, color: '#3f3f46', paddingLeft: 4, marginTop: 3, display: 'block' }}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}

              {userSpeaking && phase === 'active' && (
                <div className="fade-up" style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#052e16', border: '1px solid #166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#4ade80', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>U</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: '#0a1a0a', border: '1px solid #14532d', borderRadius: 8, borderTopRightRadius: 2 }}>
                    {[0, 100, 200].map(d => <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', opacity: 0.7, animation: `wave 1s ease-in-out infinite`, animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              )}

              {phase === 'ended' && (
                <div className="fade-up" style={{ marginTop: 8, padding: '12px 14px', background: '#0a1a0a', border: '1px solid #14532d', borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 4 }}>Interview complete</p>
                  <p style={{ fontSize: 12, color: '#52525b', lineHeight: 1.6 }}>Your responses have been recorded and will be reviewed by the team. Expect feedback within 2–3 business days.</p>
                  {flagged && <p style={{ fontSize: 10, color: '#f87171', marginTop: 6, fontWeight: 600 }}>This session has been flagged for integrity review.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PhasePill({ phase }) {
  const c = {
    ready:      { dot: '#3f3f46', text: '#52525b', label: 'Ready' },
    connecting: { dot: '#fbbf24', text: '#f59e0b', label: 'Connecting' },
    active:     { dot: '#22c55e', text: '#4ade80', label: 'Live' },
    saving:     { dot: '#60a5fa', text: '#93c5fd', label: 'Saving' },
    ended:      { dot: '#3f3f46', text: '#52525b', label: 'Completed' },
    error:      { dot: '#ef4444', text: '#f87171', label: 'Error' },
  }[phase] || { dot: '#3f3f46', text: '#52525b', label: 'Ready' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: c.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</span>
    </div>
  );
}
function MicSvg() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>; }
function MicOffSvg() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>; }
function PhoneSvg() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 014.43 9.68 19.79 19.79 0 011.36 1.05 2 2 0 013.34 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.32 8.91" /><line x1="23" y1="1" x2="1" y2="23" /></svg>; }