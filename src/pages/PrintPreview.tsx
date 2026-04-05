import { useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { templateRegistry } from '@/builder/templates';
import { downloadPDF } from '@/utils/pdf';
import { printResume } from '@/utils/print';
import '@/builder/templates/print.css';

export function PrintPreview() {
  const resume = useResumeStore((s) => s.resume);
  const load = useResumeStore((s) => s.load);
  const loaded = useResumeStore((s) => s.loaded);
  const Template = templateRegistry[resume.meta.templateId];

  useEffect(() => {
    if (!loaded) load();
  }, [load, loaded]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="no-print flex items-center justify-center gap-4 p-4" data-no-print>
        <button
          type="button"
          onClick={printResume}
          className="min-h-[44px] rounded-md px-6 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--accent-navy)' }}
        >
          Print Resume
        </button>
        <button
          type="button"
          onClick={() => downloadPDF()}
          className="min-h-[44px] rounded-md px-6 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--accent-red)' }}
        >
          Download PDF
        </button>
        <a
          href="/builder"
          className="min-h-[44px] rounded-md border px-6 py-2 text-sm font-medium no-underline"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          Back to Editor
        </a>
      </div>
      <div className="mx-auto max-w-[210mm] shadow-lg" id="resume-preview">
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
