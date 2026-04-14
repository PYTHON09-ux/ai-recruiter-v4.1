import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const avatarColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

export default function Navbar() {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const { currentUser, logout }       = useAuth();
  const { theme, toggleTheme }        = useTheme();
  const navigate                      = useNavigate();
  const location                      = useLocation();

  // Is this a dark-hero page?
  const isDark = ['/', '/about'].includes(location.pathname);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  // Match the routes used in your router:
  // recruiters → /recruiter/dashboard  (or /recruiter if that's your index route)
  // candidates → /candidate/dashboard  (or /candidate if that's your index route)
  // We try both patterns — use whichever your <Route> defines.
  const getDashLink = () => {
    if (!currentUser) return '/login';
    return currentUser.role === 'recruiter'
      ? '/recruiter'
      : '/candidate';
  };

  // The contextual nav link shown when logged in
  const getContextLink = () => {
    if (!currentUser) return null;
    if (currentUser.role === 'recruiter') {
      return { to: '/recruiter/dashboard', label: 'Dashboard' };
    }
    return { to: '/candidate/jobs', label: 'Find Jobs' };
  };

  const contextLink = getContextLink();

  const name  = currentUser?.firstName || currentUser?.name || '';
  const color = avatarColor(name);

  // Nav link style
  const linkCls = (isActive) => {
    const base = 'text-sm font-semibold transition-colors duration-150 relative pb-0.5';
    if (isDark && !scrolled) {
      return `${base} ${isActive ? 'text-white' : 'text-white/60 hover:text-white/90'}`;
    }
    return `${base} ${isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');
        .nav-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <motion.nav
        initial={false}
        className={`nav-root fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || !isDark
            ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm shadow-gray-100/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                isDark && !scrolled ? 'bg-white/15' : 'bg-indigo-600'
              }`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                </svg>
              </div>
              <span className={`text-sm font-black tracking-tight transition-colors ${
                isDark && !scrolled ? 'text-white' : 'text-gray-900'
              }`}>
                AI Recruiter
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-7">
              <NavLink to="/" end className={({ isActive }) => linkCls(isActive)}>Home</NavLink>
              <NavLink to="/about" className={({ isActive }) => linkCls(isActive)}>About</NavLink>
              {contextLink && (
                <NavLink to={contextLink.to} className={({ isActive }) => linkCls(isActive)}>
                  {contextLink.label}
                </NavLink>
              )}
            </div>

            {/* Desktop right */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark && !scrolled
                    ? 'text-white/50 hover:text-white hover:bg-white/10'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {currentUser ? (
                <div className="flex items-center gap-2.5">
                  <Link to={getDashLink()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all hover:-translate-y-0.5 shadow-sm shadow-indigo-500/30">
                    Dashboard
                  </Link>
                  <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm"
                      style={{ background: color }}>
                      {name.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <button onClick={handleLogout}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors">
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login"
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                      isDark && !scrolled
                        ? 'text-white/70 hover:text-white hover:bg-white/10'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}>
                    Log in
                  </Link>
                  <Link to="/register"
                    className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all hover:-translate-y-0.5 shadow-sm shadow-indigo-500/30">
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className={`md:hidden p-2 rounded-xl transition-colors ${
                isDark && !scrolled ? 'text-white/70 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
              }`}
              onClick={() => setMobileOpen(v => !v)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mobileOpen ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {mobileOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden bg-white border-t border-gray-100"
            >
              <div className="px-5 py-4 space-y-1">
                {[
                  { to: '/', label: 'Home', end: true },
                  { to: '/about', label: 'About' },
                  ...(contextLink ? [{ to: contextLink.to, label: contextLink.label }] : []),
                ].map(item => (
                  <NavLink key={item.to} to={item.to} end={item.end}
                    className={({ isActive }) =>
                      `block px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }>
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-gray-50 space-y-2">
                {currentUser ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                        style={{ background: color }}>
                        {name.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
                      </div>
                    </div>
                    <button onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login"
                      className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
                      Log in
                    </Link>
                    <Link to="/register"
                      className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                      Get Started
                    </Link>
                  </>
                )}
                <button onClick={toggleTheme}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                  {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer for non-dark pages */}
      {!isDark && <div className="h-16" />}
    </>
  );
}