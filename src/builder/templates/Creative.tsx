import type { Resume, Section } from '@/store/types';

const SECTION_ICONS: Record<string, string> = {
  education: '\u{1F393}',
  experience: '\u{1F4BC}',
  projects: '\u{1F680}',
  skills: '\u{1F4BB}',
  certifications: '\u{1F3C6}',
  extracurricular: '\u{2B50}',
  custom: '\u{1F4CC}',
};

function CreativeSection({ section }: { section: Section }) {
  if (section.entries.length === 0) return null;

  const icon = SECTION_ICONS[section.type] ?? SECTION_ICONS['custom'];

  if (section.type === 'skills') {
    return (
      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900">
          <span aria-hidden="true">{icon}</span>
          {section.heading}
        </h2>
        {section.entries.map((entry) => (
          <div key={entry.id} className="mb-2">
            {entry.fields['category'] && (
              <h3 className="mb-1 text-xs font-semibold text-gray-700">{entry.fields['category']}</h3>
            )}
            <div className="flex flex-wrap gap-1.5">
              {entry.bullets.map((skill, i) => (
                <span
                  key={i}
                  className="rounded-full px-2.5 py-1 text-[10px] font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #e41a1a, #182B49)' }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900">
        <span aria-hidden="true">{icon}</span>
        {section.heading}
      </h2>
      {section.entries.map((entry) => {
        const primary = entry.fields['institution'] ?? entry.fields['role'] ?? entry.fields['name'] ?? '';
        const secondary = entry.fields['degree'] ?? entry.fields['company'] ?? entry.fields['tech'] ?? entry.fields['issuer'] ?? entry.fields['org'] ?? '';
        const duration = entry.fields['duration'] ?? entry.fields['date'] ?? '';
        const extra = entry.fields['location'] ?? entry.fields['gpa'] ?? entry.fields['url'] ?? '';

        return (
          <div key={entry.id} className="mb-3 border-l-2 border-[#e41a1a] pl-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-gray-900">{primary}</h3>
              {duration && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{duration}</span>
              )}
            </div>
            {secondary && <div className="text-xs text-gray-600">{secondary}</div>}
            {extra && <div className="text-[10px] text-gray-500">{extra}</div>}
            {entry.fields['description'] && (
              <p className="mt-0.5 text-xs text-gray-600">{entry.fields['description']}</p>
            )}
            {entry.fields['coursework'] && (
              <p className="mt-0.5 text-xs text-gray-500">
                <span className="font-medium">Coursework:</span> {entry.fields['coursework']}
              </p>
            )}
            {entry.bullets.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {entry.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#e41a1a]" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function Creative({ resume }: { resume: Resume }) {
  const { personal, summary, sections } = resume;

  return (
    <div className="mx-auto max-w-[210mm] bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header
        className="p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #e41a1a 0%, #182B49 100%)' }}
      >
        <h1 className="text-2xl font-bold">{personal.name || 'Your Name'}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/80">
          {personal.email && <span>{personal.email}</span>}
          {personal.phone && <span>{personal.phone}</span>}
          {personal.location && <span>{personal.location}</span>}
          {personal.linkedin && (
            <a href={personal.linkedin} className="text-white/80 underline">
              {personal.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
          {personal.github && (
            <a href={personal.github} className="text-white/80 underline">
              {personal.github.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
        </div>
      </header>

      <main className="p-6">
        {summary && (
          <section className="mb-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              <span aria-hidden="true">{'\u{1F4DD}'}</span>
              Summary
            </h2>
            <p className="text-xs leading-relaxed text-gray-700">{summary}</p>
          </section>
        )}
        {sections.map((section) => (
          <CreativeSection key={section.id} section={section} />
        ))}
      </main>
    </div>
  );
}
