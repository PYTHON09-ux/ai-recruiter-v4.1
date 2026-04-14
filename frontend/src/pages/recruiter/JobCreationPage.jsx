import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import jobService from '../../services/jobService';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Shared field styles ──────────────────────────────────────────────────────
const INPUT  = "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder:text-gray-300 font-medium text-gray-900";
const SELECT = "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all font-medium text-gray-900";
const LABEL  = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

function Section({ title, icon, children, hint }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
        <span className="text-indigo-500">{icon}</span>
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, hint, span2 = false }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className={LABEL}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Tag chip (skill / benefit / question) ────────────────────────────────────
function Tag({ label, accent = 'indigo', onRemove, prefix }) {
  const styles = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg text-xs font-bold ${styles[accent]}`}>
      {prefix && <span className="opacity-60">{prefix}</span>}
      {label}
      <button type="button" onClick={onRemove}
        className="opacity-50 hover:opacity-100 transition-opacity ml-0.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// ─── Adder row (input + button) ───────────────────────────────────────────────
function Adder({ value, onChange, onAdd, placeholder, prefix, prefixValue, onPrefixChange, prefixOptions }) {
  return (
    <div className="flex gap-2">
      {prefixOptions && (
        <select value={prefixValue} onChange={e => onPrefixChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-gray-800 shrink-0">
          {prefixOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
        className={`${INPUT} flex-1`}
      />
      <button type="button" onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Add
      </button>
    </div>
  );
}

// ─── Question type config ─────────────────────────────────────────────────────
const Q_TYPES = [
  { value: 'technical',   label: 'Technical',   accent: 'indigo'  },
  { value: 'behavioral',  label: 'Behavioral',  accent: 'emerald' },
  { value: 'situational', label: 'Situational', accent: 'purple'  },
  { value: 'general',     label: 'General',     accent: 'amber'   },
];
const qAccent = (type) => Q_TYPES.find(t => t.value === type)?.accent || 'indigo';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function JobCreationPage() {
  const navigate     = useNavigate();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    // recruiterId comes from the JWT on the backend — no need to send it from frontend
    title:              '',
    description:        '',
    requirements:       '',
    location:           '',
    jobType:            'full-time',
    experienceLevel:    'mid',
    salaryRange:        { min: '', max: '', currency: 'USD' },
    skills:             [],
    benefits:           [],
    company: {
      name:     currentUser?.profileData?.company  || '',
      website:  currentUser?.profileData?.website  || '',
      industry: currentUser?.profileData?.industry || '',
    },
    applicationDeadline: '',
    interviewDuration:   '',
    interviewQuestions:  [],
  });

  const [newSkill,    setNewSkill]    = useState('');
  const [newBenefit,  setNewBenefit]  = useState('');
  const [newQuestion, setNewQuestion] = useState({ question: '', type: 'technical' });

  // ── Generic field handler ────────────────────────────────────────────────
  const handle = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(p => ({ ...p, [parent]: { ...p[parent], [child]: value } }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  // ── Skills ───────────────────────────────────────────────────────────────
  const addSkill = () => {
    const sk = newSkill.trim();
    if (!sk || formData.skills.includes(sk)) return;
    setFormData(p => ({ ...p, skills: [...p.skills, sk] }));
    setNewSkill('');
  };
  const removeSkill = (sk) =>
    setFormData(p => ({ ...p, skills: p.skills.filter(s => s !== sk) }));

  // ── Benefits ─────────────────────────────────────────────────────────────
  const addBenefit = () => {
    const b = newBenefit.trim();
    if (!b || formData.benefits.includes(b)) return;
    setFormData(p => ({ ...p, benefits: [...p.benefits, b] }));
    setNewBenefit('');
  };
  // BUG FIX: original called removeSkill(skill) instead of removeBenefit(benefit)
  const removeBenefit = (b) =>
    setFormData(p => ({ ...p, benefits: p.benefits.filter(x => x !== b) }));

  // ── Interview questions ───────────────────────────────────────────────────
  const addQuestion = () => {
    if (!newQuestion.question.trim()) return;
    setFormData(p => ({
      ...p,
      interviewQuestions: [
        ...p.interviewQuestions,
        { ...newQuestion, question: newQuestion.question.trim(), expectedDuration: 120 },
      ],
    }));
    setNewQuestion({ question: '', type: 'technical' });
  };
  const removeQuestion = (i) =>
    setFormData(p => ({ ...p, interviewQuestions: p.interviewQuestions.filter((_, idx) => idx !== i) }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.requirements ||
        !formData.location || !formData.applicationDeadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const jobData = {
        ...formData,
        interviewDuration: formData.interviewDuration ? parseInt(formData.interviewDuration) : null,
        salaryRange: {
          ...formData.salaryRange,
          min: formData.salaryRange.min ? parseInt(formData.salaryRange.min) : undefined,
          max: formData.salaryRange.max ? parseInt(formData.salaryRange.max) : undefined,
        },
      };
      await jobService.createJob(jobData);
      toast.success('Job posted successfully!');
      navigate('/recruiter/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create job');
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');
        .jc-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="jc-root max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <button onClick={() => navigate('/recruiter/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-semibold transition mb-5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Post a New Job</h1>
          <p className="text-sm text-gray-400 mt-1">Fill in the details to attract the right candidates.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Basic Information ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}>
            <Section title="Basic Information" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Job Title *" span2>
                  <input type="text" name="title" value={formData.title} onChange={handle}
                    className={INPUT} placeholder="e.g. Senior Frontend Developer" required />
                </Field>

                <Field label="Location *">
                  <input type="text" name="location" value={formData.location} onChange={handle}
                    className={INPUT} placeholder="e.g. New York, NY or Remote" required />
                </Field>

                <Field label="Job Type *">
                  <select name="jobType" value={formData.jobType} onChange={handle} className={SELECT}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="remote">Remote</option>
                  </select>
                </Field>

                <Field label="Experience Level *">
                  <select name="experienceLevel" value={formData.experienceLevel} onChange={handle} className={SELECT}>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="lead">Lead / Manager</option>
                  </select>
                </Field>

                <Field label="Application Deadline *">
                  <input type="date" name="applicationDeadline" value={formData.applicationDeadline}
                    onChange={handle} min={today} className={INPUT} required />
                </Field>

                <Field label="Description *" span2>
                  <textarea name="description" value={formData.description} onChange={handle}
                    rows={5} required className={`${INPUT} resize-none`}
                    placeholder="Describe the role, responsibilities, and what makes this position exciting…" />
                </Field>

                <Field label="Requirements *" span2>
                  <textarea name="requirements" value={formData.requirements} onChange={handle}
                    rows={4} required className={`${INPUT} resize-none`}
                    placeholder="List the required qualifications, experience, and skills…" />
                </Field>
              </div>
            </Section>
          </motion.div>

          {/* ── Company ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
            <Section title="Company Details" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            } hint="Pre-filled from your profile — update if needed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Company Name">
                  <input type="text" name="company.name" value={formData.company.name}
                    onChange={handle} className={INPUT} placeholder="Your company name" />
                </Field>
                <Field label="Industry">
                  <input type="text" name="company.industry" value={formData.company.industry}
                    onChange={handle} className={INPUT} placeholder="e.g. Technology, Finance" />
                </Field>
                <Field label="Website" span2>
                  <input type="url" name="company.website" value={formData.company.website}
                    onChange={handle} className={INPUT} placeholder="https://yourcompany.com" />
                </Field>
              </div>
            </Section>
          </motion.div>

          {/* ── Salary ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
            <Section title="Salary Range" hint="Optional — leave blank if undisclosed" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Field label="Minimum">
                  <input type="number" name="salaryRange.min" value={formData.salaryRange.min}
                    onChange={handle} className={INPUT} placeholder="50,000" min="0" />
                </Field>
                <Field label="Maximum">
                  <input type="number" name="salaryRange.max" value={formData.salaryRange.max}
                    onChange={handle} className={INPUT} placeholder="80,000" min="0" />
                </Field>
                <Field label="Currency">
                  <select name="salaryRange.currency" value={formData.salaryRange.currency}
                    onChange={handle} className={SELECT}>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                    <option value="AUD">AUD — Australian Dollar</option>
                  </select>
                </Field>
              </div>
            </Section>
          </motion.div>

          {/* ── Skills ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <Section title="Required Skills" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }>
              <Adder value={newSkill} onChange={setNewSkill} onAdd={addSkill}
                placeholder="Add a skill and press Enter (e.g. React, Node.js)" />
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {formData.skills.map((sk, i) => (
                    <Tag key={i} label={sk} accent="indigo" onRemove={() => removeSkill(sk)} />
                  ))}
                </div>
              )}
            </Section>
          </motion.div>

          {/* ── Benefits ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <Section title="Benefits" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }>
              <Adder value={newBenefit} onChange={setNewBenefit} onAdd={addBenefit}
                placeholder="Add a benefit and press Enter (e.g. Health Insurance, Remote Work)" />
              {formData.benefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {/* BUG FIX: was calling removeSkill(skill) — now correctly calls removeBenefit(b) */}
                  {formData.benefits.map((b, i) => (
                    <Tag key={i} label={b} accent="emerald" onRemove={() => removeBenefit(b)} />
                  ))}
                </div>
              )}
            </Section>
          </motion.div>

          {/* ── Interview Duration ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <Section title="Interview Duration" hint="How long should the AI interview take?" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }>
              <div className="max-w-xs">
                <Field label="Duration">
                  <select name="interviewDuration" value={formData.interviewDuration}
                    onChange={handle} className={SELECT}>
                    <option value="">Select duration…</option>
                    {[5, 10, 15, 20, 30, 45, 60].map(v => (
                      <option key={v} value={v}>{v} minutes</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>
          </motion.div>

          {/* ── Interview Questions ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <Section title="Interview Questions" hint="Questions the AI interviewer will ask candidates" icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }>
              <Adder
                value={newQuestion.question}
                onChange={v => setNewQuestion(p => ({ ...p, question: v }))}
                onAdd={addQuestion}
                placeholder="Type a question and press Enter…"
                prefixValue={newQuestion.type}
                onPrefixChange={v => setNewQuestion(p => ({ ...p, type: v }))}
                prefixOptions={Q_TYPES.map(t => ({ value: t.value, label: t.label }))}
              />

              {formData.interviewQuestions.length > 0 && (
                <div className="space-y-2 mt-5">
                  {formData.interviewQuestions.map((q, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200 transition-all"
                    >
                      <span className="text-xs font-bold text-gray-400 mt-0.5 shrink-0 w-5 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <Tag label={q.type} accent={qAccent(q.type)} onRemove={null} />
                        <p className="text-sm text-gray-800 font-medium mt-2 leading-snug">{q.question}</p>
                      </div>
                      <button type="button" onClick={() => removeQuestion(i)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {formData.interviewQuestions.length === 0 && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-700 font-medium">
                    No questions added yet. The AI will use default questions if none are specified.
                  </p>
                </div>
              )}
            </Section>
          </motion.div>

          {/* ── Submit ── */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <button type="button" onClick={() => navigate('/recruiter/dashboard')}
              className="px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
              Cancel
            </button>
            <motion.button type="submit" disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-7 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm shadow-indigo-500/25 hover:-translate-y-0.5">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Post Job
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}