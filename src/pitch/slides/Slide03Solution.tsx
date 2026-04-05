export function Slide03Solution() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-16"
      style={{ backgroundColor: '#f5f5f5', color: '#182B49' }}
    >
      <h2 className="mb-12 text-4xl font-extrabold md:text-5xl">
        The Solution
      </h2>

      <div className="mb-12 grid max-w-5xl gap-8 md:grid-cols-2">
        {/* Student card */}
        <div
          className="rounded-2xl p-8 shadow-xl"
          style={{ backgroundColor: '#ffffff', borderTop: '4px solid #e41a1a' }}
        >
          <div
            className="mb-4 inline-block rounded-lg px-3 py-1 text-sm font-bold text-white"
            style={{ backgroundColor: '#e41a1a' }}
          >
            Student Mode
          </div>
          <h3 className="mb-3 text-2xl font-bold">
            Build ATS-ready resumes
          </h3>
          <ul className="space-y-2 text-lg" style={{ color: '#333333' }}>
            <li>4 professional templates</li>
            <li>Live preview with direct editing</li>
            <li>AI-powered content refinement</li>
            <li>Download as PDF or print</li>
          </ul>
        </div>

        {/* Employer card */}
        <div
          className="rounded-2xl p-8 shadow-xl"
          style={{ backgroundColor: '#ffffff', borderTop: '4px solid #182B49' }}
        >
          <div
            className="mb-4 inline-block rounded-lg px-3 py-1 text-sm font-bold text-white"
            style={{ backgroundColor: '#182B49' }}
          >
            Employer Mode
          </div>
          <h3 className="mb-3 text-2xl font-bold">
            AI-powered candidate analysis
          </h3>
          <ul className="space-y-2 text-lg" style={{ color: '#333333' }}>
            <li>Paste job description, upload resumes</li>
            <li>12 research-cited scoring parameters</li>
            <li>Red flag and contradiction detection</li>
            <li>Sortable, filterable rankings</li>
          </ul>
        </div>
      </div>

      <div
        className="rounded-xl px-8 py-4 text-center text-lg font-semibold text-white"
        style={{ backgroundColor: '#182B49' }}
      >
        100% offline after first load. In-browser AI. No data leaves your device.
      </div>
    </div>
  );
}
