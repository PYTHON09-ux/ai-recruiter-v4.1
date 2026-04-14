import { useState, useRef, useEffect, useCallback } from 'react';
import vapiService from '../../services/vapiService';

// ─────────────────────────────────────────────────────────────────────────────
//  VoiceInterviewComponent
//
//  KEY FIXES vs original:
//  1. terminate() now saves interview data BEFORE setting error phase
//  2. saveResult() extracted as a shared helper called by both onEnd + terminate
//  3. Face detection — uses connected-component labelling instead of zone
//     heuristic which was flagging single centered faces constantly
//  4. Voice detection — baseline calibration prevents false positives on
//     normal speech harmonics; only fires when energy significantly exceeds baseline
//  5. Removed: MagicLinkInterviewPage imports (wrong file), unused `application`
//     import in interviewService, unused `getDaysAgo` / `answerCount` display logic
//     that was counting AI turns, not user turns
// ─────────────────────────────────────────────────────────────────────────────

export default function VoiceInterviewComponent({
  token,
  jobData,
  candidateName = 'Candidate',
  interviewId,
  questions: questionsProp = [],
  onComplete,
  onError,
}) {
  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('ready');
  // 'ready' | 'connecting' | 'active' | 'saving' | 'ended' | 'error'

  // ── Speech / AI ───────────────────────────────────────────────────────────
  const [isMuted,       setIsMuted]       = useState(false);
  const [aiSpeaking,    setAiSpeaking]    = useState(false);
  const [userSpeaking,  setUserSpeaking]  = useState(false);
  const [transcript,    setTranscript]    = useState([]);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [elapsedSecs,   setElapsedSecs]   = useState(0);
  const [questionsDone, setQuestionsDone] = useState(0);
  const [answerCount,   setAnswerCount]   = useState(0);

  // ── Camera / audio ────────────────────────────────────────────────────────
  const [cameraError, setCameraError] = useState(false);
  const [micLevel,    setMicLevel]    = useState(0);
  const candidateVideoRef = useRef(null);
  const cameraStreamRef   = useRef(null);
  const micAudioCtxRef    = useRef(null);
  const micAnalyserRef    = useRef(null);
  const micAnimRef        = useRef(null);

  // ── Proctoring ────────────────────────────────────────────────────────────
  const [tabWarnings,    setTabWarnings]    = useState(0);
  const [showWarnBanner, setShowWarnBanner] = useState(false);
  const [warnMsg,        setWarnMsg]        = useState('');
  const [warnSeverity,   setWarnSeverity]   = useState('amber');
  const [violations,     setViolations]     = useState([]);
  const [flagged,        setFlagged]        = useState(false);
  const tabWarnsRef    = useRef(0);
  const violationsRef  = useRef([]);
  const warnCoolRef    = useRef(false);
  const faceCheckRef   = useRef(null);
  const voiceCheckRef  = useRef(null);
  const canvasRef      = useRef(null);
  // Voice baseline: rolling average of peak counts during silence/normal speech
  const voiceBaselineRef  = useRef(0);
  const voiceFrameRef     = useRef(0);
  const terminated        = useRef(false);

  // ── Core refs ─────────────────────────────────────────────────────────────
  const transcriptRef      = useRef(null);
  const callIdRef          = useRef(null);
  const startTimeRef       = useRef(null);
  const timerRef           = useRef(null);
  const transcriptAccRef   = useRef([]);
  const currentQuestionRef = useRef('');

  // ── Job normalisation ─────────────────────────────────────────────────────
  const job          = jobData?._doc ?? jobData ?? null;
  const questions    = questionsProp.length > 0 ? questionsProp : (job?.interviewQuestions || []);
  const totalQ       = questions.length;
  const durationMins = job?.interviewDuration || 10;

  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ─────────────────────────────────────────────────────────────────────────
  //  CAMERA + MIC SETUP
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360, facingMode: 'user' },
          audio: true,
        });
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

  // ─────────────────────────────────────────────────────────────────────────
  //  VIOLATION LOGGER
  // ─────────────────────────────────────────────────────────────────────────
  const logViolation = useCallback((type, severity, desc) => {
    const v = { type, severity, desc, ts: new Date().toISOString() };
    violationsRef.current = [...violationsRef.current, v];
    setViolations([...violationsRef.current]);
    if (violationsRef.current.filter(x => x.severity === 'high').length >= 2) {
      setFlagged(true);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  SHARED SAVE RESULT — called by both normal end AND termination
  //  FIX: termination was calling onError before saving, losing all data
  // ─────────────────────────────────────────────────────────────────────────
  const saveResult = useCallback(async (dur, reason = null) => {
    const fullTranscript = transcriptAccRef.current;
    const fv  = violationsRef.current;
    const fl  = fv.filter(v => v.severity === 'high').length >= 2;

    try {
      await vapiService.saveInterviewResult({
        interviewId,
        transcript:           fullTranscript,
        callId:               callIdRef.current,
        durationSeconds:      dur,
        proctoringViolations: fv,
        proctoringFlagged:    fl,
        tabSwitchCount:       tabWarnsRef.current,
        // FIX: send termination reason so backend can mark as completed+flagged
        ...(reason && { terminationReason: reason, terminated: true }),
      });
    } catch (e) {
      console.warn('Save failed:', e.message);
    }

    return { transcript: fullTranscript, callId: callIdRef.current, durationSeconds: dur, proctoringViolations: fv, proctoringFlagged: fl };
  }, [interviewId]);

  // ─────────────────────────────────────────────────────────────────────────
  //  TERMINATE — FIX: now saves data before showing error
  // ─────────────────────────────────────────────────────────────────────────
  const stopDetection = useCallback(() => {
    clearInterval(faceCheckRef.current);
    clearInterval(voiceCheckRef.current);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    return Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
  }, []);

  const terminate = useCallback(async (reason) => {
    if (terminated.current) return;
    terminated.current = true;

    setWarnMsg(`⛔  Interview terminated — ${reason}`);
    setWarnSeverity('rose');
    setShowWarnBanner(true);

    // Stop vapi immediately to prevent further audio
    vapiService.stopWebInterview?.();
    const dur = stopTimer();
    stopDetection();

    setPhase('saving');

    // FIX: Save data first, THEN call onError
    const result = await saveResult(dur, reason);

    setPhase('error');
    setErrorMsg(`Your interview was automatically terminated: ${reason}. This session has been flagged for review.`);

    // Pass full result to parent so MagicLinkInterviewPage can show completion screen
    onError?.({
      message:    `Terminated: ${reason}`,
      terminated: true,
      result,
    });
  }, [stopTimer, stopDetection, saveResult, onError]);

  // ─────────────────────────────────────────────────────────────────────────
  //  WARNING TRIGGER
  // ─────────────────────────────────────────────────────────────────────────
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
    setWarnMsg(`⚠  Warning ${n}/3 — ${type}. ${left} warning${left !== 1 ? 's' : ''} remaining before termination.`);
    setWarnSeverity('amber');
    setShowWarnBanner(true);
    setTimeout(() => setShowWarnBanner(false), 5000);
    window.focus();
  }, [logViolation, terminate]);

  // ─────────────────────────────────────────────────────────────────────────
  //  FULLSCREEN
  // ─────────────────────────────────────────────────────────────────────────
  const reenterFullscreen = useCallback(async () => {
    try { await document.documentElement.requestFullscreen(); } catch {}
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && (phase === 'active' || phase === 'connecting')) {
        reenterFullscreen();
        triggerWarning('Fullscreen exited', 'fullscreen_exit', 'Candidate exited fullscreen');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [phase, reenterFullscreen, triggerWarning]);

  // ─────────────────────────────────────────────────────────────────────────
  //  TAB SWITCH
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && (phase === 'active' || phase === 'connecting')) {
        triggerWarning('Tab switch detected', 'tab_switch', 'Candidate switched tab or minimized window');
        window.focus();
      }
    };
    const onBlur = () => {
      if (phase === 'active') logViolation('window_blur', 'medium', 'Window lost focus');
    };
    const onBeforeUnload = (e) => {
      if (phase === 'active' || phase === 'connecting') {
        e.preventDefault();
        e.returnValue = 'Your interview is still in progress. Leaving will terminate it.';
        return e.returnValue;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [phase, triggerWarning, logViolation]);

  // ─────────────────────────────────────────────────────────────────────────
  //  FACE DETECTION — FIX: connected-component approach
  //
  //  Original zone heuristic split the frame into 3 horizontal bands and
  //  checked if left+right both had skin — this fired constantly for a single
  //  person sitting slightly off-center. 
  //
  //  New approach:
  //  1. Classify each pixel as skin/non-skin
  //  2. Run a fast flood-fill to find connected skin blobs
  //  3. Count blobs whose bounding box exceeds a minimum face size
  //  4. If >= 2 such blobs → multiple faces
  // ─────────────────────────────────────────────────────────────────────────
  const startFaceDetection = useCallback(() => {
    const W = 160, H = 90;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width  = W;
      canvasRef.current.height = H;
    }
    const canvas = canvasRef.current;
    const ctx2d  = canvas.getContext('2d');

    const isSkin = (r, g, b) =>
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      (r - g) > 15 &&
      r < 250 && // exclude near-white
      Math.max(r, g, b) - Math.min(r, g, b) > 10;

    faceCheckRef.current = setInterval(() => {
      const video = candidateVideoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        ctx2d.drawImage(video, 0, 0, W, H);
        const { data } = ctx2d.getImageData(0, 0, W, H);

        // Build skin mask (1 = skin, 0 = not)
        const mask = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) {
          const p = i * 4;
          mask[i] = isSkin(data[p], data[p + 1], data[p + 2]) ? 1 : 0;
        }

        // BFS flood-fill to find connected components
        const visited = new Uint8Array(W * H);
        const blobs = [];

        for (let start = 0; start < W * H; start++) {
          if (!mask[start] || visited[start]) continue;
          // BFS
          const queue = [start];
          visited[start] = 1;
          let minX = W, maxX = 0, minY = H, maxY = 0, size = 0;
          let qi = 0;
          while (qi < queue.length) {
            const idx = queue[qi++];
            const x = idx % W, y = Math.floor(idx / W);
            size++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            // 4-connected neighbours
            const neighbours = [idx - 1, idx + 1, idx - W, idx + W];
            for (const nb of neighbours) {
              if (nb >= 0 && nb < W * H && mask[nb] && !visited[nb]) {
                const nx = nb % W;
                // Prevent wrap-around on left/right edges
                if (Math.abs(nx - (idx % W)) <= 1) {
                  visited[nb] = 1;
                  queue.push(nb);
                }
              }
            }
          }
          const blobW = maxX - minX, blobH = maxY - minY;
          // Minimum face blob: at least 10×12 pixels at 160×90 resolution
          // (scales to ~40×48 at 640×360) — filters out hair/neck noise
          if (blobW >= 10 && blobH >= 12 && size >= 120) {
            blobs.push({ minX, maxX, minY, maxY, size });
          }
        }

        // Merge overlapping or adjacent blobs (faces have ears/neck gaps)
        const merged = [];
        for (const blob of blobs) {
          let found = false;
          for (const m of merged) {
            const overlapX = Math.min(blob.maxX, m.maxX) - Math.max(blob.minX, m.minX);
            const overlapY = Math.min(blob.maxY, m.maxY) - Math.max(blob.minY, m.minY);
            if (overlapX > -20 && overlapY > -20) { // allow 20px gap
              m.minX = Math.min(m.minX, blob.minX);
              m.maxX = Math.max(m.maxX, blob.maxX);
              m.minY = Math.min(m.minY, blob.minY);
              m.maxY = Math.max(m.maxY, blob.maxY);
              m.size += blob.size;
              found = true; break;
            }
          }
          if (!found) merged.push({ ...blob });
        }

        // Only count merged blobs large enough to be a face region
        const faces = merged.filter(b => (b.maxX - b.minX) >= 12 && (b.maxY - b.minY) >= 15);

        if (faces.length >= 2) {
          triggerWarning('Multiple faces detected', 'multiple_faces', `${faces.length} faces detected in camera frame`);
        }
      } catch { /* canvas security error on some browsers */ }
    }, 3000);
  }, [triggerWarning]);

  const stopFaceDetection = useCallback(() => clearInterval(faceCheckRef.current), []);

  // ─────────────────────────────────────────────────────────────────────────
  //  VOICE DETECTION — FIX: baseline calibration
  //
  //  Original: counted spectral peaks > fixed threshold=80. Normal speech
  //  has many harmonics → easily gets 2+ peaks → constant false positives.
  //
  //  New approach:
  //  1. During first 5s calibrate baseline peak count for this person's voice
  //  2. Only flag when peak count is significantly above baseline (2× + 1)
  //  3. Require 4 consecutive suspicious frames (8s) before warning
  //     (vs original 3 frames / 6s — slightly more lenient to reduce FP)
  // ─────────────────────────────────────────────────────────────────────────
  const startVoiceDetection = useCallback(() => {
    voiceBaselineRef.current = 0;
    voiceFrameRef.current = 0;
    let calibFrames = 0;
    let calibSum = 0;
    let calibrated = false;
    let suspiciousStreak = 0;

    voiceCheckRef.current = setInterval(() => {
      const analyser = micAnalyserRef.current;
      if (!analyser) return;

      const fftSize    = analyser.fftSize;
      const sampleRate = micAudioCtxRef.current?.sampleRate || 44100;
      const buf        = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);

      const hzPerBin = sampleRate / fftSize;
      const lo       = Math.floor(300  / hzPerBin);
      const hi       = Math.ceil(3400  / hzPerBin);

      // Dynamic threshold: 60% of max energy in speech band
      const bandMax   = Math.max(...buf.slice(lo, hi));
      const threshold = Math.max(40, bandMax * 0.6); // adaptive, min 40
      const MIN_DIST  = Math.floor(400 / hzPerBin);  // 400Hz min gap between peaks

      const peaks = [];
      for (let i = lo + 1; i < hi - 1 && i < buf.length - 1; i++) {
        if (buf[i] > threshold && buf[i] > buf[i - 1] && buf[i] > buf[i + 1]) {
          if (peaks.length === 0 || i - peaks[peaks.length - 1] > MIN_DIST) {
            peaks.push(i);
          }
        }
      }

      if (!calibrated) {
        calibSum += peaks.length;
        calibFrames++;
        if (calibFrames >= 5) {
          voiceBaselineRef.current = calibSum / calibFrames;
          calibrated = true;
        }
        return;
      }

      // Flag only when well above baseline
      const suspicious = peaks.length >= Math.max(3, Math.floor(voiceBaselineRef.current * 2) + 1);

      if (suspicious) {
        suspiciousStreak++;
        if (suspiciousStreak >= 4) {
          suspiciousStreak = 0;
          triggerWarning('Multiple voices detected', 'multiple_voices', 'Multiple simultaneous voices detected on microphone');
        }
      } else {
        suspiciousStreak = Math.max(0, suspiciousStreak - 1);
      }
    }, 2000);
  }, [triggerWarning]);

  const stopVoiceDetection = useCallback(() => clearInterval(voiceCheckRef.current), []);

  // ─────────────────────────────────────────────────────────────────────────
  //  TIMER
  // ─────────────────────────────────────────────────────────────────────────
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
  };

  const scrollT = () => transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });

  // ─────────────────────────────────────────────────────────────────────────
  //  Q PROGRESS
  // ─────────────────────────────────────────────────────────────────────────
  const detectQProgress = useCallback((text) => {
    questions.forEach((q, i) => {
      if (text.toLowerCase().includes(q.question.slice(0, 20).toLowerCase())) setQuestionsDone(i);
    });
  }, [questions]);

  // ─────────────────────────────────────────────────────────────────────────
  //  VAPI EVENTS
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { vapi } = vapiService;

    const onStart = () => {
      setPhase('active');
      startTimer();
      startFaceDetection();
      startVoiceDetection();
    };

    const onEnd = async () => {
      const dur = stopTimer();
      stopFaceDetection();
      stopVoiceDetection();
      setPhase('saving');

      const result = await saveResult(dur);

      setPhase('ended');
      onComplete?.(result);
    };

    const onSpeechStart = () => setAiSpeaking(true);
    const onSpeechEnd   = () => setAiSpeaking(false);

    const onMsg = (msg) => {
      if (msg.type === 'call-update' && msg.call?.id) {
        callIdRef.current = msg.call.id;
        vapiService.notifyCallStarted?.(interviewId, msg.call);
      }

      if (msg.type === 'transcript' && msg.transcriptType === 'partial' && msg.role === 'user') {
        setUserSpeaking(true);
      }

      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        if (msg.role === 'assistant') {
          setUserSpeaking(false);
          currentQuestionRef.current = msg.transcript;
          const e = { role: 'assistant', text: msg.transcript, timestamp: new Date() };
          transcriptAccRef.current = [...transcriptAccRef.current, e];
          setTranscript([...transcriptAccRef.current]);
          detectQProgress(msg.transcript);
          setTimeout(scrollT, 50);
        }
        if (msg.role === 'user') {
          setUserSpeaking(false);
          const e = {
            role:      'user',
            text:      msg.transcript,
            question:  currentQuestionRef.current,
            timestamp: new Date(),
          };
          transcriptAccRef.current = [...transcriptAccRef.current, e];
          setAnswerCount(c => c + 1);
        }
      }
    };

    const onErr = async (err) => {
      // FIX: save data even on vapi error
      const dur = stopTimer();
      stopFaceDetection();
      stopVoiceDetection();
      setPhase('saving');
      await saveResult(dur);
      setPhase('error');
      setErrorMsg(err?.message || 'An error occurred during the interview.');
      onError?.(err);
    };

    vapi.on('call-start',   onStart);
    vapi.on('call-end',     onEnd);
    vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end',   onSpeechEnd);
    vapi.on('message',      onMsg);
    vapi.on('error',        onErr);

    return () => {
      vapi.off('call-start',   onStart);
      vapi.off('call-end',     onEnd);
      vapi.off('speech-start', onSpeechStart);
      vapi.off('speech-end',   onSpeechEnd);
      vapi.off('message',      onMsg);
      vapi.off('error',        onErr);
      vapi.stop();
      clearInterval(timerRef.current);
      stopFaceDetection();
      stopVoiceDetection();
    };
  }, [
    interviewId, detectQProgress, onComplete, onError,
    startFaceDetection, stopFaceDetection,
    startVoiceDetection, stopVoiceDetection,
    saveResult, stopTimer,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  //  CONTROLS
  // ─────────────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!job) { setPhase('error'); setErrorMsg('Interview data not loaded.'); return; }
    setPhase('connecting');
    try { await vapiService.startWebInterview(job, candidateName, questions); }
    catch (err) {
      setPhase('error');
      setErrorMsg(err?.message?.includes('Permission') ? 'Microphone permission denied.' : err?.message || 'Failed to start.');
    }
  };

  const handleEnd   = () => vapiService.stopWebInterview();
  const handleMute  = () => { const n = !isMuted; vapiService.setMuted(n); setIsMuted(n); };
  const handleRetry = () => {
    if (terminated.current) return;
    setPhase('ready'); setErrorMsg(''); setTranscript([]);
    transcriptAccRef.current = []; setElapsedSecs(0); callIdRef.current = null;
    setViolations([]); violationsRef.current = [];
    setFlagged(false); tabWarnsRef.current = 0; setTabWarnings(0);
    setAnswerCount(0); currentQuestionRef.current = '';
  };

  if (!job) return (
    <div style={{ fontFamily: "'DM Mono',monospace" }} className="min-h-screen bg-[#070711] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/30 text-sm">Loading interview…</p>
      </div>
    </div>
  );

  const isLive = phase === 'active' || phase === 'connecting';

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER — unchanged from original, only phase logic above was fixed
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Mono',monospace" }} className="min-h-screen bg-[#070711] text-white flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;600;700&display=swap');
        .sora{font-family:'Sora',sans-serif}
        @keyframes ripple{0%{transform:scale(.95);opacity:.8}50%{transform:scale(1.08);opacity:.4}100%{transform:scale(.95);opacity:.8}}
        @keyframes sw{0%,100%{height:4px}50%{height:20px}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{transform:translateY(-110%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes wPulse{0%,100%{opacity:1}50%{opacity:.6}}
        .ripple-ring{animation:ripple 1.8s ease-in-out infinite}
        .wb{animation:sw .6s ease-in-out infinite}
        .wb:nth-child(2){animation-delay:.1s}.wb:nth-child(3){animation-delay:.2s}
        .wb:nth-child(4){animation-delay:.3s}.wb:nth-child(5){animation-delay:.15s}
        .fade-in{animation:fadeIn .4s ease forwards}
        .slide-dn{animation:slideDown .3s ease forwards}
        .wpulse{animation:wPulse 1s ease-in-out infinite}
        .grain::after{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");pointer-events:none;z-index:1}
        .scl::after{content:'';position:absolute;inset:0;border-radius:inherit;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.01) 2px,rgba(255,255,255,.01) 4px);pointer-events:none}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
      `}</style>

      <div className="grain" />

      {/* Warning banner */}
      {showWarnBanner && (
        <div className={`fixed top-0 inset-x-0 z-50 slide-dn px-6 py-3 flex items-center justify-center gap-3 ${warnSeverity === 'rose' ? 'bg-rose-700' : 'bg-amber-600'}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="sora text-white text-sm font-semibold wpulse">{warnMsg}</span>
        </div>
      )}

      {/* Flagged bar */}
      {flagged && !showWarnBanner && (
        <div className="fixed top-0 inset-x-0 z-40 px-4 py-1.5 bg-rose-900/85 border-b border-rose-700/50 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span className="text-[10px] text-rose-300 tracking-widest uppercase">Session flagged — integrity violations recorded</span>
        </div>
      )}

      {/* Header */}
      <header className={`relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 ${showWarnBanner || flagged ? 'mt-10' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />
          <span className="text-xs text-white/40 tracking-widest uppercase">{job?.company?.name || 'Interview'}</span>
        </div>
        <div className="flex items-center gap-5">
          {isLive && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider transition-all ${
              tabWarnings === 0 ? 'border-white/10 text-white/20' :
              tabWarnings === 1 ? 'border-amber-500/40 bg-amber-900/20 text-amber-400' :
              tabWarnings === 2 ? 'border-orange-500/50 bg-orange-900/30 text-orange-400' :
                                  'border-rose-600/60 bg-rose-900/40 text-rose-400'
            }`}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {tabWarnings}/3 warnings
            </div>
          )}
          {phase === 'active' && (
            <>
              <span className="text-xs text-white/30">Q {Math.min(questionsDone + 1, totalQ)}/{totalQ}</span>
              <span className={`text-sm tabular-nums font-medium ${elapsedSecs > durationMins * 60 * .8 ? 'text-rose-400' : 'text-white/60'}`}>{fmt(elapsedSecs)}</span>
              <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min((elapsedSecs / (durationMins * 60)) * 100, 100)}%` }} />
              </div>
            </>
          )}
          <PhasePill phase={phase} />
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex flex-1 overflow-hidden">

        {/* LEFT: AI panel */}
        <div className="flex flex-col items-center justify-center px-10 py-10 w-[38%] border-r border-white/5 shrink-0">

          <div className="relative mb-7">
            {aiSpeaking && <>
              <div className="absolute inset-0 rounded-full border border-blue-400/30 ripple-ring scale-125" />
              <div className="absolute inset-0 rounded-full border border-blue-400/20 ripple-ring scale-150" style={{ animationDelay: '.3s' }} />
            </>}
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${aiSpeaking ? 'bg-gradient-to-br from-blue-600 to-indigo-800 shadow-[0_0_60px_rgba(99,102,241,.4)]' : 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-[0_0_30px_rgba(0,0,0,.6)]'}`}>
              <svg width="54" height="54" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="22" r="14" stroke={aiSpeaking ? '#a5b4fc' : '#475569'} strokeWidth="1.5" />
                <circle cx="26" cy="20" r="2.5" fill={aiSpeaking ? '#a5b4fc' : '#64748b'} />
                <circle cx="38" cy="20" r="2.5" fill={aiSpeaking ? '#a5b4fc' : '#64748b'} />
                <path d="M26 27 Q32 31 38 27" stroke={aiSpeaking ? '#a5b4fc' : '#64748b'} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M18 42 Q32 36 46 42" stroke={aiSpeaking ? '#a5b4fc' : '#475569'} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 48 Q32 58 50 48" stroke={aiSpeaking ? '#818cf8' : '#334155'} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-1 h-7 mb-5">
            {aiSpeaking
              ? (<>{[...Array(5)].map((_, i) => <div key={i} className="w-1 bg-blue-400 rounded-full wb" style={{ animationDelay: `${i * .1}s` }} />)}<span className="ml-3 text-xs text-blue-400 tracking-wider">AI SPEAKING</span></>)
              : userSpeaking
                ? (<>{[...Array(5)].map((_, i) => <div key={i} className="w-1 bg-emerald-400 rounded-full wb" style={{ animationDelay: `${i * .1}s` }} />)}<span className="ml-3 text-xs text-emerald-400 tracking-wider">LISTENING</span></>)
                : phase === 'active' ? <span className="text-xs text-white/20">· · · STANDBY</span> : null}
          </div>

          <p className="sora text-sm font-semibold text-white/80 mb-0.5">AI Interviewer</p>
          <p className="text-[10px] text-white/30 tracking-wider mb-8">{job?.title || 'Interview Session'}</p>

          {phase === 'ready' && (
            <button onClick={handleStart} className="sora w-full max-w-xs py-3.5 bg-white text-black font-semibold rounded-full hover:bg-white/90 active:scale-95 transition-all text-sm shadow-[0_0_30px_rgba(255,255,255,.1)]">
              Begin Interview
            </button>
          )}
          {phase === 'connecting' && (
            <div className="flex items-center gap-3 px-8 py-3.5 rounded-full border border-white/10 bg-white/5">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="sora text-sm text-white/60">Connecting…</span>
            </div>
          )}
          {phase === 'active' && (
            <div className="flex items-center gap-3">
              <button onClick={handleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${isMuted ? 'bg-rose-600/90 hover:bg-rose-500' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}>
                {isMuted ? <MicOffSvg /> : <MicSvg />}
              </button>
              <button onClick={handleEnd} className="w-12 h-12 rounded-full bg-rose-700 hover:bg-rose-600 flex items-center justify-center transition-all active:scale-95 shadow-[0_0_20px_rgba(190,18,60,.3)]">
                <PhoneSvg />
              </button>
            </div>
          )}
          {(phase === 'saving') && (
            <div className="flex items-center gap-3 px-8 py-3.5 rounded-full border border-white/10 bg-white/5">
              <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              <span className="sora text-sm text-white/60">Saving…</span>
            </div>
          )}
          {phase === 'ended' && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2 shadow-[0_0_30px_rgba(52,211,153,.2)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p className="sora text-white/60 text-sm">Interview Complete</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="text-center w-full max-w-xs">
              <div className="px-4 py-3 bg-rose-900/30 border border-rose-800/50 rounded-xl mb-4">
                <p className="text-rose-300 text-sm leading-relaxed">{errorMsg}</p>
              </div>
              {!terminated.current && (
                <button onClick={handleRetry} className="sora px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-all">Try Again</button>
              )}
            </div>
          )}

          {phase === 'ready' && (
            <div className="mt-8 w-full max-w-xs grid grid-cols-2 gap-2 pt-6 border-t border-white/5">
              {[['🎤', 'Quiet room'], ['💡', 'Good lighting'], ['📶', 'Stable WiFi'], ['👁', 'Face visible']].map(([ic, lb]) => (
                <div key={lb} className="flex gap-2 items-center"><span className="text-sm">{ic}</span><p className="sora text-xs text-white/30">{lb}</p></div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Camera + Transcript */}
        <div className="flex flex-1 flex-col overflow-hidden">

          <div className="shrink-0 p-5 border-b border-white/5">
            <div className="flex items-center gap-3 mb-4">
              {job?.company?.logo
                ? <img src={job.company.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                : <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><span className="text-white/30 text-sm">{job?.company?.name?.[0] || '?'}</span></div>}
              <div>
                <p className="sora font-semibold text-white/80 text-sm">{job?.title || 'Interview'}</p>
                <p className="text-[10px] text-white/25">{job?.company?.name} · {totalQ} questions · {durationMins} min</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className={`relative rounded-xl overflow-hidden border scl shrink-0 bg-black ${flagged ? 'border-rose-600/50' : 'border-white/10'}`} style={{ width: '260px', aspectRatio: '16/9' }}>
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                    <div className="text-center">
                      <svg className="w-7 h-7 text-white/20 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        <line x1="1" y1="1" x2="23" y2="23" strokeWidth="1.5" />
                      </svg>
                      <p className="text-white/20 text-[10px]">No camera</p>
                    </div>
                  </div>
                ) : <video ref={candidateVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />}

                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/65 px-1.5 py-0.5 rounded">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                  <span className="text-[9px] text-white/55 uppercase tracking-wider">You</span>
                </div>

                {tabWarnings > 0 && (
                  <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${tabWarnings >= 3 ? 'bg-rose-600' : tabWarnings >= 2 ? 'bg-orange-600' : 'bg-amber-600'}`}>
                    ⚠ {tabWarnings}/3
                  </div>
                )}
                {flagged && <div className="absolute inset-0 border-2 border-rose-500/60 rounded-xl pointer-events-none" />}
              </div>

              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="p-3 rounded-xl border border-white/8 bg-white/[.02]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Mic Level</p>
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${micLevel > 8 ? 'bg-emerald-400' : 'bg-white/15 animate-pulse'}`} />
                  </div>
                  <div className="flex items-end gap-0.5 h-7">
                    {[...Array(18)].map((_, i) => {
                      const on = micLevel > (i / 18) * 100;
                      return <div key={i} className={`flex-1 rounded-sm transition-all duration-75 ${on ? (micLevel > 75 ? 'bg-rose-400' : micLevel > 40 ? 'bg-emerald-400' : 'bg-emerald-700') : 'bg-white/8'}`} style={{ height: on ? `${Math.max(20, micLevel)}%` : '20%' }} />;
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-white/8 bg-white/[.02]">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2.5">Integrity Monitor</p>
                  <div className="space-y-1.5">
                    <IR label="Warnings"        value={`${tabWarnings}/3`}     ok={tabWarnings === 0}       warn={tabWarnings > 0 && tabWarnings < 3} bad={tabWarnings >= 3} />
                    <IR label="Violations"      value={violations.length}       ok={violations.length === 0} warn={violations.length > 0 && !flagged}  bad={flagged} />
                    <IR label="Face detection"  value={isLive ? 'Active' : '—'} ok={isLive} />
                    <IR label="Voice detection" value={isLive ? 'Active' : '—'} ok={isLive} />
                    <IR label="Status"          value={flagged ? 'FLAGGED' : 'CLEAR'} ok={!flagged} bad={flagged} />
                  </div>
                </div>

                {isLive && (
                  <div className="p-3 rounded-xl border border-emerald-900/30 bg-emerald-950/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider">Response Capture</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] text-emerald-400/50">Vapi STT</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/20">Answers captured</span>
                      <span className="text-[10px] font-bold text-emerald-400">{answerCount}/{totalQ}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-5 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-white/25 uppercase tracking-widest">Interview Questions</p>
                <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/8">
                  <span className="text-[9px] text-white/20">AI only</span>
                </div>
              </div>
              {transcript.filter(m => m.role === 'assistant').length > 0 &&
                <span className="text-[10px] text-white/15">{transcript.filter(m => m.role === 'assistant').length} questions</span>}
            </div>

            <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {phase === 'ready' && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </div>
                  <p className="sora text-white/35 text-sm max-w-xs leading-relaxed">AI questions appear here. Your answers are captured automatically via Vapi.</p>
                  <div className="flex items-center gap-4">
                    <S l="Questions" v={totalQ} />
                    <div className="w-px h-5 bg-white/10" />
                    <S l="Duration" v={`~${durationMins}m`} />
                    <div className="w-px h-5 bg-white/10" />
                    <S l="Mode" v="Voice" />
                  </div>
                </div>
              )}

              {(phase === 'connecting' || (phase === 'active' && transcript.filter(m => m.role === 'assistant').length === 0)) && (
                <div className="flex items-center gap-2 text-white/20 text-xs mt-6">
                  {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  <span className="ml-1">Waiting for first question…</span>
                </div>
              )}

              {transcript.filter(m => m.role === 'assistant').map((msg, i) => (
                <div key={i} className="fade-in flex gap-2.5">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] mt-0.5 bg-indigo-900/60 text-indigo-300">AI</div>
                  <div className="flex flex-col gap-0.5 items-start max-w-sm">
                    <p className="text-sm leading-relaxed rounded-2xl rounded-tl-sm px-3.5 py-2 bg-white/5 border border-white/8 text-white/75">{msg.text}</p>
                    <span className="text-[9px] text-white/15 px-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}

              {userSpeaking && phase === 'active' && (
                <div className="fade-in flex gap-2.5 flex-row-reverse">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] mt-0.5 bg-emerald-900/60 text-emerald-300">U</div>
                  <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl rounded-tr-sm bg-emerald-900/20 border border-emerald-800/20">
                    {[0, 100, 200].map(d => <div key={d} className="w-1 h-1 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              )}

              {phase === 'ended' && (
                <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-xl fade-in">
                  <p className="text-xs text-emerald-400 uppercase tracking-widest mb-1">Interview Complete</p>
                  <p className="text-white/45 text-sm leading-relaxed">Your responses have been recorded. Feedback within 2–3 business days.</p>
                  <p className="text-[10px] text-white/20 mt-2">{answerCount} answer{answerCount !== 1 ? 's' : ''} captured via Vapi STT</p>
                  {flagged && <p className="text-[10px] text-rose-400/70 uppercase tracking-wider mt-2">⚠ This session has been flagged for integrity review.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Mini helpers ───────────────────────────────────────────────────────────────
function S({ l, v }) {
  return <div className="text-center"><p className="sora text-sm font-bold text-white/55">{v}</p><p className="text-[9px] text-white/20 uppercase tracking-wider">{l}</p></div>;
}
function IR({ label, value, ok, warn, bad }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/25">{label}</span>
      <span className={`text-[10px] font-bold ${bad ? 'text-rose-400' : warn ? 'text-amber-400' : ok ? 'text-emerald-400' : 'text-white/30'}`}>{value}</span>
    </div>
  );
}
function PhasePill({ phase }) {
  const c = {
    ready:      { dot: 'bg-white/30',               tx: 'text-white/30',   lb: 'Ready' },
    connecting: { dot: 'bg-yellow-400 animate-pulse', tx: 'text-yellow-400', lb: 'Connecting' },
    active:     { dot: 'bg-emerald-400',              tx: 'text-emerald-400', lb: 'Live' },
    saving:     { dot: 'bg-blue-400 animate-pulse',   tx: 'text-blue-400',   lb: 'Saving' },
    ended:      { dot: 'bg-white/30',                 tx: 'text-white/30',   lb: 'Completed' },
    error:      { dot: 'bg-rose-400',                 tx: 'text-rose-400',   lb: 'Error' },
  }[phase] || { dot: 'bg-white/30', tx: 'text-white/30', lb: 'Ready' };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={`text-xs uppercase tracking-widest ${c.tx}`}>{c.lb}</span>
    </div>
  );
}
function MicSvg()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>; }
function MicOffSvg() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>; }
function PhoneSvg()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 014.43 9.68 19.79 19.79 0 011.36 1.05 2 2 0 013.34 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.32 8.91" /><line x1="23" y1="1" x2="1" y2="23" /></svg>; }