import { useResumeStore, uuid } from '@/store/resumeStore';
import type { Section, Entry } from '@/store/types';
import { EntryEditor } from './EntryEditor';
import { SkillCategoryGroup } from './SkillCategoryGroup';

interface SectionEditorProps {
  section: Section;
}

function createBlankEntry(sectionType: string): Entry {
  const fields: Record<string, string> = {};
  const fieldKeys: Record<string, string[]> = {
    education: ['institution', 'degree', 'duration', 'gpa', 'coursework'],
    experience: ['role', 'company', 'duration', 'location'],
    projects: ['name', 'tech', 'description', 'url'],
    certifications: ['name', 'issuer', 'date', 'url'],
    extracurricular: ['role', 'org', 'duration', 'description'],
  };
  for (const k of fieldKeys[sectionType] ?? []) {
    fields[k] = '';
  }
  return { id: uuid(), fields, bullets: [] };
}

export function SectionEditor({ section }: SectionEditorProps) {
  const addEntry = useResumeStore((s) => s.addEntry);
  const removeSection = useResumeStore((s) => s.removeSection);
  const updateSectionHeading = useResumeStore((s) => s.updateSectionHeading);

  if (section.type === 'skills') {
    return <SkillCategoryGroup section={section} />;
  }

  return (
    <fieldset className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor={`heading-${section.id}`} className="sr-only">
          Section heading
        </label>
        <input
          id={`heading-${section.id}`}
          type="text"
          value={section.heading}
          onChange={(e) => updateSectionHeading(section.id, e.target.value)}
          className="min-h-[44px] flex-1 border-b-2 bg-transparent text-lg font-bold"
          style={{
            borderColor: 'var(--accent-navy)',
            color: 'var(--accent-navy)',
          }}
          aria-label={`${section.heading} section heading`}
        />
        {section.type === 'custom' && (
          <button
            type="button"
            onClick={() => removeSection(section.id)}
            className="min-h-[44px] min-w-[44px] rounded-md text-sm font-medium"
            style={{ color: 'var(--accent-red)' }}
            aria-label={`Remove ${section.heading} section`}
          >
            &#x2715;
          </button>
        )}
      </div>
      <div className="space-y-3">
        {section.entries.map((entry, i) => (
          <EntryEditor key={entry.id} section={section} entry={entry} index={i} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => addEntry(section.id, createBlankEntry(section.type))}
        className="min-h-[44px] w-full rounded-md border-2 border-dashed px-4 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--accent-navy)',
        }}
      >
        + Add {section.heading} Entry
      </button>
    </fieldset>
  );
}
