import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const avatarColor = (name = '') => {
  const cs = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

const INPUT = "w-full px-4 py-3 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-gray-300 font-medium";
const LABEL  = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

function Section({ title, icon, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
        <span className="text-indigo-500">{icon}</span>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Photo upload widget ──────────────────────────────────────────────────────
function PhotoUploader({ currentPhoto, userName, onPhotoChange }) {
  const [uploading,   setUploading]   = useState(false);
  const [preview,     setPreview]     = useState(currentPhoto || null);
  const [confirm,     setConfirm]     = useState(null); // 'delete' | 'replace'
  const [pendingFile, setPendingFile] = useState(null);
  const inputRef = useRef(null);
  const color = avatarColor(userName);

  // Keep preview in sync if parent photo changes (e.g. after save)
  useEffect(() => { setPreview(currentPhoto || null); }, [currentPhoto]);

  const doUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      // POST /auth/profile/picture — handled by the backend route below
      const res = await authAPI.uploadProfilePicture(formData);
      const newUrl = res.data?.data?.profilePicture || res.data?.profilePicture;
      setPreview(newUrl);
      onPhotoChange(newUrl);
      toast.success('Photo updated!');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setPendingFile(null);
      setConfirm(null);
    }
  };

  const doDelete = async () => {
    setUploading(true);
    try {
      // DELETE /auth/profile/picture — deletes from Cloudinary + clears DB field
      await authAPI.deleteProfilePicture();
      setPreview(null);
      onPhotoChange(null);
      toast.success('Photo removed');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to remove photo');
    } finally {
      setUploading(false);
      setConfirm(null);
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected after cancel
    e.target.value = '';

    if (preview) {
      // Already has a photo — confirm before overwriting
      setPendingFile(file);
      setConfirm('replace');
    } else {
      doUpload(file);
    }
  };

  return (
    <>
      <div className="flex items-center gap-6">
        {/* Photo / avatar */}
        <div className="relative shrink-0">
          {preview ? (
            <img src={preview} alt={userName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-md"
              style={{ background: color }}>
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {preview ? 'Change Photo' : 'Upload Photo'}
          </button>

          {preview && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => setConfirm('delete')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove Photo
            </button>
          )}

          <p className="text-xs text-gray-400">JPG, PNG or GIF · max 5 MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {/* Confirm dialogs */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setConfirm(null); setPendingFile(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              {confirm === 'delete' ? (
                <>
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 text-center mb-1">Remove profile photo?</h3>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    This will permanently delete your photo from our servers. Your initials avatar will be shown instead.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => { setConfirm(null); }}
                      className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button onClick={doDelete}
                      className="flex-1 px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-500 transition">
                      Yes, Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 text-center mb-1">Replace current photo?</h3>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    Your existing photo will be deleted from our servers and replaced with the new one.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => { setConfirm(null); setPendingFile(null); }}
                      className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button onClick={() => doUpload(pendingFile)}
                      className="flex-1 px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition">
                      Yes, Replace
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfileEditPage() {
  const { currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [newSkill,  setNewSkill]  = useState('');
  const [formData,  setFormData]  = useState({
    firstName: '', lastName: '', email: '',
    company: '', website: '', industry: '',
    profileData: { phoneNumber: '', bio: '', skills: [], experience: 0, education: '' },
  });

  const isRecruiter = currentUser?.role === 'recruiter';
  const backPath    = isRecruiter ? '/recruiter/profile' : '/candidate/profile';

  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      firstName: currentUser.firstName || currentUser.name?.split(' ')[0] || '',
      lastName:  currentUser.lastName  || currentUser.name?.split(' ').slice(1).join(' ') || '',
      email:     currentUser.email || '',
      company:   currentUser.profileData?.company  || currentUser.company  || '',
      website:   currentUser.profileData?.website  || currentUser.website  || '',
      industry:  currentUser.profileData?.industry || currentUser.industry || '',
      profileData: {
        phoneNumber: currentUser.profileData?.phoneNumber || '',
        bio:         currentUser.profileData?.bio         || '',
        skills:      currentUser.profileData?.skills      || [],
        experience:  currentUser.profileData?.experience  || 0,
        education:   currentUser.profileData?.education   || '',
      },
    });
  }, [currentUser]);

  const set = (name, value) => {
    if (name.startsWith('profileData.')) {
      const field = name.split('.')[1];
      setFormData(p => ({
        ...p,
        profileData: {
          ...p.profileData,
          [field]: field === 'experience' ? (value === '' ? 0 : parseInt(value) || 0) : value,
        },
      }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  const handle = (e) => set(e.target.name, e.target.value);

  const addSkill = () => {
    const sk = newSkill.trim();
    if (!sk || formData.profileData.skills.includes(sk)) return;
    setFormData(p => ({ ...p, profileData: { ...p.profileData, skills: [...p.profileData.skills, sk] } }));
    setNewSkill('');
  };

  const removeSkill = (sk) =>
    setFormData(p => ({ ...p, profileData: { ...p.profileData, skills: p.profileData.skills.filter(s => s !== sk) } }));

  const handlePhotoChange = (newUrl) => {
    updateUser(prev => ({
      ...prev,
      profileData: { ...(prev.profileData || {}), profilePicture: newUrl },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName:  formData.lastName.trim(),
        profileData: {
          ...formData.profileData,
          company:  formData.company.trim(),
          website:  formData.website.trim(),
          industry: formData.industry.trim(),
        },
      };

      const res = await authAPI.updateProfile(payload);
      const updated = res.data?.user || res.data;

      updateUser(prev => ({
        ...prev,
        firstName: payload.firstName,
        lastName:  payload.lastName,
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        profileData: { ...(prev.profileData || {}), ...payload.profileData },
      }));

      toast.success('Profile saved!');
      navigate(backPath);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const name = `${formData.firstName} ${formData.lastName}`.trim() || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');
        .edit-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="edit-root max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <button onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-semibold transition mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Edit Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Update your account information and preferences.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Photo ── */}
          <Section title="Profile Photo" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }>
            <PhotoUploader
              currentPhoto={currentUser?.profileData?.profilePicture}
              userName={name}
              onPhotoChange={handlePhotoChange}
            />
          </Section>

          {/* ── Basic info ── */}
          <Section title="Basic Information" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="First Name *">
                <input type="text" name="firstName" value={formData.firstName}
                  onChange={handle} required className={INPUT} placeholder="John" />
              </Field>
              <Field label="Last Name *">
                <input type="text" name="lastName" value={formData.lastName}
                  onChange={handle} required className={INPUT} placeholder="Doe" />
              </Field>
              <Field label="Email" hint="Email cannot be changed">
                <input type="email" value={formData.email} disabled
                  className={`${INPUT} opacity-50 cursor-not-allowed`} />
              </Field>
              <Field label="Phone Number">
                <input type="tel" name="profileData.phoneNumber"
                  value={formData.profileData.phoneNumber}
                  onChange={handle} className={INPUT} placeholder="+1 (555) 123-4567" />
              </Field>
            </div>
          </Section>

          {/* ── Company info (recruiter only) ── */}
          {isRecruiter && (
            <Section title="Company Information" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Company Name">
                  <input type="text" name="company" value={formData.company}
                    onChange={handle} className={INPUT} placeholder="Acme Inc." />
                </Field>
                <Field label="Industry">
                  <input type="text" name="industry" value={formData.industry}
                    onChange={handle} className={INPUT} placeholder="Technology, Finance…" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Website">
                    <input type="url" name="website" value={formData.website}
                      onChange={handle} className={INPUT} placeholder="https://yourcompany.com" />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {/* ── Professional info ── */}
          <Section title="Professional Information" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }>
            <div className="space-y-5">
              <Field label="Bio">
                <textarea name="profileData.bio" value={formData.profileData.bio}
                  onChange={handle} rows={4}
                  className={`${INPUT} resize-none`}
                  placeholder="Tell us about yourself…" />
              </Field>

              <Field label="Skills">
                <div className="flex gap-2 mb-3">
                  <input type="text" value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    className={`${INPUT} flex-1`} placeholder="Type a skill and press Enter…" />
                  <button type="button" onClick={addSkill}
                    className="px-4 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition shrink-0">
                    Add
                  </button>
                </div>
                {formData.profileData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.profileData.skills.map((sk, i) => (
                      <span key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold">
                        {sk}
                        <button type="button" onClick={() => removeSkill(sk)}
                          className="text-indigo-400 hover:text-red-500 transition leading-none">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Years of Experience" hint="Enter a number">
                  <input type="number" name="profileData.experience"
                    value={formData.profileData.experience}
                    onChange={handle} min="0" max="50"
                    className={INPUT} placeholder="e.g. 3" />
                </Field>
                <Field label="Education">
                  <textarea name="profileData.education"
                    value={formData.profileData.education}
                    onChange={handle} rows={3}
                    className={`${INPUT} resize-none`}
                    placeholder="B.Sc. Computer Science, MIT…" />
                </Field>
              </div>
            </div>
          </Section>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <button type="button" onClick={() => navigate(backPath)}
              className="px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
              Cancel
            </button>
            <motion.button type="submit" disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm shadow-indigo-500/25 hover:-translate-y-0.5">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}