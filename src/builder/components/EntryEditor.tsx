import { useResumeStore } from '@/store/resumeStore';
import type { Entry, Section } from '@/store/types';
import { BulletEditor } from './BulletEditor';

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

const SECTION_FIELDS: Record<string, FieldConfig[]> = {
  education: [
    { key: 'institution', label: 'Institution', required: true, placeholder: 'Shoolini University' },
    { key: 'degree', label: 'Degree', required: true, placeholder: 'BTech Computer Science' },
    { key: 'duration', label: 'Duration', placeholder: '2022 - 2026' },
    { key: 'gpa', label: 'GPA / Percentage', placeholder: '8.5 / 10' },
    { key: 'coursework', label: 'Relevant Coursework', placeholder: 'Data Structures, ML, Databases' },
  ],
  experience: [
    { key: 'role', label: 'Role', required: true, placeholder: 'Software Engineering Intern' },
    { key: 'company', label: 'Company', required: true, placeholder: 'Tech Corp' },
    { key: 'duration', label: 'Duration', placeholder: 'Jun 2025 - Aug 2025' },
    { key: 'location', label: 'Location', placeholder: 'Remote' },
  ],
  projects: [
    { key: 'name', label: 'Project Name', required: true, placeholder: 'ResumeAI' },
    { key: 'tech', label: 'Tech Stack', placeholder: 'React, TypeScript, Tailwind' },
    { key: 'description', label: 'Description', placeholder: 'Browser-based resume builder with AI scoring' },
    { key: 'url', label: 'Live URL / Repo', placeholder: 'https://github.com/username/project' },
  ],
  certifications: [
    { key: 'name', label: 'Certification Name', required: true, placeholder: 'AWS Cloud Practitioner' },
    { key: 'issuer', label: 'Issuer', placeholder: 'Amazon Web Services' },
    { key: 'date', label: 'Date', placeholder: 'Mar 2025' },
    { key: 'url', label: 'Credential URL', placeholder: 'https://credly.com/...' },
  ],
  extracurricular: [
    { key: 'role', label: 'Role', required: true, placeholder: 'President' },
    { key: 'org', label: 'Organization', placeholder: 'Coding Club' },
    { key: 'duration', label: 'Duration', placeholder: '2024 - 2025' },
    { key: 'description', label: 'Description', placeholder: 'Led 50+ member coding club...' },
  ],
};

interface EntryEditorProps {
  section: Section;
  entry: Entry;
  index: number;
}

export function EntryEditor({ section, entry, index }: EntryEditorProps) {
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);

  const fields = SECTION_FIELDS[section.type] ?? Object.keys(entry.fields)
    .filter((k) => k !== 'category')
    .map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), placeholder: '' }));

  const showBullets = section.type !== 'certifications';

  return (
    <div
      className="space-y-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
      role="group"
      aria-label={`${section.heading} entry ${index + 1}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Entry {index + 1}
        </span>
        <button
          type="button"
          onClick={() => removeEntry(section.id, entry.id)}
          className="min-h-[44px] min-w-[44px] rounded-md text-sm font-medium"
          style={{ color: 'var(--accent-red)' }}
          aria-label={`Remove ${section.heading} entry ${index + 1}`}
        >
          &#x2715; Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, required, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label
              htmlFor={`${entry.id}-${key}`}
              className="text-xs font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {label}
              {required && <span className="ml-0.5" style={{ color: 'var(--accent-red)' }} aria-hidden="true">*</span>}
            </label>
            <input
              id={`${entry.id}-${key}`}
              type="text"
              required={required}
              aria-required={required}
              placeholder={placeholder}
              value={entry.fields[key] ?? ''}
              onChange={(e) =>
                updateEntry(section.id, entry.id, {
                  fields: { ...entry.fields, [key]: e.target.value },
                })
              }
              className="min-h-[44px] rounded-md border px-3 py-2 text-sm"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        ))}
      </div>
      {showBullets && (
        <BulletEditor
          bullets={entry.bullets}
          onChange={(bullets) => updateEntry(section.id, entry.id, { bullets })}
          label={`${section.heading} entry ${index + 1} bullet points`}
        />
      )}
    </div>
  );
}
