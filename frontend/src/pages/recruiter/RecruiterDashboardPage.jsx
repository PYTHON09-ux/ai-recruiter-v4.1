import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { jobsAPI, applicationsAPI } from '../../services/api';
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

const avatarColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#0ea5e9','#ef4444'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

// ─── Status config ────────────────────────────────────────────────────────────
const APP_STATUS = {
  pending:             { label: 'Pending',        dot: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  reviewing:           { label: 'Reviewing',      dot: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  shortlisted:         { label: 'Shortlisted',    dot: '#10b981', bg: '#d1fae5', text: '#065f46' },
  interview_scheduled: { label: 'Int. Scheduled', dot: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6' },
  interview_completed: { label: 'Int. Completed', dot: '#6366f1', bg: '#e0e7ff', text: '#3730a3' },
  interviewed:         { label: 'Interviewed',    dot: '#6366f1', bg: '#e0e7ff', text: '#3730a3' },
  hired:               { label: 'Hired',          dot: '#059669', bg: '#d1fae5', text: '#064e3b' },
  rejected:            { label: 'Rejected',       dot: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
};

function StatusBadge({ status }) {
  const cfg = APP_STATUS[status] || { label: status, dot: '#9ca3af', bg: '#f3f4f6', text: '#374151' };
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
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
        style={{ background: accent + '15' }}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
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
      className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">{title}</h2>
        {linkTo && (
          <Link to={linkTo}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
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
      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-4 max-w-[200px]">{desc}</p>
      {linkTo && (
        <Link to={linkTo}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RecruiterDashboardPage() {
  const { currentUser } = useAuth();
  const [isLoading,          setIsLoading]          = useState(true);
  const [recentJobs,         setRecentJobs]         = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [stats,              setStats]              = useState({
    totalJobs: 0, activeJobs: 0, totalApplications: 0, pendingApplications: 0,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);

    // Use Promise.allSettled so one failure doesn't blank the whole dashboard.
    // getMyJobs reads recruiter identity from the JWT — no user ID param needed.
    // getAllJobs with no params returns all jobs (recruiter-scoped server-side).
    const [jobRes, appRes] = await Promise.allSettled([
      jobsAPI.getMyJobs({ page: 1, limit: 10 }),
      applicationsAPI.getAllApplications({ page: 1, limit: 10 }),
    ]);

    // Unwrap jobs — try getMyJobs first, fall back gracefully
    const jobs = (() => {
      if (jobRes.status !== 'fulfilled') {
        console.error('Jobs fetch failed:', jobRes.reason);
        return [];
      }
      const d = jobRes.value?.data;
      // API may return { data: [...] } or { data: { data: [...] } }
      return Array.isArray(d) ? d : (d?.data || d?.jobs || []);
    })();

    // Unwrap applications
    const apps = (() => {
      if (appRes.status !== 'fulfilled') {
        console.error('Applications fetch failed:', appRes.reason);
        return [];
      }
      const d = appRes.value?.data;
      return Array.isArray(d) ? d : (d?.data || d?.applications || []);
    })();

    setRecentJobs(Array.isArray(jobs) ? jobs.slice(0, 5) : []);
    setRecentApplications(Array.isArray(apps) ? apps.slice(0, 5) : []);

    setStats({
      totalJobs:           Array.isArray(jobs) ? jobs.length : 0,
      activeJobs:          Array.isArray(jobs) ? jobs.filter(j => j.status === 'active').length : 0,
      totalApplications:   Array.isArray(apps) ? apps.length : 0,
      pendingApplications: Array.isArray(apps) ? apps.filter(a => a.status === 'pending').length : 0,
    });

    setIsLoading(false);
  };

  const firstName = currentUser?.firstName || currentUser?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=DM+Serif+Display@display=swap');
        .rdash { font-family: 'DM Sans', sans-serif; }
        .serif { font-family: 'DM Serif Display', serif; }
      `}</style>

      <div className="rdash max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">{greeting}</p>
            <h1 className="serif text-3xl font-normal text-gray-900">
              {firstName}<span className="text-indigo-400">.</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Here's what's happening with your recruitment.</p>
          </div>
          <Link
            to="/recruiter/jobs/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition shadow-sm shadow-indigo-500/25 hover:-translate-y-0.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post New Job
          </Link>
        </motion.div>

        {/* ── Stats ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard delay={0.05} accent="#6366f1" icon="💼" label="Total Jobs"     value={stats.totalJobs} />
          <StatCard delay={0.1}  accent="#10b981" icon="✅" label="Active Jobs"    value={stats.activeJobs} />
          <StatCard delay={0.15} accent="#8b5cf6" icon="👥" label="Applications"   value={stats.totalApplications} />
          <StatCard delay={0.2}  accent="#f59e0b" icon="⏳" label="Pending Review" value={stats.pendingApplications} />
        </div>

        {/* ── Two-column grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Jobs */}
          <SectionCard title="Recent Job Posts" linkTo="/recruiter/jobs/create" linkLabel="Post new" delay={0.25}>
            {recentJobs.length === 0 ? (
              <Empty icon="💼" title="No jobs posted yet"
                desc="Create your first job posting to start receiving applications."
                linkTo="/recruiter/jobs/create" linkLabel="Post Your First Job" />
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job, i) => (
                  <motion.div
                    key={job._id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
                  >
                    {/* Job color tile */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: avatarColor(job.title || '') }}
                    >
                      {(job.title || 'J').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                        {job.location && (
                          <>
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {job.location} ·{' '}
                          </>
                        )}
                        {getDaysAgo(job.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          job.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {job.status === 'active' ? '● Active' : job.status || 'Draft'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {job.applicationsCount || job.applicationCount || 0} applications
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link to={`/recruiter/jobs/${job._id}`}
                        className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <Link to={`/recruiter/jobs/${job._id}/edit`}
                        className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent Applications */}
          <SectionCard title="Recent Applications" linkTo="/recruiter/candidates" linkLabel="View all" delay={0.3}>
            {recentApplications.length === 0 ? (
              <Empty icon="👥" title="No applications yet"
                desc="Applications will appear here once candidates start applying to your jobs." />
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app, i) => {
                  const name  = `${app.candidateId?.firstName || ''} ${app.candidateId?.lastName || ''}`.trim() || 'Unknown Candidate';
                  const color = avatarColor(name);
                  return (
                    <motion.div
                      key={app._id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.35 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
                    >
                      {/* Candidate avatar */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ background: color }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {app.jobId?.title || 'Unknown Position'}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">{fmtDate(app.createdAt)}</p>
                      </div>

                      <Link
                        to={`/recruiter/candidates/${app._id}`}
                        className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
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
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
            <span className="text-indigo-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <h2 className="font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { to: '/recruiter/jobs/create',  icon: '➕', accent: '#6366f1', title: 'Post New Job',        desc: 'Create a new job posting'        },
              { to: '/recruiter/candidates',   icon: '👥', accent: '#10b981', title: 'Review Applications', desc: 'Manage candidate applications'    },
              { to: '/recruiter/analytics',    icon: '📊', accent: '#f59e0b', title: 'View Analytics',      desc: 'Check recruitment metrics'        },
            ].map((a) => (
              <motion.div key={a.to} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
                <Link
                  to={a.to}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: a.accent + '15' }}>
                    {a.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 ml-auto transition-all group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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