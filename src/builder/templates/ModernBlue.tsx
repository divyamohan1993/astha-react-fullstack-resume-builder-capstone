import type { Resume, Section } from '@/store/types';

const SIDEBAR_TYPES = new Set(['skills', 'certifications']);

function SidebarSection({ section }: { section: Section }) {
  if (section.entries.length === 0) return null;

  if (section.type === 'skills') {
    return (
      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-200">
          {section.heading}
        </h2>
        {section.entries.map((entry) => (
          <div key={entry.id} className="mb-2">
            {entry.fields['category'] && (
              <h3 className="text-xs font-semibold text-blue-100">{entry.fields['category']}</h3>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.bullets.map((skill, i) => (
                <span key={i} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-blue-100">
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
    <section className="mb-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-200">
        {section.heading}
      </h2>
      {section.entries.map((entry) => {
        const primary = entry.fields['name'] ?? entry.fields['role'] ?? '';
        const secondary = entry.fields['issuer'] ?? entry.fields['org'] ?? '';
        const date = entry.fields['date'] ?? entry.fields['duration'] ?? '';
        return (
          <div key={entry.id} className="mb-2">
            <div className="text-xs font-semibold text-white">{primary}</div>
            {secondary && <div className="text-[10px] text-blue-200">{secondary}</div>}
            {date && <div className="text-[10px] text-blue-300">{date}</div>}
            {entry.fields['url'] && (
              <a href={entry.fields['url']} className="text-[10px] text-blue-200 underline break-all">
                {entry.fields['url'].replace(/^https?:\/\//, '').slice(0, 30)}
              </a>
            )}
          </div>
        );
      })}
    </section>
  );
}

function MainSection({ section }: { section: Section }) {
  if (section.entries.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="mb-2 border-b border-gray-200 pb-1 text-sm font-bold uppercase tracking-wider text-[#182B49]">
        {section.heading}
      </h2>
      {section.entries.map((entry) => {
        const primary = entry.fields['institution'] ?? entry.fields['role'] ?? entry.fields['name'] ?? '';
        const secondary = entry.fields['degree'] ?? entry.fields['company'] ?? entry.fields['tech'] ?? entry.fields['org'] ?? '';
        const duration = entry.fields['duration'] ?? entry.fields['date'] ?? '';
        const extra = entry.fields['location'] ?? entry.fields['gpa'] ?? '';

        return (
          <div key={entry.id} className="mb-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-gray-900">{primary}</h3>
              {duration && <span className="text-xs text-gray-500">{duration}</span>}
            </div>
            {secondary && (
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-600">{secondary}</span>
                {extra && <span className="text-xs text-gray-500">{extra}</span>}
              </div>
            )}
            {entry.fields['description'] && (
              <p className="mt-0.5 text-xs text-gray-600">{entry.fields['description']}</p>
            )}
            {entry.fields['coursework'] && (
              <p className="mt-0.5 text-xs text-gray-500">
                <span className="font-medium">Coursework:</span> {entry.fields['coursework']}
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

export function ModernBlue({ resume }: { resume: Resume }) {
  const { personal, summary, sections } = resume;
  const sidebarSections = sections.filter((s) => SIDEBAR_TYPES.has(s.type));
  const mainSections = sections.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <div className="mx-auto flex max-w-[210mm] bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <aside className="w-[30%] bg-[#182B49] p-5 text-white" aria-label="Contact and skills">
        <div className="mb-6">
          <h1 className="text-lg font-bold leading-tight">{personal.name || 'Your Name'}</h1>
        </div>
        <section className="mb-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-200">Contact</h2>
          <div className="space-y-1 text-xs text-blue-100">
            {personal.email && <div>{personal.email}</div>}
            {personal.phone && <div>{personal.phone}</div>}
            {personal.location && <div>{personal.location}</div>}
            {personal.linkedin && (
              <a href={personal.linkedin} className="block text-blue-200 underline break-all">
                {personal.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
            {personal.github && (
              <a href={personal.github} className="block text-blue-200 underline break-all">
                {personal.github.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
          </div>
        </section>
        {sidebarSections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </aside>

      <main className="flex-1 p-6">
        {summary && (
          <section className="mb-4">
            <h2 className="mb-2 border-b border-gray-200 pb-1 text-sm font-bold uppercase tracking-wider text-[#182B49]">
              Summary
            </h2>
            <p className="text-xs leading-relaxed text-gray-700">{summary}</p>
          </section>
        )}
        {mainSections.map((section) => (
          <MainSection key={section.id} section={section} />
        ))}
      </main>
    </div>
  );
}
