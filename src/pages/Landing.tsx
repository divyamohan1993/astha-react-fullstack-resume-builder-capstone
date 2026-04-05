import { Link } from 'react-router-dom';

const PILLS = [
  '100% Offline',
  'In-Browser AI',
  'WCAG 2.2 AAA',
  'Research-Backed Scoring',
  'Zero Server Cost',
] as const;

export function Landing() {
  return (
    <div>
      <section
        className="px-8 py-20 text-center"
        style={{
          background:
            'linear-gradient(170deg, var(--accent-navy) 0%, var(--accent-navy) 60%, var(--accent-red) 100%)',
        }}
      >
        <h1 className="mb-3 text-4xl font-extrabold leading-tight text-white md:text-5xl">
          Your Resume. Your Career.
          <br />
          <span style={{ color: 'var(--accent-gold)' }}>AI-Powered.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-lg text-white/70">
          Build ATS-ready resumes. Analyze candidates against job descriptions.
          Runs entirely in your browser. No data leaves your device.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {PILLS.map((pill) => (
            <span
              key={pill}
              className="rounded-full bg-white/15 px-4 py-1.5 text-xs text-white"
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto -mt-6 grid max-w-3xl grid-cols-1 gap-6 px-8 py-12 sm:grid-cols-2">
        <Link
          to="/builder"
          className="rounded-2xl border-2 p-8 text-center no-underline shadow-lg transition-transform hover:scale-[1.02]"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="mb-4 text-5xl" aria-hidden="true">
            📝
          </div>
          <h2
            className="mb-2 text-lg font-bold"
            style={{ color: 'var(--accent-navy)' }}
          >
            I'm a Student
          </h2>
          <p
            className="mb-4 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Build your resume. 4 templates. Live preview. Print or download PDF.
          </p>
          <span
            className="inline-block rounded-lg px-6 py-2 text-sm font-bold text-white"
            style={{ background: 'var(--accent-navy)' }}
          >
            Start Building
          </span>
        </Link>

        <Link
          to="/employer"
          className="rounded-2xl border-2 p-8 text-center no-underline shadow-lg transition-transform hover:scale-[1.02]"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="mb-4 text-5xl" aria-hidden="true">
            📊
          </div>
          <h2
            className="mb-2 text-lg font-bold"
            style={{ color: 'var(--accent-navy)' }}
          >
            I'm a Recruiter
          </h2>
          <p
            className="mb-4 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Paste JD. Upload 100s of resumes. AI scores with cited research.
          </p>
          <span
            className="inline-block rounded-lg px-6 py-2 text-sm font-bold text-white"
            style={{ background: 'var(--accent-red)' }}
          >
            Analyze Candidates
          </span>
        </Link>
      </section>
    </div>
  );
}
