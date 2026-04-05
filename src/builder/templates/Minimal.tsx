import type { Resume, Section } from '@/store/types';

function MinimalSection({ section }: { section: Section }) {
  if (section.entries.length === 0) return null;

  if (section.type === 'skills') {
    return (
      <section className="mb-5">
        <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
          {section.heading}
        </h2>
        <div className="border-t border-gray-100 pt-2">
          {section.entries.map((entry) => (
            <div key={entry.id} className="mb-1.5">
              {entry.fields['category'] && (
                <span className="text-xs font-medium text-gray-600">{entry.fields['category']}: </span>
              )}
              <span className="text-xs text-gray-500">{entry.bullets.join(' / ')}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5">
      <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
        {section.heading}
      </h2>
      <div className="border-t border-gray-100 pt-2">
        {section.entries.map((entry) => {
          const primary = entry.fields['institution'] ?? entry.fields['role'] ?? entry.fields['name'] ?? '';
          const secondary = entry.fields['degree'] ?? entry.fields['company'] ?? entry.fields['tech'] ?? entry.fields['issuer'] ?? entry.fields['org'] ?? '';
          const duration = entry.fields['duration'] ?? entry.fields['date'] ?? '';
          const extra = entry.fields['location'] ?? entry.fields['gpa'] ?? entry.fields['url'] ?? '';

          return (
            <div key={entry.id} className="mb-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium text-gray-800">{primary}</h3>
                {duration && <span className="text-[10px] text-gray-400">{duration}</span>}
              </div>
              {secondary && (
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">{secondary}</span>
                  {extra && <span className="text-[10px] text-gray-400">{extra}</span>}
                </div>
              )}
              {entry.fields['description'] && (
                <p className="mt-0.5 text-xs text-gray-500">{entry.fields['description']}</p>
              )}
              {entry.fields['coursework'] && (
                <p className="mt-0.5 text-xs text-gray-400">
                  <span className="font-medium">Coursework:</span> {entry.fields['coursework']}
                </p>
              )}
              {entry.bullets.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {entry.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="mt-1.5 h-px w-2 shrink-0 bg-gray-300" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Minimal({ resume }: { resume: Resume }) {
  const { personal, summary, sections } = resume;

  return (
    <div
      className="mx-auto max-w-[210mm] bg-white p-10"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif' }}
    >
      <header className="mb-6">
        <h1 className="text-xl font-light tracking-wide text-gray-800">
          {personal.name || 'Your Name'}
        </h1>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-400">
          {personal.email && <span>{personal.email}</span>}
          {personal.phone && <span>{personal.phone}</span>}
          {personal.location && <span>{personal.location}</span>}
          {personal.linkedin && (
            <a href={personal.linkedin} className="text-gray-400 underline">
              {personal.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
          {personal.github && (
            <a href={personal.github} className="text-gray-400 underline">
              {personal.github.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
        </div>
      </header>

      {summary && (
        <section className="mb-5">
          <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
            Summary
          </h2>
          <div className="border-t border-gray-100 pt-2">
            <p className="text-xs leading-relaxed text-gray-600">{summary}</p>
          </div>
        </section>
      )}

      {sections.map((section) => (
        <MinimalSection key={section.id} section={section} />
      ))}
    </div>
  );
}
