import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import jobService from '../../services/jobService';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDaysAgo = (date) => {
  const diff = Math.ceil(Math.abs(new Date() - new Date(date)) / 864e5);
  if (diff <= 1) return 'Today';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.ceil(diff / 7)}w ago`;
  return `${Math.ceil(diff / 30)}mo ago`;
};

const formatSalary = (r) => {
  if (!r?.min && !r?.max) return null;
  const fmt = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;
  return `${r.currency || 'USD'} ${fmt(r.min)}${r.max ? ` – ${fmt(r.max)}` : '+'}`;
};

const fmtType  = (t = '') => t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const fmtLevel = (l = '') => l.charAt(0).toUpperCase() + l.slice(1);

const companyColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#0ea5e9','#ef4444'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

const JOB_TYPE_COLORS = {
  'full-time':  { bg: '#dbeafe', text: '#1e40af' },
  'part-time':  { bg: '#fef3c7', text: '#92400e' },
  'contract':   { bg: '#ede9fe', text: '#5b21b6' },
  'internship': { bg: '#d1fae5', text: '#065f46' },
  'remote':     { bg: '#cffafe', text: '#155e75' },
};

const LEVEL_COLORS = {
  'entry':  { bg: '#d1fae5', text: '#065f46' },
  'mid':    { bg: '#dbeafe', text: '#1e40af' },
  'senior': { bg: '#ede9fe', text: '#5b21b6' },
  'lead':   { bg: '#fef3c7', text: '#92400e' },
};

// ─── Shared input style helpers ───────────────────────────────────────────────
const inputStyle = {
  color: 'rgb(var(--text-primary))',
  backgroundColor: 'rgb(var(--input-bg))',
  borderColor: 'rgb(var(--input-border))',
};
const inputFocusStyle = { backgroundColor: 'rgb(var(--input-focus-bg))' };

function ThemedInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition ${className}`}
      style={inputStyle}
      onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
      onBlur={e => Object.assign(e.target.style, inputStyle)}
    />
  );
}

function ThemedSelect({ className = '', ...props }) {
  return (
    <select
      {...props}
      className={`w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition ${className}`}
      style={inputStyle}
      onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
      onBlur={e => Object.assign(e.target.style, inputStyle)}
    />
  );
}

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ children, style }) {
  return (
    <span style={style} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tracking-wide">
      {children}
    </span>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job }) {
  const co      = job.company?.name || '';
  const color   = companyColor(co || job.title);
  const salary  = formatSalary(job.salaryRange);
  const typeCol  = JOB_TYPE_COLORS[job.jobType]         || { bg: '#f3f4f6', text: '#374151' };
  const levelCol = LEVEL_COLORS[job.experienceLevel]    || { bg: '#f3f4f6', text: '#374151' };

  return (
    <div
      className="group rounded-2xl shadow-sm transition-all duration-200 overflow-hidden border"
      style={{ backgroundColor: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--border))' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#a5b4fc';
        e.currentTarget.style.boxShadow = '0 4px 16px rgb(0 0 0 / 0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgb(var(--border))';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className="flex">
        {/* Left accent bar */}
        <div className="w-1 shrink-0 rounded-l-2xl" style={{ background: color }} />

        <div className="flex-1 p-6">
          {/* Top row */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0"
              style={{ background: color }}>
              {(co || job.title || 'J').charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link to={`/candidate/jobs/${job._id}`}
                    className="text-lg font-bold transition-colors leading-snug hover:underline"
                    style={{ color: 'rgb(var(--text-primary))' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--indigo))'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgb(var(--text-primary))'}>
                    {job.title}
                  </Link>
                  <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                    {co || 'Company'}
                    {job.location ? (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                    ) : null}
                  </p>
                </div>
                <span className="text-xs font-medium shrink-0 mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                  {getDaysAgo(job.createdAt)}
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {job.jobType        && <Pill style={typeCol}>{fmtType(job.jobType)}</Pill>}
                {job.experienceLevel && <Pill style={levelCol}>{fmtLevel(job.experienceLevel)}</Pill>}
                {salary && (
                  <Pill style={{ background: '#f0fdf4', color: '#166534' }}>
                    <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {salary}
                  </Pill>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed mt-4 line-clamp-2" style={{ color: 'rgb(var(--text-secondary))' }}>
            {job.description}
          </p>

          {/* Skills */}
          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.skills.slice(0, 6).map((sk, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md text-xs font-semibold"
                  style={{ backgroundColor: 'rgb(var(--indigo-bg))', color: 'rgb(var(--indigo))' }}>
                  {sk}
                </span>
              ))}
              {job.skills.length > 6 && (
                <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
                  style={{ backgroundColor: 'rgb(var(--bg-surface-2))', color: 'rgb(var(--text-muted))' }}>
                  +{job.skills.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Bottom CTA */}
          <div className="flex items-center justify-end mt-5 pt-4 border-t"
            style={{ borderColor: 'rgb(var(--border-subtle))' }}>
            <Link to={`/candidate/jobs/${job._id}`}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm">
              View Details
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JobSearchPage() {
  const [jobs,             setJobs]             = useState([]);
  const [isLoading,        setIsLoading]        = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [locationFilter,   setLocationFilter]   = useState('');
  const [jobTypeFilter,    setJobTypeFilter]    = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [filtersOpen,      setFiltersOpen]      = useState(false);

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const data = await jobService.getAllJobs();
      setJobs(data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load job listings');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return jobs.filter(j => {
      if (q && !(
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        j.company?.name?.toLowerCase().includes(q) ||
        j.skills?.some(s => s.toLowerCase().includes(q))
      )) return false;
      if (locationFilter && !j.location?.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (jobTypeFilter    !== 'all' && j.jobType         !== jobTypeFilter)    return false;
      if (experienceFilter !== 'all' && j.experienceLevel !== experienceFilter) return false;
      return true;
    });
  }, [jobs, searchTerm, locationFilter, jobTypeFilter, experienceFilter]);

  const hasFilters = searchTerm || locationFilter || jobTypeFilter !== 'all' || experienceFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm(''); setLocationFilter('');
    setJobTypeFilter('all'); setExperienceFilter('all');
  };

  const topLocations = useMemo(() => {
    const counts = {};
    jobs.forEach(j => { if (j.location) counts[j.location] = (counts[j.location] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
  }, [jobs]);

  const filtersActive = filtersOpen || jobTypeFilter !== 'all' || experienceFilter !== 'all';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .jsp-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="jsp-root max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'rgb(var(--text-primary))' }}>
            Find Your Next Role
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
            {isLoading ? 'Loading opportunities…' : `${jobs.length} open position${jobs.length !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {/* ── Search bar ── */}
        <div className="rounded-2xl shadow-sm p-4 mb-4 border"
          style={{ backgroundColor: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--border))' }}>
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Keyword */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'rgb(var(--text-muted))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <ThemedInput
                type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Job title, company, or skill…" className="pl-9 pr-4" />
            </div>

            {/* Location */}
            <div className="sm:w-48 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'rgb(var(--text-muted))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <ThemedInput
                type="text" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                placeholder="Location" className="pl-9 pr-4" />
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-2 rounded-xl transition shrink-0"
              style={filtersActive ? {
                borderColor: '#818cf8',
                color: 'rgb(var(--indigo))',
                backgroundColor: 'rgb(var(--indigo-bg))',
              } : {
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--text-secondary))',
                backgroundColor: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {(jobTypeFilter !== 'all' || experienceFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              )}
            </button>
          </div>

          {/* Advanced filters */}
          {filtersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t"
              style={{ borderColor: 'rgb(var(--border-subtle))' }}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'rgb(var(--text-muted))' }}>Job Type</label>
                <ThemedSelect value={jobTypeFilter} onChange={e => setJobTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="remote">Remote</option>
                </ThemedSelect>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'rgb(var(--text-muted))' }}>Experience Level</label>
                <ThemedSelect value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)}>
                  <option value="all">All Levels</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Lead / Manager</option>
                </ThemedSelect>
              </div>
            </div>
          )}
        </div>

        {/* ── Location quick chips ── */}
        {!isLoading && topLocations.length > 0 && !locationFilter && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>
              Popular:
            </span>
            {topLocations.map(loc => (
              <button key={loc} onClick={() => setLocationFilter(loc)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition"
                style={{ backgroundColor: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--text-secondary))' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#a5b4fc';
                  e.currentTarget.style.color = 'rgb(var(--indigo))';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgb(var(--border))';
                  e.currentTarget.style.color = 'rgb(var(--text-secondary))';
                }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {loc}
              </button>
            ))}
          </div>
        )}

        {/* ── Results bar ── */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              Showing{' '}
              <span className="font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{filtered.length}</span>
              {' '}result{filtered.length !== 1 ? 's' : ''}
              {hasFilters && <span style={{ color: 'rgb(var(--text-muted))' }}> (filtered)</span>}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs font-semibold hover:underline"
                style={{ color: 'rgb(var(--indigo))' }}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Finding opportunities for you…</p>
          </div>

        ) : filtered.length === 0 ? (
          /* ── Empty state ── */
          <div className="rounded-2xl p-16 text-center shadow-sm border"
            style={{ backgroundColor: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--border))' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgb(var(--indigo-bg))' }}>
              <svg className="w-8 h-8" style={{ color: 'rgb(var(--indigo))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'rgb(var(--text-primary))' }}>No jobs found</h3>
            <p className="text-sm mb-5 max-w-xs mx-auto" style={{ color: 'rgb(var(--text-muted))' }}>
              {hasFilters ? 'Try adjusting or clearing your filters.' : 'No positions are open right now. Check back soon.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition">
                Clear Filters
              </button>
            )}
          </div>

        ) : (
          <div className="space-y-4">
            {filtered.map(job => <JobCard key={job._id} job={job} />)}
          </div>
        )}
      </div>
    </div>
  );
} 