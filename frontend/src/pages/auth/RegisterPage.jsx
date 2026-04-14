import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const INPUT_CLS = [
  'w-full px-4 py-3 text-sm font-medium rounded-xl border transition-all',
  'placeholder:text-gray-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent',
].join(' ');

const inputStyle = {
  color: 'rgb(var(--text-primary))',
  backgroundColor: 'rgb(var(--input-bg))',
  borderColor: 'rgb(var(--input-border))',
};
const inputFocusStyle = { backgroundColor: 'rgb(var(--input-focus-bg))' };

const LABEL_CLS = 'block text-xs font-bold uppercase tracking-wider mb-1.5';

function Field({ label, id, children }) {
  return (
    <div className="space-y-0">
      <label htmlFor={id} className={LABEL_CLS} style={{ color: 'rgb(var(--text-secondary))' }}>{label}</label>
      {children}
    </div>
  );
}

function ThemedInput(props) {
  return (
    <input
      {...props}
      className={`${INPUT_CLS} ${props.className || ''}`}
      style={inputStyle}
      onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
      onBlur={e => Object.assign(e.target.style, inputStyle)}
    />
  );
}

function StrengthBar({ password }) {
  const strength = (() => {
    let s = 0;
    if (password.length >= 8)         s++;
    if (/[A-Z]/.test(password))       s++;
    if (/[0-9]/.test(password))       s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#10b981', '#059669'];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i <= strength ? colors[strength] : 'rgb(var(--border))' }} />
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color: colors[strength] || 'rgb(var(--text-muted))' }}>
        {labels[strength]}
      </p>
    </div>
  );
}

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    role: 'candidate', company: '', phoneNumber: '', industry: '', website: '',
  });
  const [showPass,  setShowPass]  = useState(false);
  const [formError, setFormError] = useState('');
  const { register, isLoading }   = useAuth();
  const navigate                  = useNavigate();

  const set    = (name, value) => setFormData(p => ({ ...p, [name]: value }));
  const handle = e => set(e.target.name, e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setFormError('Please fill in all required fields'); return;
    }
    if (formData.password !== formData.confirmPassword) { setFormError('Passwords do not match'); return; }
    if (formData.password.length < 8) { setFormError('Password must be at least 8 characters'); return; }
    if (formData.role === 'recruiter') {
      if (!formData.company.trim())  { setFormError('Company name is required'); return; }
      if (!formData.industry.trim()) { setFormError('Industry is required'); return; }
      if (!formData.website.trim())  { setFormError('Website is required'); return; }
    }
    try {
      const data = {
        firstName: formData.firstName.trim(),
        lastName:  formData.lastName.trim(),
        email:     formData.email.trim(),
        password:  formData.password,
        role:      formData.role,
        profileData: {
          ...(formData.phoneNumber.trim() && { phoneNumber: formData.phoneNumber.trim() }),
          ...(formData.company.trim()     && { company:     formData.company.trim() }),
          ...(formData.industry.trim()    && { industry:    formData.industry.trim() }),
          ...(formData.website.trim()     && { website:     formData.website.trim() }),
        },
      };
      const result = await register(data);
      if (result.success) navigate(result.role === 'recruiter' ? '/recruiter' : '/candidate');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const isRecruiter = formData.role === 'recruiter';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');
        .reg-form { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="reg-form">
        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight mb-1.5" style={{ color: 'rgb(var(--text-primary))' }}>
            Create an account
          </h2>
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-muted))' }}>
            Start hiring smarter or land your next role
          </p>
        </div>

        {/* Role selector */}
        <div className="mb-6">
          <p className={LABEL_CLS} style={{ color: 'rgb(var(--text-secondary))' }}>I am a</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'candidate', label: 'Job Seeker', desc: 'Find & interview for jobs' },
              { value: 'recruiter', label: 'Recruiter',  desc: 'Hire top talent with AI' },
            ].map(opt => {
              const active = formData.role === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => set('role', opt.value)}
                  className="relative flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all duration-200"
                  style={{
                    borderColor: active ? 'rgb(var(--indigo))' : 'rgb(var(--border))',
                    backgroundColor: active ? 'rgb(var(--indigo-bg))' : 'rgb(var(--bg-surface-2))',
                  }}>
                  {active && (
                    <div className="absolute top-3 right-3 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <span className="text-sm font-bold" style={{ color: active ? 'rgb(var(--indigo))' : 'rgb(var(--text-primary))' }}>
                    {opt.label}
                  </span>
                  <span className="text-xs" style={{ color: active ? 'rgb(var(--indigo-text))' : 'rgb(var(--text-muted))' }}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence>
            {formError && (
              <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }} transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">{formError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *" id="firstName">
              <ThemedInput id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handle} placeholder="John" required />
            </Field>
            <Field label="Last Name *" id="lastName">
              <ThemedInput id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handle} placeholder="Doe" required />
            </Field>
          </div>

          <Field label="Email *" id="email">
            <ThemedInput id="email" name="email" type="email" value={formData.email} onChange={handle} placeholder="you@example.com" required />
          </Field>

          <Field label="Phone Number" id="phoneNumber">
            <ThemedInput id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handle} placeholder="+1 (555) 123-4567" />
          </Field>

          {/* Recruiter-only fields */}
          <AnimatePresence>
            {isRecruiter && (
              <motion.div key="recruiter-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden">
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'rgb(var(--border-subtle))' }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgb(var(--text-muted))' }}>Company Details</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'rgb(var(--border-subtle))' }} />
                  </div>
                  <Field label="Company Name *" id="company">
                    <ThemedInput id="company" name="company" type="text" value={formData.company} onChange={handle} placeholder="Acme Inc." required={isRecruiter} />
                  </Field>
                  <Field label="Industry *" id="industry">
                    <ThemedInput id="industry" name="industry" type="text" value={formData.industry} onChange={handle} placeholder="e.g. Technology, Finance…" required={isRecruiter} />
                  </Field>
                  <Field label="Website *" id="website">
                    <ThemedInput id="website" name="website" type="url" value={formData.website} onChange={handle} placeholder="https://yourcompany.com" required={isRecruiter} />
                  </Field>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <Field label="Password *" id="password">
            <div className="relative">
              <ThemedInput id="password" name="password" type={showPass ? 'text' : 'password'}
                value={formData.password} onChange={handle} placeholder="••••••••" required className="pr-11" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgb(var(--text-faint))' }}>
                <EyeIcon open={showPass} />
              </button>
            </div>
            <StrengthBar password={formData.password} />
          </Field>

          {/* Confirm password */}
          <Field label="Confirm Password *" id="confirmPassword">
            <div className="relative">
              <ThemedInput id="confirmPassword" name="confirmPassword" type={showPass ? 'text' : 'password'}
                value={formData.confirmPassword} onChange={handle} placeholder="••••••••" required className="pr-11" />
              {formData.confirmPassword && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {formData.password === formData.confirmPassword ? (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </Field>

          <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 disabled:cursor-not-allowed mt-2">
            {isLoading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Account…</>
            ) : 'Create Account'}
          </motion.button>

          <p className="text-center text-xs leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>
            By signing up you agree to our{' '}
            <Link to="/terms" className="font-semibold hover:opacity-80 transition-colors" style={{ color: 'rgb(var(--indigo))' }}>Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="font-semibold hover:opacity-80 transition-colors" style={{ color: 'rgb(var(--indigo))' }}>Privacy Policy</Link>.
          </p>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgb(var(--border-subtle))' }} />
          <span className="text-xs font-medium" style={{ color: 'rgb(var(--text-faint))' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgb(var(--border-subtle))' }} />
        </div>
        <p className="text-center text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-bold hover:opacity-80 transition-colors" style={{ color: 'rgb(var(--indigo))' }}>
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default RegisterPage;

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}