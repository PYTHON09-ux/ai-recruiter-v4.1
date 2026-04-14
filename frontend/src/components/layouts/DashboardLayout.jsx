import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Inline SVG icon ──────────────────────────────────────────────────────────
const Icon = ({ path, path2 }) => (
  <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        if (isActive)
          return 'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-indigo-600 text-white shadow-sm shadow-indigo-200';
        if (isAncestor)
          return 'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-brand-soft text-brand-soft border border-brand-soft';
        return 'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 text-secondary hover:bg-surface-2 hover:text-primary';
      }}
      style={isAncestor ? {
        backgroundColor: 'rgb(var(--indigo-bg))',
        color: 'rgb(var(--indigo-text))',
        borderColor: 'rgb(var(--indigo-bg))',
      } : {}}
    >
      {isAncestor && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{ backgroundColor: 'rgb(var(--indigo))' }} />
      )}

      <span style={{
        color: isActive ? 'white'
          : isAncestor ? 'rgb(var(--indigo))'
          : 'rgb(var(--text-muted))'
      }}>
        <Icon path={ICONS[item.icon]} />
      </span>

      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.name}</span>
          {isAncestor && (
            <svg className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--indigo))' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
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
    const navMatch = navItems.find(n => n.path === fullPath);
    const label = navMatch?.name || (
      seg.length > 20 ? 'Detail'
        : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
    );
    return { label, path: fullPath, isLast: i === segments.length - 1 };
  });

  if (crumbs.length <= 1) return null;

  return (
    <nav className="hidden sm:flex items-center gap-1.5 text-xs font-semibold">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--text-faint))' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {crumb.isLast ? (
            <span style={{ color: 'rgb(var(--text-primary))' }}>{crumb.label}</span>
          ) : (
            <Link to={crumb.path}
              className="transition-colors hover:text-indigo-500"
              style={{ color: 'rgb(var(--text-muted))' }}>
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
  const { theme, toggleTheme }  = useTheme();
  const navigate                = useNavigate();
  const items                   = NAV[userType] || NAV.candidate;
  const name                    = currentUser?.firstName || currentUser?.name || 'User';
  const role                    = currentUser?.role || userType;
  const color                   = avatarColor(name);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full border-r"
      style={{
        backgroundColor: 'rgb(var(--sidebar-bg))',
        borderColor: 'rgb(var(--sidebar-border))',
      }}>

      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 shrink-0 border-b"
        style={{ borderColor: 'rgb(var(--border-subtle))' }}>
        <Link to="/" className="flex items-center gap-2.5 group" onClick={onClose}>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <span className="text-base font-black tracking-tight transition-colors group-hover:text-indigo-500"
            style={{ color: 'rgb(var(--text-primary))' }}>
            AI Recruiter
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition md:hidden hover:bg-surface-2"
            style={{ color: 'rgb(var(--text-muted))' }}>
            <Icon path={ICONS.close} />
          </button>
        )}
      </div>

      {/* User chip */}
      <div className="mx-3 mt-4 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl border"
        style={{
          backgroundColor: 'rgb(var(--sidebar-chip))',
          borderColor: 'rgb(var(--border))',
        }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
          style={{ background: color }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'rgb(var(--text-primary))' }}>{name}</p>
          <p className="text-xs capitalize" style={{ color: 'rgb(var(--text-muted))' }}>{role}</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {items.map(item => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t space-y-0.5"
        style={{ borderColor: 'rgb(var(--border-subtle))' }}>

        <Link to="/" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ color: 'rgb(var(--text-secondary))' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgb(var(--bg-hover))'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <span style={{ color: 'rgb(var(--text-muted))' }}><Icon path={ICONS.globe} /></span>
          Homepage
        </Link>

        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ color: 'rgb(var(--text-secondary))' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgb(var(--bg-hover))'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <span style={{ color: 'rgb(var(--text-muted))' }}>
            <Icon path={theme === 'dark' ? ICONS.sun : ICONS.moon} />
          </span>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-red-500 hover:bg-red-50 hover:text-red-700">
          <span><Icon path={ICONS.logout} /></span>
          Logout
        </button>
      </div>
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
const DashboardLayout = ({ userType = 'recruiter' }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser }             = useAuth();
  const location                    = useLocation();
  const navItems                    = NAV[userType] || NAV.candidate;
  const name  = currentUser?.firstName || currentUser?.name || 'User';
  const color = avatarColor(name);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 w-60">
        <div className="w-full">
          <SidebarContent userType={userType} />
        </div>
      </div>

      {/* Mobile overlay */}
      <div className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
        mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
        <div className={`relative w-64 h-full transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <SidebarContent userType={userType} onClose={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center px-4 gap-4 z-10 border-b"
          style={{
            backgroundColor: 'rgb(var(--bg-surface))',
            borderColor: 'rgb(var(--border))',
          }}>
          <button
            className="md:hidden p-2 rounded-xl transition"
            style={{ color: 'rgb(var(--text-secondary))' }}
            onClick={() => setMobileOpen(true)}>
            <Icon path={ICONS.menu} />
          </button>

          <Breadcrumb navItems={navItems} />

          <div className="flex-1" />

          {/* User info */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-tight" style={{ color: 'rgb(var(--text-primary))' }}>{name}</p>
              <p className="text-xs leading-tight capitalize" style={{ color: 'rgb(var(--text-muted))' }}>
                {currentUser?.role || userType}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm"
              style={{ background: color }}>
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;