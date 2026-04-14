import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Decorative background blobs ──────────────────────────────────────────────
function Blobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }} />
      <div className="absolute -bottom-40 -right-20 w-[420px] h-[420px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)' }} />
    </div>
  );
}

function FeaturePill({ icon, text }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
      <span className="text-white/80 text-lg">{icon}</span>
      <span className="text-white/90 text-sm font-medium">{text}</span>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

// ─── Sun icon ─────────────────────────────────────────────────────────────────
function SunIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

// ─── Moon icon ────────────────────────────────────────────────────────────────
function MoonIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

// ─── Theme toggle button ──────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'rgb(var(--bg-surface-2))',
        borderColor:     'rgb(var(--border))',
        color:           'rgb(var(--text-secondary))',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgb(var(--indigo))'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgb(var(--border))'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
const AuthLayout = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');
        .al-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="al-root flex min-h-screen" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>

        {/* ── Left branding panel (desktop only, always indigo) ───────────────── */}
        <div className="hidden lg:flex lg:w-[48%] relative bg-indigo-600 flex-col justify-between p-10 overflow-hidden">
          <Blobs />

          {/* Logo */}
          <Link to="/" className="relative z-10 flex items-center gap-3 group w-fit">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <span className="text-xl font-black text-white group-hover:text-white/80 transition-colors tracking-tight">
              AI Recruiter
            </span>
          </Link>

          {/* Main copy */}
          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-3">
                Smarter Hiring
              </p>
              <h2 className="text-4xl font-black text-white leading-tight">
                Transform Your<br />
                <span className="text-indigo-200">Hiring Process</span>
              </h2>
              <p className="text-white/70 text-base mt-4 leading-relaxed max-w-sm">
                Let AI conduct interviews, evaluate candidates objectively, and surface
                the best talent — so you can focus on the decisions that matter.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FeaturePill icon="🤖" text="AI-powered interviews" />
              <FeaturePill icon="⚡" text="Instant evaluation" />
              <FeaturePill icon="🎯" text="Smart shortlisting" />
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative z-10">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 grid grid-cols-3 divide-x divide-white/20">
              <StatCard value="10k+"  label="Candidates" />
              <StatCard value="98%"   label="Satisfaction" />
              <StatCard value="3×"    label="Faster Hiring" />
            </div>
          </div>
        </div>

        {/* ── Right form panel ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">

          {/* Top bar — logo (mobile) + theme toggle (always visible) */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{
              backgroundColor: 'rgb(var(--bg-surface))',
              borderColor:     'rgb(var(--border-subtle))',
            }}
          >
            {/* Mobile: show logo. Desktop: show "back to home" link */}
            <Link to="/" className="flex items-center gap-2 group lg:hidden">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                </svg>
              </div>
              <span className="text-base font-black tracking-tight" style={{ color: 'rgb(var(--text-primary))' }}>
                AI Recruiter
              </span>
            </Link>

            {/* Desktop: back link (left side) */}
            <Link
              to="/"
              className="hidden lg:inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: 'rgb(var(--indigo))' }}
            >
              ← Back to home
            </Link>

            {/* Theme toggle — always on the right */}
            <ThemeToggle />
          </div>

          {/* Form area */}
          <div
            className="flex-1 flex items-center justify-center px-6 py-10"
            style={{ backgroundColor: 'rgb(var(--bg-page))' }}
          >
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </div>

          {/* Footer */}
          <div
            className="text-center py-4 text-xs border-t"
            style={{
              backgroundColor: 'rgb(var(--bg-surface))',
              borderColor:     'rgb(var(--border-subtle))',
              color:           'rgb(var(--text-faint))',
            }}
          >
            © {new Date().getFullYear()} AI Recruiter · All rights reserved
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthLayout;