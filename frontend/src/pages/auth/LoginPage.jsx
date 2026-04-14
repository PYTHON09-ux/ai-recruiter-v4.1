import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Shared INPUT uses CSS vars so it works in both light and dark
const INPUT = [
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

export const LoginPage = () => {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [formError, setFormError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email.trim() || !password) { setFormError('Please fill in all fields'); return; }
    try {
      const result = await login(email, password);
      if (result.success) navigate(result.role === 'recruiter' ? '/recruiter' : '/candidate');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');
        .auth-form { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="auth-form">
        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight mb-1.5" style={{ color: 'rgb(var(--text-primary))' }}>
            Welcome back
          </h2>
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-muted))' }}>
            Sign in to continue to your dashboard
          </p>
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

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-secondary))' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required className={INPUT} style={inputStyle}
              onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={e => Object.assign(e.target.style, inputStyle)} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--text-secondary))' }}>Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold transition-colors hover:opacity-80" style={{ color: 'rgb(var(--indigo))' }}>
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required className={`${INPUT} pr-11`} style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, inputStyle)} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgb(var(--text-faint))' }}>
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 disabled:cursor-not-allowed mt-2">
            {isLoading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
            ) : 'Sign in'}
          </motion.button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgb(var(--border-subtle))' }} />
          <span className="text-xs font-medium" style={{ color: 'rgb(var(--text-faint))' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgb(var(--border-subtle))' }} />
        </div>

        <p className="text-center text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-bold transition-colors hover:opacity-80" style={{ color: 'rgb(var(--indigo))' }}>
            Sign up free
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginPage;


// ─── Shared eye icon ──────────────────────────────────────────────────────────
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