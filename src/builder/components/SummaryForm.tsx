import { useResumeStore } from '@/store/resumeStore';

export function SummaryForm() {
  const summary = useResumeStore((s) => s.resume.summary);
  const setSummary = useResumeStore((s) => s.setSummary);

  return (
    <fieldset className="space-y-2">
      <legend className="text-lg font-bold" style={{ color: 'var(--accent-navy)' }}>
        Professional Summary
      </legend>
      <label htmlFor="summary" className="sr-only">
        Professional summary
      </label>
      <textarea
        id="summary"
        rows={4}
        placeholder="Write a brief professional summary highlighting your key strengths and career objectives..."
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="min-h-[88px] w-full rounded-md border px-3 py-2 text-sm transition-colors resize-y"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
        aria-describedby="summary-hint"
      />
      <p id="summary-hint" className="text-xs" style={{ color: 'var(--text-muted)' }}>
        2-4 sentences. Focus on skills and goals relevant to your target role.
      </p>
    </fieldset>
  );
}
