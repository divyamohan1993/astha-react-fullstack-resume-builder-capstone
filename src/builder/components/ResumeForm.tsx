import { useState, useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { PersonalInfoForm } from './PersonalInfoForm';
import { SummaryForm } from './SummaryForm';
import { DraggableSections } from './DraggableSections';
import { CustomSectionModal } from './CustomSectionModal';

export function ResumeForm() {
  const load = useResumeStore((s) => s.load);
  const loaded = useResumeStore((s) => s.loaded);
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-label="Loading resume">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}
        />
        <span className="sr-only">Loading resume data...</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-8 p-6"
      aria-label="Resume form"
      noValidate
    >
      <PersonalInfoForm />
      <SummaryForm />
      <DraggableSections />

      <button
        type="button"
        onClick={() => setShowCustomModal(true)}
        className="min-h-[44px] w-full rounded-md border-2 border-dashed px-4 py-3 text-sm font-semibold transition-colors"
        style={{
          borderColor: 'var(--accent-navy)',
          color: 'var(--accent-navy)',
        }}
      >
        + Add Custom Section
      </button>

      <CustomSectionModal
        open={showCustomModal}
        onClose={() => setShowCustomModal(false)}
      />
    </form>
  );
}
