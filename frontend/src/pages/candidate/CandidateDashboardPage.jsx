import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { applicationsAPI, jobsAPI } from '../../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const getDaysAgo = (date) => {
  const diff = Math.ceil(Math.abs(new Date() - new Date(date)) / 864e5);
  if (diff <= 1) return 'Today';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.ceil(diff / 7)}w ago`;
  return `${Math.ceil(diff / 30)}mo ago`;
};

const fmtType = (t = '') =>
  t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const companyColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#0ea5e9','#ef4444'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  pending:             { label: 'Pending',         dot: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  reviewing:           { label: 'Reviewing',       dot: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  shortlisted:         { label: 'Shortlisted',     dot: '#10b981', bg: '#d1fae5', text: '#065f46' },
  interview_scheduled: { label: 'Interview Ready', dot: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6' },
  interview_completed: { label: 'Int. Completed',  dot: '#6366f1', bg: '#e0e7ff', text: '#3730a3' },
  interviewed:         { label: 'Interviewed',     dot: '#6366f1', bg: '#e0e7ff', text: '#3730a3' },
  hired:               { label: 'Hired 🎉',        dot: '#059669', bg: '#d1fae5', text: '#064e3b' },
  rejected:            { label: 'Not Selected',    dot: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
};

function StatusBadge({ status }) {
  const cfg = STATUS[status] || { label: status, dot: '#9ca3af', bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{ background: cfg.bg, color: cfg.text }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide shrink-0">
      <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full inline-block shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5 shadow-sm flex items-center gap-4 border"
      style={{
        backgroundColor: 'rgb(var(--bg-surface))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
        style={{ background: accent + '22' }}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-0.5"
          style={{ color: 'rgb(var(--text-muted))' }}>
          {label}
        </p>
        <p className="text-2xl font-black" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ title, linkTo, linkLabel, children, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl shadow-sm overflow-hidden border"
      style={{
        backgroundColor: 'rgb(var(--bg-surface))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgb(var(--border-subtle))' }}>
        <h2 className="font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{title}</h2>
        {linkTo && (
          <Link to={linkTo}
            className="text-xs font-bold transition-colors hover:opacity-80"
            style={{ color: 'rgb(var(--indigo))' }}>
            {linkLabel} →
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ icon, title, desc, linkTo, linkLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl"
        style={{ backgroundColor: 'rgb(var(--indigo-bg))' }}>
        {icon}
      </div>
      <h3 className="text-sm font-bold mb-1" style={{ color: 'rgb(var(--text-primary))' }}>{title}</h3>
      <p className="text-xs mb-4 max-w-[200px]" style={{ color: 'rgb(var(--text-muted))' }}>{desc}</p>
      {linkTo && (
        <Link to={linkTo}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition hover:opacity-90"
          style={{ backgroundColor: 'rgb(var(--indigo))' }}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CandidateDashboardPage() {
  const { currentUser } = useAuth();
  const [isLoading,          setIsLoading]          = useState(true);
  const [recentApplications, setRecentApplications] = useState([]);
  const [recommendedJobs,    setRecommendedJobs]    = useState([]);
  const [stats,              setStats]              = useState({
    total: 0, pending: 0, interviews: 0, available: 0,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    const [appRes, jobRes] = await Promise.allSettled([
      applicationsAPI.getAllApplications({ page: 1, limit: 5 }),
      jobsAPI.getAllJobs({ page: 1, limit: 6 }),
    ]);

    const apps = (() => {
      if (appRes.status !== 'fulfilled') { console.error('Applications fetch failed:', appRes.reason); return []; }
      const d = appRes.value?.data;
      return d?.data || d || [];
    })();

    const jobs = (() => {
      if (jobRes.status !== 'fulfilled') { console.error('Jobs fetch failed:', jobRes.reason); return []; }
      const d = jobRes.value?.data;
      return d?.data || d || [];
    })();

    setRecentApplications(Array.isArray(apps) ? apps : []);
    setRecommendedJobs(Array.isArray(jobs) ? jobs : []);
    setStats({
      total:      Array.isArray(apps) ? apps.length : 0,
      pending:    Array.isArray(apps) ? apps.filter(a => a.status === 'pending').length : 0,
      interviews: Array.isArray(apps) ? apps.filter(a => ['interview_scheduled','interview_completed','interviewed'].includes(a.status)).length : 0,
      available:  Array.isArray(jobs) ? jobs.length : 0,
    });
    setIsLoading(false);
  };

  const firstName = currentUser?.firstName || currentUser?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=DM+Serif+Display&display=swap');
        .cdash { font-family: 'DM Sans', sans-serif; }
        .serif { font-family: 'DM Serif Display', serif; }
      `}</style>

      <div className="cdash max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: 'rgb(var(--indigo))' }}>{greeting}</p>
            <h1 className="serif text-3xl font-normal" style={{ color: 'rgb(var(--text-primary))' }}>
              {firstName}<span style={{ color: 'rgb(var(--indigo))' }} className="opacity-60">.</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
              Track your applications and discover new opportunities.
            </p>
          </div>
          <Link
            to="/candidate/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition shadow-sm hover:-translate-y-0.5 shrink-0"
            style={{ backgroundColor: 'rgb(var(--indigo))' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find Jobs
          </Link>
        </motion.div>

        {/* ── Stats ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard delay={0.05} accent="#6366f1" icon="📄" label="Applications" value={stats.total} />
          <StatCard delay={0.1}  accent="#f59e0b" icon="⏳" label="Pending"      value={stats.pending} />
          <StatCard delay={0.15} accent="#8b5cf6" icon="🎙" label="Interviews"   value={stats.interviews} />
          <StatCard delay={0.2}  accent="#10b981" icon="💼" label="Jobs Open"    value={stats.available} />
        </div>

        {/* ── Two-column grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Applications */}
          <SectionCard title="Recent Applications" linkTo="/candidate/applications" linkLabel="View all" delay={0.25}>
            {recentApplications.length === 0 ? (
              <Empty icon="📄" title="No applications yet"
                desc="Start applying to jobs that match your skills."
                linkTo="/candidate/jobs" linkLabel="Browse Jobs" />
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app, i) => {
                  const co    = app.jobId?.company?.name || '';
                  const color = companyColor(co || app.jobId?.title || '');
                  const hasInterview = app.status === 'interview_scheduled' && app.interviewLink?.token;
                  return (
                    <motion.div
                      key={app._id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
                      style={{ borderColor: 'rgb(var(--border-subtle))' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--bg-surface-2))';
                        e.currentTarget.style.borderColor = 'rgb(var(--border))';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'rgb(var(--border-subtle))';
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ background: color }}>
                        {(co || app.jobId?.title || 'J').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-bold truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                            {app.jobId?.title || 'Unknown Position'}
                          </p>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                          {co || 'Company'}{app.jobId?.location ? ` · ${app.jobId.location}` : ''}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-faint))' }}>
                          Applied {fmtDate(app.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasInterview && (
                          <Link to={`/interview/magic/${app.interviewLink.token}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                            Start
                          </Link>
                        )}
                        <Link to={`/candidate/applications/${app._id}`}
                          className="p-1.5 rounded-lg transition"
                          style={{ color: 'rgb(var(--text-faint))' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = 'rgb(var(--indigo))';
                            e.currentTarget.style.backgroundColor = 'rgb(var(--indigo-bg))';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = 'rgb(var(--text-faint))';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Recommended Jobs */}
          <SectionCard title="Recommended Jobs" linkTo="/candidate/jobs" linkLabel="See all" delay={0.3}>
            {recommendedJobs.length === 0 ? (
              <Empty icon="💼" title="No jobs available" desc="Check back later for new opportunities." />
            ) : (
              <div className="space-y-3">
                {recommendedJobs.slice(0, 4).map((job, i) => {
                  const co    = job.company?.name || '';
                  const color = companyColor(co || job.title || '');
                  return (
                    <motion.div
                      key={job._id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.35 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="group flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer"
                      style={{ borderColor: 'rgb(var(--border-subtle))' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--bg-surface-2))';
                        e.currentTarget.style.borderColor = 'rgb(var(--border))';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'rgb(var(--border-subtle))';
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ background: color }}>
                        {(co || job.title || 'J').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link to={`/candidate/jobs/${job._id}`}
                          className="text-sm font-bold truncate block transition-colors"
                          style={{ color: 'rgb(var(--text-primary))' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--indigo))'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgb(var(--text-primary))'}>
                          {job.title}
                        </Link>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                          {co || 'Company'}
                          {job.location ? (
                            <span className="inline-flex items-center gap-0.5 ml-1.5">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {job.location}
                            </span>
                          ) : null}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {job.jobType && (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold"
                              style={{
                                backgroundColor: 'rgb(var(--indigo-bg))',
                                color: 'rgb(var(--indigo))',
                              }}>
                              {fmtType(job.jobType)}
                            </span>
                          )}
                          {job.skills?.slice(0, 2).map((sk, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: 'rgb(var(--bg-surface-2))',
                                color: 'rgb(var(--text-secondary))',
                              }}>
                              {sk}
                            </span>
                          ))}
                          <span className="text-xs ml-auto" style={{ color: 'rgb(var(--text-faint))' }}>
                            {getDaysAgo(job.createdAt)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Quick actions ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl shadow-sm overflow-hidden border"
          style={{
            backgroundColor: 'rgb(var(--bg-surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <div className="flex items-center gap-2.5 px-6 py-4 border-b"
            style={{ borderColor: 'rgb(var(--border-subtle))' }}>
            <span style={{ color: 'rgb(var(--indigo))' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <h2 className="font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { to: '/candidate/jobs',         icon: '🔍', accent: '#6366f1', title: 'Search Jobs',        desc: 'Find your next opportunity' },
              { to: '/candidate/profile',       icon: '👤', accent: '#10b981', title: 'Update Profile',     desc: 'Keep your profile current' },
              { to: '/candidate/applications',  icon: '📋', accent: '#f59e0b', title: 'Track Applications', desc: 'Monitor your application status' },
            ].map((a) => (
              <motion.div key={a.to} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
                <Link
                  to={a.to}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all group"
                  style={{ borderColor: 'rgb(var(--border))' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgb(var(--indigo))';
                    e.currentTarget.style.backgroundColor = 'rgb(var(--indigo-bg))';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgb(var(--border))';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: a.accent + '22' }}>
                    {a.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold transition-colors" style={{ color: 'rgb(var(--text-primary))' }}>{a.title}</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{a.desc}</p>
                  </div>
                  <svg className="w-4 h-4 ml-auto transition-transform group-hover:translate-x-0.5"
                    style={{ color: 'rgb(var(--text-faint))' }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}