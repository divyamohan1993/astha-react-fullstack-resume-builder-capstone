import { useState, useRef, useEffect } from 'react';
import { useResumeStore, uuid } from '@/store/resumeStore';
import type { Section } from '@/store/types';

interface CustomSectionModalProps {
  open: boolean;
  onClose: () => void;
}

const LAYOUT_OPTIONS = [
  { value: 'list' as const, label: 'List', desc: 'Entries with fields and bullet points' },
  { value: 'key-value' as const, label: 'Key-Value', desc: 'Label: value pairs' },
  { value: 'tags' as const, label: 'Tags', desc: 'Tag-style items (like skills)' },
  { value: 'freetext' as const, label: 'Free Text', desc: 'Open text content' },
];

export function CustomSectionModal({ open, onClose }: CustomSectionModalProps) {
  const [heading, setHeading] = useState('');
  const [layout, setLayout] = useState<Section['layout']>('list');
  const [fieldNames, setFieldNames] = useState('');
  const addSection = useResumeStore((s) => s.addSection);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heading.trim()) return;

    const section: Section = {
      id: uuid(),
      type: 'custom',
      heading: heading.trim(),
      layout,
      entries: [],
    };

    if (fieldNames.trim()) {
      const fields: Record<string, string> = {};
      for (const name of fieldNames.split(',').map((s) => s.trim()).filter(Boolean)) {
        fields[name.toLowerCase().replace(/\s+/g, '_')] = '';
      }
      section.entries.push({ id: uuid(), fields, bullets: [] });
    }

    addSection(section);
    setHeading('');
    setLayout('list');
    setFieldNames('');
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-xl border p-0 backdrop:bg-black/50"
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      }}
      aria-labelledby="custom-section-title"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <h2 id="custom-section-title" className="text-lg font-bold" style={{ color: 'var(--accent-navy)' }}>
          Add Custom Section
        </h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="custom-heading" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Section Heading *
          </label>
          <input
            id="custom-heading"
            type="text"
            required
            aria-required="true"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="e.g., Publications, Awards, Languages"
            className="min-h-[44px] rounded-md border px-3 py-2 text-sm"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            autoFocus
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Layout Type
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {LAYOUT_OPTIONS.map(({ value, label, desc }) => (
              <label
                key={value}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors"
                style={{
                  borderColor: layout === value ? 'var(--accent-navy)' : 'var(--border)',
                  background: layout === value ? 'var(--bg-surface)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="layout"
                  value={value}
                  checked={layout === value}
                  onChange={() => setLayout(value)}
                  className="sr-only"
                />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="custom-fields" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Custom Field Names (comma separated)
          </label>
          <input
            id="custom-fields"
            type="text"
            value={fieldNames}
            onChange={(e) => setFieldNames(e.target.value)}
            placeholder="e.g., Title, Publisher, Year"
            className="min-h-[44px] rounded-md border px-3 py-2 text-sm"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Leave blank for default fields
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-md border px-4 py-2 text-sm font-medium"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--accent-navy)' }}
          >
            Add Section
          </button>
        </div>
      </form>
    </dialog>
  );
}
