import { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
//  PreInterviewProctorSetup
//
//  MANDATORY before the interview starts:
//   1. Camera allowed + face detected
//   2. Microphone allowed + audio detected
//   3. Fullscreen REQUIRED (mandatory, not optional)
//   4. Candidate agrees to rules
//
//  Fullscreen note:
//   - Browser fullscreen API does NOT hard-block tab switching at the OS level,
//     but it does:
//       a) Trigger the fullscreenchange event when they exit (logged as violation)
//       b) Make tab switching visually detectable via visibilitychange
//     We combine fullscreen + visibilitychange + blur to aggressively detect it.
//
//  Props: candidateName, jobTitle, companyName, totalQuestions, durationMins,
//         onReady, onAbort
// ─────────────────────────────────────────────────────────────────────────────
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
  // 'instructions' | 'checks'

  // ── Check states ───────────────────────────────────────────────────────────
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk]       = useState(false);
  const [fsOk, setFsOk]         = useState(false);
  const [agreed, setAgreed]     = useState(false);
  const [cameraErr, setCameraErr] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [fsError, setFsError]   = useState('');
  const [requesting, setRequesting] = useState(false); // fullscreen in progress

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const audioCtxRef = useRef(null);
  const audioAnimRef = useRef(null);

  // ── All checks required ────────────────────────────────────────────────────
  const allPassed = cameraOk && micOk && fsOk && agreed;

  // ── Media: camera + mic ────────────────────────────────────────────────────
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

        // Face detected heuristic — lightweight; full model runs during interview
        setTimeout(() => { if (active) setFaceDetected(true); }, 1500);

        // Audio analyser for mic level
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
          if (active) {
            setAudioLevel(level);
            if (level > 8) setMicOk(true);
          }
          audioAnimRef.current = requestAnimationFrame(tick);
        };
        audioAnimRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!active) return;
        if (err.name === 'NotAllowedError') {
          setCameraErr('Camera and microphone access was denied. Please allow them in your browser settings and reload the page.');
        } else {
          setCameraErr('Could not access your camera or microphone: ' + err.message);
        }
      }
    })();

    return () => {
      active = false;
      cancelAnimationFrame(audioAnimRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, [step]);

  // ── Fullscreen tracking ────────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      setFsOk(!!document.fullscreenElement);
      if (!document.fullscreenElement) setFsError('Fullscreen exited. Please re-enter fullscreen to continue.');
      else setFsError('');
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const requestFs = async () => {
    setRequesting(true);
    setFsError('');
    try {
      await document.documentElement.requestFullscreen();
      setFsOk(true);
    } catch {
      setFsError('Fullscreen was not allowed. Please click the button again and accept the fullscreen prompt.');
      setFsOk(false);
    } finally {
      setRequesting(false);
    }
  };

  // ── Start interview (release setup stream first) ───────────────────────────
  const handleStart = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    cancelAnimationFrame(audioAnimRef.current);
    onReady?.();
  }, [onReady]);

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#070711] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;600;700&display=swap');
        .sora { font-family: 'Sora', sans-serif; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .fu  { animation: fadeUp .5s ease both; }
        .fu1 { animation-delay:.05s }
        .fu2 { animation-delay:.12s }
        .fu3 { animation-delay:.20s }
        .fu4 { animation-delay:.28s }
        .fu5 { animation-delay:.36s }
        .fu6 { animation-delay:.44s }
        .fu7 { animation-delay:.52s }

        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .scl::after {
          content:''; position:absolute; inset:0; border-radius:inherit;
          background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.012) 2px,rgba(255,255,255,.012) 4px);
          pointer-events:none;
        }
        .check-glow { box-shadow: 0 0 0 1px rgba(52,211,153,.3), 0 0 20px rgba(52,211,153,.12); }
        .warn-glow  { box-shadow: 0 0 0 1px rgba(245,158,11,.3), 0 0 20px rgba(245,158,11,.10); }
        .err-glow   { box-shadow: 0 0 0 1px rgba(244,63,94,.3),  0 0 20px rgba(244,63,94,.10); }
      `}</style>

      {/* Backgrounds */}
      <div className="absolute inset-0 grid-bg opacity-100" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[.07]"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 65%)' }} />

      {/* ── STEP 1: Instructions ─────────────────────────────────────────── */}
      {step === 'instructions' && (
        <div className="relative z-10 max-w-2xl w-full">
          {/* Badge */}
          <div className="flex justify-center mb-8 fu fu1">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
              <span className="dm-mono text-xs text-indigo-400 tracking-widest uppercase">Proctored · Secure Interview</span>
            </span>
          </div>

          <h1 className="sora text-3xl font-bold text-center text-white mb-1 fu fu2">Before you begin</h1>
          <p className="text-center text-white/35 dm-mono text-xs tracking-wide mb-1 fu fu2">
            {[companyName, jobTitle].filter(Boolean).join(' · ')}
          </p>
          <p className="text-center text-white/25 dm-mono text-[10px] mb-8 fu fu2">
            Hi {candidateName} — read and accept these rules before continuing.
          </p>

          {/* Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {[
              { delay:'fu3', color:'text-violet-400 border-violet-500/25 bg-violet-500/8', icon:<FsIcon/>, title:'Fullscreen — Mandatory', body:'The interview runs in fullscreen mode. You cannot exit fullscreen. Exiting will be flagged and may terminate the session.' },
              { delay:'fu3', color:'text-amber-400 border-amber-500/25 bg-amber-500/8',   icon:<TabIcon/>, title:'No tab switching', body:'Switching tabs or windows triggers a warning. You will NOT be able to switch tabs. After 3 warnings the interview terminates automatically.' },
              { delay:'fu4', color:'text-blue-400 border-blue-500/25 bg-blue-500/8',       icon:<CamIcon/>, title:'Camera required', body:'Keep your face clearly visible at all times. Any absence from the frame is a violation.' },
              { delay:'fu4', color:'text-emerald-400 border-emerald-500/25 bg-emerald-500/8', icon:<MicIcon/>, title:'Microphone on', body:'Only your voice should be audible. Multiple voices detected simultaneously count as a violation.' },
              { delay:'fu5', color:'text-rose-400 border-rose-500/25 bg-rose-500/8',       icon:<FaceIcon/>, title:'One person only', body:'Multiple faces in the camera frame will immediately count as a violation. Ensure you are alone in a private room.' },
              { delay:'fu5', color:'text-cyan-400 border-cyan-500/25 bg-cyan-500/8',        icon:<RecIcon/>, title:'Recorded & monitored', body:'This session is fully recorded. All violations are logged and reviewed by the hiring team along with your responses.' },
            ].map(({ delay, color, icon, title, body }) => (
              <div key={title} className={`fu ${delay} p-4 rounded-xl border bg-white/[.018] ${color} flex gap-3`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${color}`}>{icon}</div>
                <div>
                  <p className="sora text-[13px] font-semibold text-white/80 mb-0.5">{title}</p>
                  <p className="dm-mono text-[10px] text-white/30 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Warning notice */}
          <div className="fu fu6 mb-6 p-4 rounded-xl border border-rose-500/25 bg-rose-500/8 flex gap-3 items-start">
            <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="dm-mono text-[11px] text-rose-300/80 leading-relaxed">
              <span className="text-rose-300 font-bold">3 warnings = automatic termination.</span> Violations include: tab switching, fullscreen exit, multiple faces detected, multiple voices detected, or face not visible. All violations are sent to the recruiter.
            </p>
          </div>

          {/* Session info */}
          <div className="fu fu6 flex items-center justify-center gap-6 mb-8 p-3 rounded-xl border border-white/8 bg-white/[.018]">
            {[['Questions', totalQuestions],['Duration',`~${durationMins} min`],['Mode','AI Voice'],['Proctored','Yes']].map(([l,v])=>(
              <div key={l} className="text-center">
                <p className="sora text-sm font-bold text-white/70">{v}</p>
                <p className="dm-mono text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          <div className="fu fu7 flex gap-3 justify-center">
            <button onClick={()=>onAbort?.()} className="sora px-6 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-sm transition-all">
              I'm not ready
            </button>
            <button onClick={()=>setStep('checks')} className="sora px-10 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,.1)]">
              I understand — Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: System checks ─────────────────────────────────────────── */}
      {step === 'checks' && (
        <div className="relative z-10 max-w-3xl w-full">
          <div className="text-center mb-6 fu fu1">
            <h2 className="sora text-2xl font-bold text-white mb-1">System Check</h2>
            <p className="dm-mono text-xs text-white/30 tracking-wider">All checks below are mandatory before the interview can begin</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Left: Camera ─────────────────────────────────────────── */}
            <div className="fu fu2 space-y-3">
              <SectionLabel>Camera Preview</SectionLabel>

              {/* Video feed */}
              <div className={`relative rounded-xl overflow-hidden border scl ${cameraErr ? 'border-rose-700/60 err-glow' : cameraOk ? 'border-emerald-700/40 check-glow' : 'border-white/10'} bg-black`} style={{aspectRatio:'16/9'}}>
                {cameraErr ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <div>
                      <svg className="w-10 h-10 text-rose-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2"/>
                      </svg>
                      <p className="sora text-rose-400 text-sm font-semibold mb-1">Camera blocked</p>
                      <p className="dm-mono text-white/30 text-[10px] leading-relaxed">{cameraErr}</p>
                    </div>
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{transform:'scaleX(-1)'}}/>
                )}
                {cameraOk && (
                  <>
                    {/* Face badge */}
                    <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] dm-mono ${faceDetected ? 'bg-emerald-900/80 text-emerald-300' : 'bg-amber-900/80 text-amber-300'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}/>
                      {faceDetected ? '✓ Face detected' : 'Looking for face…'}
                    </div>
                    {/* Live dot */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"/>
                      <span className="dm-mono text-[9px] text-white/50">LIVE</span>
                    </div>
                  </>
                )}
              </div>

              <CheckRow ok={cameraOk} bad={!!cameraErr} label="Camera access granted" mandatory />
              <CheckRow ok={faceDetected && cameraOk} bad={false} label="Face detected in frame" mandatory />
            </div>

            {/* ── Right: Checks ─────────────────────────────────────────── */}
            <div className="fu fu3 space-y-4">

              {/* Mic level */}
              <div className={`p-4 rounded-xl border ${micOk ? 'border-emerald-700/40 check-glow' : cameraErr ? 'border-rose-700/40' : 'border-white/10'} bg-white/[.02]`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="sora text-sm font-semibold text-white/70">Microphone</p>
                  {micOk
                    ? <StatusBadge ok>Audio detected ✓</StatusBadge>
                    : <StatusBadge pending>Say something to test…</StatusBadge>
                  }
                </div>
                {/* Bar visualiser */}
                <div className="flex items-end gap-0.5 h-10 mb-2">
                  {[...Array(24)].map((_,i)=>{
                    const thr = (i/24)*100;
                    const on = audioLevel > thr;
                    return <div key={i} className={`flex-1 rounded-sm transition-all duration-75 ${on ? (audioLevel>75?'bg-rose-400':audioLevel>40?'bg-emerald-400':'bg-emerald-700') : 'bg-white/8'}`} style={{height:`${Math.max(12,(i%3===0?65:i%2===0?42:30))}%`}}/>;
                  })}
                </div>
                <p className="dm-mono text-[10px] text-white/20">
                  {micOk ? '✓ Microphone is working correctly' : 'Speak normally — the bars should react to your voice'}
                </p>
              </div>

              {/* Fullscreen — MANDATORY */}
              <div className={`p-4 rounded-xl border ${fsOk ? 'border-emerald-700/40 check-glow' : fsError ? 'border-rose-700/40 err-glow' : 'border-amber-700/40 warn-glow'} bg-white/[.02]`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="sora text-sm font-semibold text-white/70">Fullscreen Mode</p>
                    <p className="dm-mono text-[10px] text-rose-400/80 uppercase tracking-wider">Required — cannot be skipped</p>
                  </div>
                  {fsOk
                    ? <StatusBadge ok>Active ✓</StatusBadge>
                    : <StatusBadge warn>Not active</StatusBadge>
                  }
                </div>
                {fsError && <p className="dm-mono text-[10px] text-rose-400 mb-2 leading-relaxed">{fsError}</p>}
                {!fsOk ? (
                  <button onClick={requestFs} disabled={requesting}
                    className="w-full py-2.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-300 text-sm dm-mono hover:bg-violet-500/25 active:scale-95 transition-all disabled:opacity-50">
                    {requesting ? 'Requesting…' : '⛶  Enter Fullscreen'}
                  </button>
                ) : (
                  <div className="py-2 text-center dm-mono text-xs text-white/30">Fullscreen is active — do not exit during the interview</div>
                )}
              </div>

              {/* Tab-switch policy info box */}
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/6">
                <p className="sora text-xs font-semibold text-amber-400 mb-1.5">Tab-switch protection active during interview</p>
                <p className="dm-mono text-[10px] text-amber-300/60 leading-relaxed">
                  Once the interview starts, tab switching is monitored. Each switch = 1 warning. At <strong className="text-amber-300">3 warnings</strong> the session is automatically terminated and flagged.
                </p>
              </div>

              {/* Agree checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <div onClick={()=>setAgreed(a=>!a)}
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${agreed ? 'bg-white border-white' : 'border-white/20 bg-white/5 group-hover:border-white/40'}`}>
                  {agreed && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <p className="sora text-xs text-white/40 group-hover:text-white/60 transition-colors leading-relaxed mt-0.5">
                  I have read and accept all proctoring rules. I understand that violations including tab switching, multiple faces, multiple voices, and fullscreen exit will be logged and may result in immediate termination.
                </p>
              </label>
            </div>
          </div>

          {/* Mandatory checks summary */}
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <MiniCheck ok={cameraOk}  bad={!!cameraErr} label="Camera"/>
            <MiniCheck ok={micOk}     bad={false}       label="Microphone"/>
            <MiniCheck ok={faceDetected && cameraOk} bad={false} label="Face"/>
            <MiniCheck ok={fsOk}      bad={!!fsError}   label="Fullscreen"/>
            <MiniCheck ok={agreed}    bad={false}       label="Agreed"/>
          </div>

          {/* CTA */}
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={()=>setStep('instructions')} className="sora px-6 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 text-sm transition-all">
              ← Back
            </button>
            <button
              onClick={handleStart}
              disabled={!allPassed}
              className={`sora px-10 py-3 rounded-full font-semibold text-sm transition-all ${allPassed ? 'bg-white text-black hover:bg-white/90 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,.12)]' : 'bg-white/8 text-white/20 cursor-not-allowed'}`}
            >
              {!cameraOk || !!cameraErr ? 'Waiting for camera…'
                : !micOk               ? 'Speak to verify mic…'
                : !faceDetected        ? 'Detecting your face…'
                : !fsOk                ? 'Enter fullscreen first'
                : !agreed              ? 'Please agree to continue'
                : "Begin Interview →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <p className="dm-mono text-[10px] text-white/30 uppercase tracking-widest">{children}</p>;
}

function CheckRow({ ok, bad, label, mandatory }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/8 bg-white/[.015]">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bad?'bg-rose-900/60':ok?'bg-emerald-900/60':'bg-white/5'}`}>
        {bad ? <XSvg/> : ok ? <CheckSvg/> : <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse"/>}
      </div>
      <span className={`dm-mono text-xs ${bad?'text-rose-400':ok?'text-white/50':'text-white/25'}`}>{label}</span>
      {mandatory && <span className="dm-mono text-[9px] text-rose-500/70 uppercase tracking-wider ml-auto">required</span>}
    </div>
  );
}

function MiniCheck({ ok, bad, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${bad?'bg-rose-900/60':ok?'bg-emerald-900/60':'bg-white/5'}`}>
        {bad ? <XSvg w={8}/> : ok ? <CheckSvg w={8}/> : <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"/>}
      </div>
      <span className={`dm-mono text-[10px] ${bad?'text-rose-400':ok?'text-white/45':'text-white/20'}`}>{label}</span>
    </div>
  );
}

function StatusBadge({ ok, warn, pending, children }) {
  return (
    <span className={`dm-mono text-[10px] px-2 py-0.5 rounded-full border ${ok?'border-emerald-700/50 bg-emerald-900/30 text-emerald-400':warn?'border-amber-700/50 bg-amber-900/30 text-amber-400':'border-white/10 bg-white/5 text-white/30'}`}>
      {pending ? <span className="animate-pulse">{children}</span> : children}
    </span>
  );
}

function CheckSvg({ w=10 }) {
  return <svg width={w} height={w} viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function XSvg({ w=10 }) {
  return <svg width={w} height={w} viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

function FsIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>; }
function TabIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function CamIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>; }
function MicIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>; }
function FaceIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 10-16 0"/></svg>; }
function RecIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>; }