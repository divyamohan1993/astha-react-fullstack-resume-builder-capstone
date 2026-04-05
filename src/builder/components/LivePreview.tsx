import { useResumeStore } from '@/store/resumeStore';
import { templateRegistry } from '@/builder/templates';
import { TemplateSelector } from './TemplateSelector';
import '@/builder/templates/print.css';

export function LivePreview() {
  const resume = useResumeStore((s) => s.resume);
  const Template = templateRegistry[resume.meta.templateId];

  return (
    <div className="flex flex-col gap-4">
      <TemplateSelector />
      <div
        id="resume-preview"
        className="overflow-hidden rounded-lg border shadow-sm"
        style={{
          borderColor: 'var(--border)',
          background: '#ffffff',
          color: '#333333',
        }}
        aria-label="Resume preview"
        role="region"
      >
        {Template ? (
          <Template resume={resume} />
        ) : (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            Template not found
          </div>
        )}
      </div>
    </div>
  );
}
