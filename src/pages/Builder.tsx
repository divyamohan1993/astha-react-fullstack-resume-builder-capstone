import { ResumeForm } from '@/builder/components/ResumeForm';
import { LivePreview } from '@/builder/components/LivePreview';
import { AICoachPanel } from '@/builder/components/AICoachPanel';
import { downloadPDF } from '@/utils/pdf';
import { printResume } from '@/utils/print';

export function Builder() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col lg:flex-row">
      <div
        className="flex-1 overflow-y-auto lg:max-h-[calc(100vh-120px)]"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <ResumeForm />
      </div>

      <div className="w-full lg:sticky lg:top-0 lg:max-h-[calc(100vh-120px)] lg:w-[50%] lg:overflow-y-auto">
        <div className="space-y-4 p-4">
          <div className="no-print mb-2" data-no-print>
            <AICoachPanel />
          </div>
          <div className="flex gap-2 no-print" data-no-print>
            <button
              type="button"
              onClick={printResume}
              className="min-h-[44px] flex-1 rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--accent-navy)' }}
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => downloadPDF()}
              className="min-h-[44px] flex-1 rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--accent-red)' }}
            >
              Download PDF
            </button>
          </div>
          <LivePreview />
        </div>
      </div>
    </div>
  );
}
