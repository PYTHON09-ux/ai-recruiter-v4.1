import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay } },
});
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function useScrollReveal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return [ref, inView];
}

function Counter({ to, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const duration = 1600, steps = 60, inc = to / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + inc, to);
      setCount(Math.floor(cur));
      if (cur >= to) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, to]);
  return <span ref={ref}>{count}{suffix}</span>;
}

const FEATURES = [
  { icon: '⚡', title: 'AI Voice Interviews',  desc: 'Adaptive conversational interviews powered by advanced language models — no human scheduling needed.', accent: '#6366f1' },
  { icon: '🎯', title: 'Smart Matching',        desc: 'Skills-first algorithms surface the right candidates automatically, before you even look.',             accent: '#10b981' },
  { icon: '🛡',  title: 'Proctored Mode',       desc: 'Real-time integrity monitoring ensures every interview is fair and verifiable.',                        accent: '#f59e0b' },
  { icon: '📊', title: 'Instant Analytics',     desc: 'Rich dashboards turn raw interview data into actionable hiring signals within minutes.',                accent: '#ec4899' },
];

const PROCESS = [
  { step: '01', title: 'Post a Role',      desc: 'Define the position. We generate tailored AI interview questions automatically.' },
  { step: '02', title: 'Candidates Apply', desc: 'Applicants complete async AI voice interviews at their own pace — no scheduling friction.' },
  { step: '03', title: 'AI Evaluates',     desc: 'Every response is transcribed, scored, and summarised with an objective AI recommendation.' },
  { step: '04', title: 'You Decide',       desc: 'Review ranked candidates with full context and make confident hiring decisions fast.' },
];

const STATS = [
  { value: 10000, suffix: '+', label: 'Candidates Placed' },
  { value: 95,    suffix: '%', label: 'Faster Screening' },
  { value: 500,   suffix: '+', label: 'Companies Hiring' },
  { value: 3,     suffix: '×', label: 'Quicker Time-to-Hire' },
];

const NoiseOverlay = () => (
  <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat', backgroundSize: '120px',
    }} />
);

export default function HomePage() {
  const { scrollY } = useScroll();
  const heroY       = useTransform(scrollY, [0, 600], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const [featRef,    featInView]    = useScrollReveal();
  const [processRef, processInView] = useScrollReveal();
  const [statsRef,   statsInView]   = useScrollReveal();

  return (
    <div className="hp-root min-h-screen overflow-x-hidden" style={{ backgroundColor: 'rgb(var(--bg-page))', color: 'rgb(var(--text-primary))' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Serif+Display:ital@0;1&display=swap');
        .hp-root { font-family: 'DM Sans', sans-serif; }
        .serif   { font-family: 'DM Serif Display', serif; }
        .hp-root ::selection { background: #6366f1; color: white; }
      `}</style>

      {/* ── Hero (always dark) ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#0c0c0e]">
        <NoiseOverlay />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute top-[-200px] left-[-200px] w-[700px] h-[700px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 pt-32 pb-24">
          <motion.div variants={stagger(0)} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">AI-Powered Hiring Platform</span>
          </motion.div>

          <motion.h1 variants={container} initial="hidden" animate="show"
            className="serif text-6xl md:text-7xl lg:text-8xl font-normal text-white leading-[1.05] tracking-tight mb-8">
            <motion.span variants={stagger(0.05)} className="block">The Future of</motion.span>
            <motion.span variants={stagger(0.15)} className="block">
              <em className="not-italic" style={{ color: '#818cf8' }}>Intelligent</em>
            </motion.span>
            <motion.span variants={stagger(0.25)} className="block">Recruiting.</motion.span>
          </motion.h1>

          <motion.p variants={stagger(0.35)} initial="hidden" animate="show"
            className="text-lg text-white/50 max-w-xl leading-relaxed mb-12 font-light">
            AI voice interviews, objective evaluations, and smart candidate matching —
            all in one platform that removes bias and compresses time-to-hire.
          </motion.p>

          <motion.div variants={stagger(0.45)} initial="hidden" animate="show"
            className="flex flex-col sm:flex-row gap-4">
            <Link to="/register"
              className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5">
              Get Started Free
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/about"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold rounded-xl transition-all duration-200 backdrop-blur-sm">
              See How It Works
            </Link>
          </motion.div>

          <motion.p variants={stagger(0.55)} initial="hidden" animate="show"
            className="mt-10 text-xs text-white/25 font-medium tracking-wider uppercase">
            Trusted by 500+ companies · 10,000+ hires made
          </motion.p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section ref={featRef} className="py-28" style={{ backgroundColor: 'rgb(var(--bg-surface))' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div initial="hidden" animate={featInView ? 'show' : 'hidden'} variants={container} className="mb-16">
            <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--indigo))' }}>
              Core Features
            </motion.p>
            <motion.h2 variants={fadeUp} className="serif text-5xl font-normal leading-tight max-w-lg" style={{ color: 'rgb(var(--text-primary))' }}>
              Everything hiring teams actually need.
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" animate={featInView ? 'show' : 'hidden'} variants={container}
            className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={stagger(i * 0.08)}
                className="group p-8 rounded-2xl border transition-all duration-300 cursor-default"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--bg-page))' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--bg-surface))';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgb(var(--border) / 0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--bg-page))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.accent + '18' }}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'rgb(var(--text-primary))' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>{f.desc}</p>
                <div className="mt-6 h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-16" style={{ background: f.accent }} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works (always dark) ─────────────────────────────────────── */}
      <section ref={processRef} className="py-28 bg-[#0c0c0e] relative overflow-hidden">
        <NoiseOverlay />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div initial="hidden" animate={processInView ? 'show' : 'hidden'} variants={container} className="mb-16">
            <motion.p variants={fadeUp} className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">How It Works</motion.p>
            <motion.h2 variants={fadeUp} className="serif text-5xl font-normal text-white leading-tight max-w-lg">
              From posting to hire in four steps.
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map((p, i) => (
              <motion.div key={p.step} initial={{ opacity: 0, y: 30 }}
                animate={processInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative">
                {i < PROCESS.length - 1 && (
                  <motion.div initial={{ scaleX: 0 }} animate={processInView ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.5, delay: i * 0.12 + 0.4 }}
                    className="hidden lg:block absolute top-5 left-[calc(100%+12px)] w-[calc(100%-24px)] h-px bg-white/10 origin-left" />
                )}
                <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                  <span className="text-5xl font-black text-white/[0.08] leading-none block mb-4 serif">{p.step}</span>
                  <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-24 border-y" style={{ backgroundColor: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--border))' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0"
            style={{ '--divider': 'rgb(var(--border))' }}>
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-center px-6 lg:border-r last:border-r-0"
                style={{ borderColor: 'rgb(var(--border))' }}>
                <div className="text-4xl lg:text-5xl font-black tracking-tight mb-1.5" style={{ color: 'rgb(var(--text-primary))' }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────────────────── */}
      <section className="py-28" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-3xl md:text-4xl serif font-normal leading-snug mb-10" style={{ color: 'rgb(var(--text-primary))' }}>
              "We cut our time-to-hire from six weeks to{' '}
              <em className="not-italic" style={{ color: 'rgb(var(--indigo))' }}>eleven days</em>. The AI evaluations
              are more consistent than anything our panel interviews produced."
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: 'rgb(var(--indigo-bg))', color: 'rgb(var(--indigo))' }}>A</div>
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Anjali Mehra</p>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Head of Talent · Series B SaaS Co.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA (always indigo) ────────────────────────────────────────────── */}
      <section className="py-24 bg-indigo-600 relative overflow-hidden">
        <NoiseOverlay />
        <div className="absolute top-[-120px] right-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a5b4fc 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 65%)' }} />
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-5">Start Today</p>
          <h2 className="serif text-5xl font-normal text-white leading-tight mb-6">Ready to hire smarter?</h2>
          <p className="text-lg text-indigo-200 mb-10 font-light">Join 500+ companies transforming their hiring with AI. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-800/20">
              Start Free Trial
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-xl hover:border-white/60 transition-all">
              Sign In
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}