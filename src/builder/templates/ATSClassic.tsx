import type { Resume, Section } from '@/store/types';

function SectionBlock({ section }: { section: Section }) {
  if (section.entries.length === 0) return null;

  if (section.type === 'skills') {
    return (
      <section className="mb-4">
        <h2 className="mb-1 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wider text-gray-900">
          {section.heading}
        </h2>
        {section.entries.map((entry) => (
          <div key={entry.id} className="mb-1">
            {entry.fields['category'] && (
              <span className="text-xs font-bold text-gray-800">{entry.fields['category']}: </span>
            )}
            <span className="text-xs text-gray-700">{entry.bullets.join(', ')}</span>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="mb-4">
      <h2 className="mb-1 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wider text-gray-900">
        {section.heading}
      </h2>
      {section.entries.map((entry) => {
        const primary = entry.fields['institution'] ?? entry.fields['role'] ?? entry.fields['name'] ?? '';
        const secondary = entry.fields['degree'] ?? entry.fields['company'] ?? entry.fields['tech'] ?? entry.fields['issuer'] ?? entry.fields['org'] ?? '';
        const duration = entry.fields['duration'] ?? entry.fields['date'] ?? '';
        const extra = entry.fields['location'] ?? entry.fields['gpa'] ?? entry.fields['url'] ?? '';

        return (
          <div key={entry.id} className="mb-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-gray-900">{primary}</h3>
              {duration && <span className="text-xs text-gray-600">{duration}</span>}
            </div>
            {secondary && (
              <div className="flex items-baseline justify-between">
                <span className="text-xs italic text-gray-700">{secondary}</span>
                {extra && <span className="text-xs text-gray-600">{extra}</span>}
              </div>
            )}
            {entry.fields['description'] && (
              <p className="mt-0.5 text-xs text-gray-700">{entry.fields['description']}</p>
            )}
            {entry.fields['coursework'] && (
              <p className="mt-0.5 text-xs text-gray-600">
                <span className="font-medium">Relevant Coursework:</span> {entry.fields['coursework']}
              </p>
            )}
            {entry.bullets.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {entry.bullets.map((b, i) => (
                  <li key={i} className="text-xs text-gray-700">{b}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function ATSClassic({ resume }: { resume: Resume }) {
  const { personal, summary, sections } = resume;

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-gray-900" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <header className="mb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide">{personal.name || 'Your Name'}</h1>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600">
          {personal.email && <span>{personal.email}</span>}
          {personal.phone && <><span aria-hidden="true">|</span><span>{personal.phone}</span></>}
          {personal.location && <><span aria-hidden="true">|</span><span>{personal.location}</span></>}
          {personal.linkedin && <><span aria-hidden="true">|</span><a href={personal.linkedin} className="text-gray-600 underline">{personal.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a></>}
          {personal.github && <><span aria-hidden="true">|</span><a href={personal.github} className="text-gray-600 underline">{personal.github.replace(/^https?:\/\/(www\.)?/, '')}</a></>}
        </div>
      </header>

      {summary && (
        <section className="mb-4">
          <h2 className="mb-1 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wider">
            Summary
          </h2>
          <p className="text-xs leading-relaxed text-gray-700">{summary}</p>
        </section>
      )}

      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}
