// ─── ProfileDisplayPage.jsx ───────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

const avatarColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

function Section({ title, icon, children, delay = 0 }) {
  return (
    <motion.div {...fadeUp(delay)}
      className="rounded-2xl shadow-sm overflow-hidden border"
      style={{ backgroundColor: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--border))' }}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b"
        style={{ borderColor: 'rgb(var(--border-subtle))' }}>
        <span style={{ color: 'rgb(var(--indigo))' }}>{icon}</span>
        <h2 className="font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

function InfoRow({ label, value, href, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b last:border-0"
      style={{ borderColor: 'rgb(var(--border-subtle))' }}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-sm font-semibold hover:underline break-all" style={{ color: 'rgb(var(--indigo))' }}>
          {value}
        </a>
      ) : (
        <span className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}
          style={{ color: value ? 'rgb(var(--text-primary))' : 'rgb(var(--text-faint))' }}>
          {value || 'Not provided'}
        </span>
      )}
    </div>
  );
}

export function ProfileDisplayPage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Loading profile…</p>
        </div>
      </div>
    );
  }

  const name      = currentUser.firstName && currentUser.lastName
    ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name || 'User';
  const color     = avatarColor(name);
  const photo     = currentUser.profileData?.profilePicture;
  const profile   = currentUser.profileData || {};
  const isRecruiter = currentUser.role === 'recruiter';
  const editPath  = isRecruiter ? '/recruiter/profile/edit' : '/candidate/profile/edit';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=DM+Serif+Display@display=swap');
        .profile-root { font-family: 'DM Sans', sans-serif; }
        .serif { font-family: 'DM Serif Display', serif; }
      `}</style>

      <div className="profile-root max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        {/* Hero card */}
        <motion.div {...fadeUp(0)} className="rounded-2xl shadow-sm overflow-hidden border"
          style={{ backgroundColor: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--border))' }}>
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {photo ? (
              <img src={photo} alt={name} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-md shrink-0"
                style={{ background: color }}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="serif text-2xl font-normal leading-tight" style={{ color: 'rgb(var(--text-primary))' }}>{name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                  style={{ backgroundColor: 'rgb(var(--indigo-bg))', color: 'rgb(var(--indigo))' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: 'rgb(var(--indigo))' }} />
                  {currentUser.role}
                </span>
                {currentUser.isEmailVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm mt-2 leading-relaxed max-w-lg line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
                  {profile.bio}
                </p>
              )}
            </div>
            <Link to={editPath}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition shadow-sm hover:-translate-y-0.5 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </Link>
          </div>
        </motion.div>

        {/* Basic info */}
        <Section delay={0.08} title="Basic Information" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoRow label="Full Name" value={name} />
            <InfoRow label="Email" value={currentUser.email} mono />
            <InfoRow label="Phone" value={profile.phoneNumber} />
            <InfoRow label="Role" value={currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1)} />
          </div>
        </Section>

        {isRecruiter && (
          <Section delay={0.13} title="Company Information" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Company"  value={profile.company  || currentUser.company} />
              <InfoRow label="Industry" value={profile.industry || currentUser.industry} />
              <InfoRow label="Website" value={profile.website || currentUser.website} href={profile.website || currentUser.website} />
            </div>
          </Section>
        )}

        {/* Professional info */}
        <Section delay={0.18} title="Professional Information" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--text-muted))' }}>Bio</p>
              <p className="text-sm leading-relaxed" style={{ color: profile.bio ? 'rgb(var(--text-secondary))' : 'rgb(var(--text-faint))' }}>
                {profile.bio || 'No bio provided yet.'}
              </p>
            </div>
            <div className="border-t pt-5" style={{ borderColor: 'rgb(var(--border-subtle))' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--text-muted))' }}>Skills</p>
              {profile.skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((sk, i) => (
                    <span key={i} className="px-3 py-1 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: 'rgb(var(--indigo-bg))', color: 'rgb(var(--indigo))' }}>
                      {sk}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: 'rgb(var(--text-faint))' }}>No skills added yet.</p>
              )}
            </div>
            <div className="border-t pt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8" style={{ borderColor: 'rgb(var(--border-subtle))' }}>
              <InfoRow label="Experience" value={profile.experience ? `${profile.experience} year${profile.experience !== 1 ? 's' : ''}` : undefined} />
              <InfoRow label="Education" value={profile.education} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

export default ProfileDisplayPage;