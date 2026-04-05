import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/builder', label: 'Builder' },
  { to: '/employer', label: 'Employer' },
] as const;

export function Navbar() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  return (
    <nav
      className="flex items-center justify-between px-6 py-3 print:hidden"
      style={{ background: 'var(--accent-navy)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      <Link
        to="/"
        className="flex items-center gap-3 no-underline"
        aria-label="ResumeAI home"
      >
        <img
          src="https://shooliniuniversity.com/assets/images/logo.png"
          alt="Shoolini University logo"
          className="h-9 w-9 rounded-md bg-white object-contain p-0.5"
          width={36}
          height={36}
        />
        <div>
          <div className="text-base font-bold leading-tight text-white">
            ResumeAI
          </div>
          <div className="text-xs leading-tight text-white/50">
            Shoolini University &middot; BTech CSE Capstone
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-6">
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`text-sm no-underline transition-colors ${
              pathname === to
                ? 'border-b-2 border-[var(--accent-red)] pb-0.5 font-bold text-white'
                : 'text-white/70 hover:text-white'
            }`}
            aria-current={pathname === to ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}

        <button
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <span aria-hidden="true">{theme === 'light' ? '\u2600\uFE0F' : '\uD83C\uDF19'}</span>
          <span className="sr-only">
            Current: {theme} mode
          </span>
        </button>
      </div>
    </nav>
  );
}
