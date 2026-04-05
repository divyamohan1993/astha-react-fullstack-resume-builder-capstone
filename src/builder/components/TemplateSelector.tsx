import { useResumeStore } from '@/store/resumeStore';
import type { TemplateId } from '@/store/types';

const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: 'ats-classic', name: 'ATS Classic', desc: 'Single column, black and white, serif font. Maximum ATS compatibility.' },
  { id: 'modern-blue', name: 'Modern Blue', desc: 'Two-column with navy sidebar. Clean and professional.' },
  { id: 'creative', name: 'Creative', desc: 'Bold gradient header with red accent. Eye-catching design.' },
  { id: 'minimal', name: 'Minimal', desc: 'Light typography, clean whitespace. Understated elegance.' },
];

export function TemplateSelector() {
  const templateId = useResumeStore((s) => s.resume.meta.templateId);
  const setTemplate = useResumeStore((s) => s.setTemplate);

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Resume template">
      <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Template
      </span>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map(({ id, name, desc }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={templateId === id}
            onClick={() => setTemplate(id)}
            className="min-h-[44px] rounded-lg border-2 p-3 text-left transition-all"
            style={{
              borderColor: templateId === id ? 'var(--accent-navy)' : 'var(--border)',
              background: templateId === id ? 'var(--bg-surface)' : 'transparent',
            }}
          >
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {name}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
