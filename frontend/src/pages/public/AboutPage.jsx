import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function useReveal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return [ref, inView];
}

const NoiseOverlay = () => (
  <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat', backgroundSize: '120px',
    }} />
);

const FEATURES = [
  { icon: '🧠', accent: '#6366f1', title: 'AI-Powered Screening',  desc: 'Advanced algorithms analyse resumes and conduct initial screenings to surface the best candidates.' },
  { icon: '🎙',  accent: '#f59e0b', title: 'Voice Interviews',      desc: 'Async AI voice interviews let candidates respond naturally at their own pace — no scheduling.' },
  { icon: '🎯', accent: '#10b981', title: 'Smart Matching',         desc: 'Job-candidate matching based on skills, experience, and role requirements — not just keywords.' },
  { icon: '🛡',  accent: '#8b5cf6', title: 'Secure Platform',       desc: 'Enterprise-grade security with end-to-end encryption and SOC 2-aligned compliance standards.' },
  { icon: '👥', accent: '#ec4899', title: 'Collaborative Hiring',   desc: 'Share evaluations, add notes, and align the whole hiring team — all in one place.' },
  { icon: '📈', accent: '#3b82f6', title: 'Analytics & Insights',   desc: 'Comprehensive dashboards to optimise your hiring funnel and track performance over time.' },
];

const STATS = [
  { value: '10,000+', label: 'Successful Hires' },
  { value: '500+',    label: 'Companies Trust Us' },
  { value: '95%',     label: 'Accuracy Rate' },
  { value: '50%',     label: 'Time Saved' },
];

const TEAM = [
  { name: 'Sarah Johnson',   role: 'CEO & Co-Founder', bio: 'Former VP of Talent at Google with 15+ years in HR technology and people operations.', initials: 'SJ', color: '#6366f1' },
  { name: 'Michael Chen',    role: 'CTO & Co-Founder', bio: 'AI researcher and former Principal Engineer at Microsoft, specialising in NLP systems.',  initials: 'MC', color: '#10b981' },
  { name: 'Emily Rodriguez', role: 'Head of Product',  bio: 'Product leader with deep expertise in B2B SaaS and enterprise HR solutions.',             initials: 'ER', color: '#f59e0b' },
];

const WHY = [
  'Reduce hiring time by up to 50%',
  'Eliminate unconscious bias in screening',
  'Improve candidate quality and fit',
  'Scale your hiring process efficiently',
];

export default function AboutPage() {
  const [heroRef,    heroInView]    = useReveal();
  const [missionRef, missionInView] = useReveal();
  const [featRef,    featInView]    = useReveal();
  const [teamRef,    teamInView]    = useReveal();

  return (
    <div className="about-root min-h-screen overflow-x-hidden" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Serif+Display:ital@0;1&display=swap');
        .about-root { font-family: 'DM Sans', sans-serif; }
        .serif { font-family: 'DM Serif Display', serif; }
      `}</style>

      {/* ── Hero (always dark) ── */}
      <section ref={heroRef} className="relative py-28 bg-[#0c0c0e] overflow-hidden">
        <NoiseOverlay />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 65%)' }} />
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }} className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6">
            About Us
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="serif text-6xl md:text-7xl font-normal text-white leading-tight mb-6">
            Revolutionising{' '}<em className="not-italic text-indigo-400">Recruitment</em>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
            We're transforming how companies find, evaluate, and hire top talent through
            cutting-edge AI and a genuinely better candidate experience.
          </motion.p>
        </div>
      </section>

      {/* ── Mission ── */}
      <section ref={missionRef} className="py-24" style={{ backgroundColor: 'rgb(var(--bg-surface))' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={missionInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--indigo))' }}>Our Mission</p>
              <h2 className="serif text-4xl font-normal mb-6 leading-tight" style={{ color: 'rgb(var(--text-primary))' }}>
                Democratising access to top talent.
              </h2>
              <p className="leading-relaxed mb-4" style={{ color: 'rgb(var(--text-muted))' }}>
                We remove bias, reduce time-to-hire, and create more meaningful connections between employers and candidates — so the best person always gets the role.
              </p>
              <p className="leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>
                Our AI platform makes the matching process more accurate, efficient, and fair for everyone involved.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={missionInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl p-8 border"
              style={{ backgroundColor: 'rgb(var(--bg-page))', borderColor: 'rgb(var(--border))' }}>
              <h3 className="text-base font-bold mb-6" style={{ color: 'rgb(var(--text-primary))' }}>Why teams choose us</h3>
              <ul className="space-y-4">
                {WHY.map((item, i) => (
                  <motion.li key={item} initial={{ opacity: 0, x: 16 }} animate={missionInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: 'rgb(var(--indigo-bg))' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgb(var(--indigo))' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featRef} className="py-24" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div initial="hidden" animate={featInView ? 'show' : 'hidden'} variants={container} className="mb-14">
            <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--indigo))' }}>Features</motion.p>
            <motion.h2 variants={fadeUp} className="serif text-4xl font-normal max-w-md leading-tight" style={{ color: 'rgb(var(--text-primary))' }}>
              Powerful tools for every step.
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" animate={featInView ? 'show' : 'hidden'} variants={container}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] } } }}
                className="group p-6 rounded-2xl border transition-all duration-300"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--bg-surface))' }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgb(var(--border) / 0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.accent + '18' }}>
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: 'rgb(var(--text-primary))' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Stats (always indigo) ── */}
      <section className="py-16 bg-indigo-600 relative overflow-hidden">
        <NoiseOverlay />
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}>
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{s.value}</div>
                <div className="text-indigo-200 text-sm font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section ref={teamRef} className="py-24" style={{ backgroundColor: 'rgb(var(--bg-surface))' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div initial="hidden" animate={teamInView ? 'show' : 'hidden'} variants={container} className="mb-14 text-center">
            <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--indigo))' }}>The Team</motion.p>
            <motion.h2 variants={fadeUp} className="serif text-4xl font-normal" style={{ color: 'rgb(var(--text-primary))' }}>The people behind the platform.</motion.h2>
          </motion.div>

          <motion.div initial="hidden" animate={teamInView ? 'show' : 'hidden'} variants={container}
            className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEAM.map((m, i) => (
              <motion.div key={m.name}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.1 } } }}
                className="p-7 rounded-2xl border text-center transition-all duration-300"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--bg-page))' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--bg-surface))';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgb(var(--border) / 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--bg-page))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-sm"
                  style={{ background: m.color }}>
                  {m.initials}
                </div>
                <h3 className="text-base font-bold mb-0.5" style={{ color: 'rgb(var(--text-primary))' }}>{m.name}</h3>
                <p className="text-xs font-semibold mb-3" style={{ color: 'rgb(var(--indigo))' }}>{m.role}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>{m.bio}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA (always dark) ── */}
      <section className="py-20 bg-[#0c0c0e] relative overflow-hidden">
        <NoiseOverlay />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="serif text-4xl font-normal text-white mb-5">Ready to transform your hiring?</h2>
          <p className="text-white/50 mb-10 font-light leading-relaxed">
            Join thousands of companies already using AI Recruiter to find better candidates faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/30">
              Get Started Free
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center px-7 py-3.5 border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold rounded-xl transition-all">
              Sign In
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}