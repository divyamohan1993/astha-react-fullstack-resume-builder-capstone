const checks = [
  'Keyboard navigation (all interactive elements)',
  'Screen reader optimized (ARIA landmarks, roles, labels)',
  'High contrast mode support',
  'Reduced motion respects prefers-reduced-motion',
  '44px minimum touch targets',
  '7:1 contrast ratio (AAA)',
  'Focus indicators on all controls',
  'Semantic HTML throughout',
];

export function Slide09Accessibility() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-16"
      style={{ backgroundColor: '#ffffff', color: '#182B49' }}
    >
      <h2 className="mb-2 text-4xl font-extrabold md:text-5xl">
        Accessibility & Compatibility
      </h2>

      <div className="mb-10 mt-4 flex flex-wrap justify-center gap-4">
        <span
          className="rounded-full px-6 py-3 text-xl font-bold text-white"
          style={{ backgroundColor: '#e41a1a' }}
        >
          WCAG 2.2 AAA
        </span>
        <span
          className="rounded-full px-6 py-3 text-xl font-bold text-white"
          style={{ backgroundColor: '#182B49' }}
        >
          Any OS. Any browser. Any device.
        </span>
      </div>

      <div className="w-full max-w-3xl space-y-3">
        {checks.map((check) => (
          <div
            key={check}
            className="flex items-center gap-4 rounded-xl px-6 py-4"
            style={{ backgroundColor: '#f5f5f5' }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="flex-shrink-0"
            >
              <circle cx="12" cy="12" r="12" fill="#22c55e" />
              <path
                d="M7 12.5L10.5 16L17 9"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-lg font-semibold">{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
