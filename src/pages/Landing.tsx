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

      <section className="mx-auto max-w-4xl px-8 py-16">
        <h2
          className="mb-3 text-center text-3xl font-extrabold"
          style={{ color: 'var(--accent-navy)' }}
        >
          Bridge: The Trust Layer
        </h2>
        <p
          className="mx-auto mb-10 max-w-lg text-center text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          Bridge connects what you claim with what you can prove. Employers
          publish criteria, candidates self-assess and verify skills through
          timed challenges, and both sides get a transparent scorecard.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: '\u{1F4CB}',
              title: 'Self-Assessment',
              desc: 'Rate yourself against employer criteria. Honest signals that go beyond keywords.',
            },
            {
              icon: '\u{1F9EA}',
              title: 'Skill Verification',
              desc: 'Timed coding and scenario challenges generated to match the job. No shortcuts.',
            },
            {
              icon: '\u{2705}',
              title: 'Verified Scorecard',
              desc: 'A tamper-evident scorecard with integrity hashes. Share it, print it, trust it.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border p-6 text-center"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="mb-3 text-4xl" aria-hidden="true">
                {item.icon}
              </div>
              <h3
                className="mb-2 text-base font-bold"
                style={{ color: 'var(--accent-navy)' }}
              >
                {item.title}
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/builder"
            className="inline-block rounded-lg px-8 py-3 text-sm font-bold text-white no-underline transition-transform hover:scale-105"
            style={{ background: 'var(--accent-navy)' }}
          >
            Build your resume and get verified
          </Link>
        </div>
      </section>
    </div>
  );
}
