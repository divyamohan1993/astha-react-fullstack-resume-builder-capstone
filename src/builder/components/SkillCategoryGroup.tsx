import { useResumeStore, uuid } from '@/store/resumeStore';
import type { Section, Entry } from '@/store/types';
import { SkillTagInput } from './SkillTagInput';

interface SkillCategoryGroupProps {
  section: Section;
}

export function SkillCategoryGroup({ section }: SkillCategoryGroupProps) {
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const addEntry = useResumeStore((s) => s.addEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);

  const addCategory = () => {
    const entry: Entry = {
      id: uuid(),
      fields: { category: 'New Category' },
      bullets: [],
    };
    addEntry(section.id, entry);
  };

  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-bold" style={{ color: 'var(--accent-navy)' }}>
        {section.heading}
      </legend>
      {section.entries.map((entry) => (
        <div
          key={entry.id}
          className="space-y-2 rounded-lg border p-4"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center gap-2">
            <label htmlFor={`cat-${entry.id}`} className="sr-only">
              Category name
            </label>
            <input
              id={`cat-${entry.id}`}
              type="text"
              value={entry.fields['category'] ?? ''}
              onChange={(e) =>
                updateEntry(section.id, entry.id, {
                  fields: { ...entry.fields, category: e.target.value },
                })
              }
              className="min-h-[44px] flex-1 rounded-md border px-3 py-2 text-sm font-semibold"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              placeholder="Category name (e.g., Languages, Frameworks)"
            />
            <button
              type="button"
              onClick={() => removeEntry(section.id, entry.id)}
              className="min-h-[44px] min-w-[44px] rounded-md text-sm font-medium"
              style={{ color: 'var(--accent-red)' }}
              aria-label={`Remove category ${entry.fields['category'] ?? ''}`}
            >
              &#x2715;
            </button>
          </div>
          <SkillTagInput
            skills={entry.bullets}
            onChange={(bullets) => updateEntry(section.id, entry.id, { bullets })}
            label={`Skills in ${entry.fields['category'] ?? 'category'}`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addCategory}
        className="min-h-[44px] w-full rounded-md border-2 border-dashed px-4 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--accent-navy)',
        }}
      >
        + Add Skill Category
      </button>
    </fieldset>
  );
}
