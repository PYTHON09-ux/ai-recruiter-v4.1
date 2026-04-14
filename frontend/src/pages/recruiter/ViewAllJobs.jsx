import React, { useState, useEffect } from 'react';
import { jobsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f7f6f2',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: '2rem',
  },
  header: {
    marginBottom: '2rem',
  },
  headerTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  headerSub: {
    fontSize: '0.9rem',
    color: '#888',
    marginTop: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '14px',
    border: '1px solid #ebebeb',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  cardHover: {
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInitials: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    background: '#f0edff',
    color: '#5a4fcf',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  statusBadge: (status) => ({
    fontSize: '0.72rem',
    fontWeight: '500',
    padding: '3px 10px',
    borderRadius: '20px',
    background: status === 'active' ? '#e6f7ee' : '#f5f5f5',
    color: status === 'active' ? '#1a7a45' : '#888',
    border: `1px solid ${status === 'active' ? '#b3e8ca' : '#e0e0e0'}`,
    textTransform: 'capitalize',
  }),
  jobTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
    lineHeight: 1.3,
  },
  company: {
    fontSize: '0.85rem',
    color: '#666',
    marginTop: '2px',
  },
  metaRow: {
    display: 'flex',
    gap: '0.6rem',
    flexWrap: 'wrap',
  },
  metaPill: {
    fontSize: '0.75rem',
    background: '#f4f4f4',
    color: '#555',
    padding: '3px 10px',
    borderRadius: '20px',
    border: '1px solid #ebebeb',
    textTransform: 'capitalize',
  },
  cardFooter: {
    borderTop: '1px solid #f0f0f0',
    paddingTop: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salary: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#5a4fcf',
  },
  deadline: {
    fontSize: '0.75rem',
    color: '#aaa',
  },

  // Detail panel
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  detailPanel: {
    width: '520px',
    maxWidth: '95vw',
    background: '#fff',
    height: '100vh',
    overflowY: 'auto',
    padding: '2rem',
    boxShadow: '-4px 0 30px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  closeBtn: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#555',
    alignSelf: 'flex-start',
  },
  detailHeader: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  detailInitials: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: '#f0edff',
    color: '#5a4fcf',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  detailTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  detailCompany: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '3px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionLabel: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  sectionText: {
    fontSize: '0.9rem',
    color: '#333',
    lineHeight: 1.65,
    whiteSpace: 'pre-line',
  },
  skillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  skillPill: {
    fontSize: '0.78rem',
    background: '#f0edff',
    color: '#5a4fcf',
    padding: '4px 12px',
    borderRadius: '20px',
    fontWeight: '500',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  statCard: {
    background: '#fafafa',
    border: '1px solid #f0f0f0',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
  },
  statLabel: {
    fontSize: '0.72rem',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '3px',
  },
  statValue: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },

  // Loading / empty states
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#aaa',
    fontSize: '0.95rem',
  },
  error: {
    background: '#fff3f3',
    border: '1px solid #ffd0d0',
    color: '#c0392b',
    padding: '1rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
  },
};

function formatSalary(range) {
  if (!range) return 'N/A';
  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: range.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  return `${fmt(range.min)} – ${fmt(range.max)}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function JobCard({ job, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...styles.card, ...(hovered ? styles.cardHover : {}) }}
      onClick={() => onClick(job)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardTop}>
        <div style={styles.companyInitials}>{getInitials(job.company?.name)}</div>
        <span style={styles.statusBadge(job.status)}>{job.status}</span>
      </div>

      <div>
        <p style={styles.jobTitle}>{job.title}</p>
        <p style={styles.company}>
          {job.company?.name} &middot; {job.location}
        </p>
      </div>

      <div style={styles.metaRow}>
        <span style={styles.metaPill}>{job.jobType}</span>
        <span style={styles.metaPill}>{job.experienceLevel}</span>
        {job.skills?.slice(0, 2).map((s) => (
          <span key={s} style={styles.metaPill}>{s}</span>
        ))}
      </div>

      <div style={styles.cardFooter}>
        <span style={styles.salary}>{formatSalary(job.salaryRange)}</span>
        <span style={styles.deadline}>
          Deadline: {formatDate(job.applicationDeadline)}
        </span>
      </div>
    </div>
  );
}

function JobDetail({ job, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          ← Back
        </button>

        <div style={styles.detailHeader}>
          <div style={styles.detailInitials}>{getInitials(job.company?.name)}</div>
          <div>
            <p style={styles.detailTitle}>{job.title}</p>
            <p style={styles.detailCompany}>
              {job.company?.name} &middot; {job.location}
            </p>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Job type</p>
            <p style={styles.statValue}>{job.jobType}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Experience</p>
            <p style={styles.statValue}>{job.experienceLevel}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Salary</p>
            <p style={{ ...styles.statValue, color: '#5a4fcf', fontSize: '0.85rem' }}>
              {formatSalary(job.salaryRange)}
            </p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Applications</p>
            <p style={styles.statValue}>{job.applicationCount ?? 0}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Deadline</p>
            <p style={{ ...styles.statValue, fontSize: '0.85rem' }}>
              {formatDate(job.applicationDeadline)}
            </p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Status</p>
            <p style={styles.statValue}>{job.status}</p>
          </div>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionLabel}>Description</p>
          <p style={styles.sectionText}>{job.description}</p>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionLabel}>Requirements</p>
          <p style={styles.sectionText}>{job.requirements}</p>
        </div>

        {job.benefits?.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Benefits</p>
            <div style={styles.skillsRow}>
              {job.benefits.map((b) => (
                <span key={b} style={{ ...styles.skillPill, background: '#e6f7ee', color: '#1a7a45' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {job.skills?.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Skills</p>
            <div style={styles.skillsRow}>
              {job.skills.map((s) => (
                <span key={s} style={styles.skillPill}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {job.company?.website && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Company website</p>
            <a
              href={job.company.website}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#5a4fcf', fontSize: '0.9rem' }}
            >
              {job.company.website}
            </a>
          </div>
        )}

        <div style={styles.section}>
          <p style={styles.sectionLabel}>Posted</p>
          <p style={{ ...styles.sectionText, color: '#aaa' }}>{formatDate(job.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ViewAllJobs() {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      const response = await jobsAPI.getMyJobs();
      setJobs(response.data.jobs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>My Job Listings</h1>
        <p style={styles.headerSub}>
          {!loading && !error && `${jobs.length} job${jobs.length !== 1 ? 's' : ''} posted`}
        </p>
      </div>

      {loading && <div style={styles.loading}>Loading jobs…</div>}

      {error && <div style={styles.error}>{error}</div>}

      {!loading && !error && jobs.length === 0 && (
        <div style={styles.loading}>No jobs posted yet.</div>
      )}

      {!loading && !error && (
        <div style={styles.grid}>
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} onClick={setSelectedJob} />
          ))}
        </div>
      )}

      {selectedJob && (
        <JobDetail job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}