/**
 * DashboardLayout.jsx — Styling-only polish over the original.
 *
 * Structure, props, navigation config, and behaviour are unchanged.
 * Improvements:
 *  - Logo mark now uses a subtle indigo gradient + soft ring.
 *  - Active nav item has a gradient background + glow instead of flat colour.
 *  - Hover states are smoother (scale + colour transition, 200ms ease-out).
 *  - Topbar is sticky with backdrop-blur for a modern glass feel.
 *  - Breadcrumb chevrons are lighter and use tighter tracking.
 *  - User chip has a gradient ring accent and slightly larger avatar.
 *  - Mobile drawer slides with a spring-like cubic-bezier and darker overlay.
 *  - Logout button uses a refined red gradient hover.
 */

import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Inline SVG icon ──────────────────────────────────────────────────────────
const Icon = ({ path, path2, className = 'w-[18px] h-[18px] shrink-0' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path2} />}
  </svg>
);

const ICONS = {
  home:      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  users:     "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  file:      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  calendar:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  chart:     "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  user:      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  settings:  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  globe:     "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  sun:       "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon:      "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  logout:    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  menu:      "M4 6h16M4 12h16M4 18h16",
  close:     "M6 18L18 6M6 6l12 12",
  chevron:   "M9 5l7 7-7 7",
};

const avatarColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

const avatarGradient = (name = '') => {
  const pairs = [
    ['#6366f1', '#8b5cf6'],
    ['#8b5cf6', '#ec4899'],
    ['#ec4899', '#f59e0b'],
    ['#f59e0b', '#10b981'],
    ['#10b981', '#06b6d4'],
    ['#3b82f6', '#6366f1'],
  ];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  const [a, b] = pairs[Math.abs(h) % pairs.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
};

// ─── Navigation config ────────────────────────────────────────────────────────
const NAV = {
  recruiter: [
    { name: 'Dashboard',    icon: 'home',      path: '/recruiter' },
    { name: 'Create Job',   icon: 'briefcase', path: '/recruiter/jobs/create' },
    { name: 'Candidates',   icon: 'users',     path: '/recruiter/candidates' },
    { name: 'Applications', icon: 'file',      path: '/recruiter/applications' },
    { name: 'Interviews',   icon: 'calendar',  path: '/recruiter/interviews' },
    { name: 'Analytics',    icon: 'chart',     path: '/recruiter/analytics' },
    { name: 'Profile',      icon: 'user',      path: '/recruiter/profile' },
  ],
  candidate: [
    { name: 'Dashboard',       icon: 'home',     path: '/candidate' },
    { name: 'Find Jobs',       icon: 'search',   path: '/candidate/jobs' },
    { name: 'My Applications', icon: 'file',     path: '/candidate/applications' },
    { name: 'Profile',         icon: 'user',     path: '/candidate/profile' },
    { name: 'Settings',        icon: 'settings', path: '/candidate/settings' },
  ],
};

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ item, collapsed = false }) {
  const { pathname } = useLocation();
  const isDashboardItem = item.path.endsWith('/dashboard');

  const isActive = isDashboardItem
    ? pathname === item.path
    : pathname === item.path || pathname.startsWith(item.path + '/');

  const isAncestor = !isDashboardItem && !isActive && pathname.startsWith(item.path + '/');

  return (
    <NavLink
      to={item.path}
      end={false}
      title={collapsed ? item.name : undefined}
      className={() => {
        const base =
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ease-out';
        if (isActive)
          return `${base} text-white shadow-lg shadow-indigo-500/30 scale-[1.01]`;
        if (isAncestor)
          return `${base} border`;
        return `${base} text-secondary hover:bg-surface-2 hover:text-primary hover:translate-x-0.5`;
      }}
      style={
        isActive
          ? { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }
          : isAncestor
          ? {
              backgroundColor: 'rgb(var(--indigo-bg))',
              color: 'rgb(var(--indigo-text))',
              borderColor: 'rgb(var(--indigo-bg))',
            }
          : {}
      }
    >
      {/* Active accent glow */}
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 80% at 0% 50%, rgba(255,255,255,0.18), transparent 60%)',
          }}
        />
      )}

      {isAncestor && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{ backgroundColor: 'rgb(var(--indigo))' }}
        />
      )}

      <span
        className="relative"
        style={{
          color: isActive
            ? 'white'
            : isAncestor
            ? 'rgb(var(--indigo))'
            : 'rgb(var(--text-muted))',
        }}
      >
        <Icon path={ICONS[item.icon]} />
      </span>

      {!collapsed && (
        <>
          <span className="truncate flex-1 relative">{item.name}</span>
          {isAncestor && (
            <svg
              className="w-3 h-3 shrink-0"
              style={{ color: 'rgb(var(--indigo))' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ navItems }) {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const fullPath = '/' + segments.slice(0, i + 1).join('/');
    const navMatch = navItems.find((n) => n.path === fullPath);
    const label =
      navMatch?.name ||
      (seg.length > 20
        ? 'Detail'
        : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '));
    return { label, path: fullPath, isLast: i === segments.length - 1 };
  });

  if (crumbs.length <= 1) return null;

  return (
    <nav className="hidden sm:flex items-center gap-1.5 text-xs font-semibold tracking-tight">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg
              className="w-3 h-3 shrink-0 opacity-70"
              style={{ color: 'rgb(var(--text-faint))' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
          {crumb.isLast ? (
            <span style={{ color: 'rgb(var(--text-primary))' }}>{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="transition-colors duration-150 hover:text-indigo-500"
              style={{ color: 'rgb(var(--text-muted))' }}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function SidebarContent({ userType, onClose }) {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const items = NAV[userType] || NAV.candidate;
  const name = currentUser?.firstName || currentUser?.name || 'User';
  const role = currentUser?.role || userType;
  const gradient = avatarGradient(name);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      className="flex flex-col h-full border-r relative"
      style={{
        backgroundColor: 'rgb(var(--sidebar-bg))',
        borderColor: 'rgb(var(--sidebar-border))',
      }}
    >
      {/* Ambient background tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 0%, rgba(99,102,241,0.18), transparent 70%)',
        }}
      />

      {/* Logo */}
      <div
        className="relative flex items-center justify-between h-16 px-5 shrink-0 border-b"
        style={{ borderColor: 'rgb(var(--border-subtle))' }}
      >
        <Link to="/" className="flex items-center gap-2.5 group" onClick={onClose}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30 ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            }}
          >
            <svg
              className="w-4 h-4 text-white drop-shadow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
              />
            </svg>
          </div>
          <span
            className="text-base font-black tracking-tight transition-colors duration-200 group-hover:text-indigo-500"
            style={{ color: 'rgb(var(--text-primary))' }}
          >
            AI Recruiter
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition md:hidden hover:bg-surface-2"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            <Icon path={ICONS.close} />
          </button>
        )}
      </div>

      {/* User chip */}
      <div
        className="relative mx-3 mt-4 mb-2 flex items-center gap-3 px-3 py-3 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
        style={{
          backgroundColor: 'rgb(var(--sidebar-chip))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md ring-2 ring-white/10"
          style={{ background: gradient }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-bold truncate leading-tight"
            style={{ color: 'rgb(var(--text-primary))' }}
          >
            {name}
          </p>
          <p
            className="text-[11px] capitalize font-semibold tracking-wide mt-0.5"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            {role}
          </p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {items.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Bottom actions */}
      <div
        className="relative px-3 py-3 border-t space-y-0.5"
        style={{ borderColor: 'rgb(var(--border-subtle))' }}
      >
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:translate-x-0.5"
          style={{ color: 'rgb(var(--text-secondary))' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgb(var(--bg-hover))')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
        >
          <span style={{ color: 'rgb(var(--text-muted))' }}>
            <Icon path={ICONS.globe} />
          </span>
          Homepage
        </Link>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:translate-x-0.5"
          style={{ color: 'rgb(var(--text-secondary))' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgb(var(--bg-hover))')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
        >
          <span style={{ color: 'rgb(var(--text-muted))' }}>
            <Icon path={theme === 'dark' ? ICONS.sun : ICONS.moon} />
          </span>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-red-500 hover:text-white hover:shadow-md hover:shadow-red-500/20"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          <span>
            <Icon path={ICONS.logout} />
          </span>
          Logout
        </button>
      </div>
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
const DashboardLayout = ({ userType = 'recruiter' }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();
  const navItems = NAV[userType] || NAV.candidate;
  const name = currentUser?.firstName || currentUser?.name || 'User';
  const gradient = avatarGradient(name);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--bg-page))' }}
    >
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 w-60">
        <div className="w-full">
          <SidebarContent userType={userType} />
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`relative w-64 h-full shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent
            userType={userType}
            onClose={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar (sticky glass) */}
        <header
          className="h-14 shrink-0 flex items-center px-4 gap-4 z-10 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'rgb(var(--bg-surface) / 0.85)',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <button
            className="md:hidden p-2 rounded-xl transition hover:bg-surface-2"
            style={{ color: 'rgb(var(--text-secondary))' }}
            onClick={() => setMobileOpen(true)}
          >
            <Icon path={ICONS.menu} />
          </button>

          <Breadcrumb navItems={navItems} />

          <div className="flex-1" />

          {/* User info */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p
                className="text-xs font-bold leading-tight"
                style={{ color: 'rgb(var(--text-primary))' }}
              >
                {name}
              </p>
              <p
                className="text-[11px] leading-tight capitalize font-semibold tracking-wide"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                {currentUser?.role || userType}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md ring-2 ring-white/10"
              style={{ background: gradient }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: 'rgb(var(--bg-page))' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;