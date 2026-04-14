import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LINKS = {
  Platform:      [{ label: 'About Us', to: '/about' }, { label: 'Contact', to: '/contact' }, { label: 'Browse Jobs', to: '/jobs' }],
  Support:       [{ label: 'FAQ', to: '/faq' }, { label: 'Help Centre', to: '/help' }, { label: 'Privacy', to: '/privacy' }, { label: 'Terms', to: '/terms' }],
  'Recruiters':  [{ label: 'Pricing', to: '/pricing' }, { label: 'Enterprise', to: '/enterprise' }, { label: 'Request Demo', to: '/demo' }],
  'Candidates':  [{ label: 'Resources', to: '/resources' }, { label: 'Interview Tips', to: '/interview-tips' }, { label: 'Resume Builder', to: '/resume-builder' }],
};

const SOCIALS = [
  {
    label: 'LinkedIn',
    href: '#',
    icon: <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" />,
  },
  {
    label: 'Twitter',
    href: '#',
    icon: <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />,
  },
  {
    label: 'GitHub',
    href: '#',
    icon: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />,
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-root bg-[#0c0c0e] text-white relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=DM+Serif+Display@display=swap');
        .footer-root { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      {/* Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-10"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">

        {/* Top: brand + links */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 py-14 border-b border-white/8">
          {/* Brand col */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5 group w-fit">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                </svg>
              </div>
              <span className="text-sm font-black text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                AI Recruiter
              </span>
            </Link>
            <p className="text-sm text-white/35 leading-relaxed max-w-[200px]">
              Smarter hiring through AI — faster, fairer, and more accurate.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{group}</p>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item.label}>
                    <Link to={item.to}
                      className="text-sm text-white/40 hover:text-white/80 transition-colors font-medium">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <p className="text-xs text-white/25 font-medium">
            © {year} AI Recruiter Platform. All rights reserved.
          </p>

          {/* Socials */}
          <div className="flex items-center gap-4">
            {SOCIALS.map(s => (
              <motion.a
                key={s.label}
                href={s.href}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="text-white/25 hover:text-white/70 transition-colors"
                aria-label={s.label}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  {s.icon}
                </svg>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}