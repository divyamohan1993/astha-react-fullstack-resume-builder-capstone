export function Slide05DemoBuilder() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-16"
      style={{ backgroundColor: '#ffffff', color: '#182B49' }}
    >
      <h2 className="mb-2 text-4xl font-extrabold md:text-5xl">
        Student Builder
      </h2>
      <p className="mb-10 text-xl" style={{ color: '#666666' }}>
        Build. Preview. Refine. Print.
      </p>

      {/* Mockup */}
      <div
        className="flex w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ border: '2px solid #e0e0e0' }}
      >
        {/* Left: form mockup */}
        <div className="w-1/2 space-y-4 border-r p-6" style={{ borderColor: '#e0e0e0', backgroundColor: '#fafafa' }}>
          <div className="h-8 w-3/4 rounded" style={{ backgroundColor: '#e0e0e0' }} />
          <div className="h-6 w-1/2 rounded" style={{ backgroundColor: '#e0e0e0' }} />
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-10 rounded"
                style={{ backgroundColor: '#e0e0e0' }}
              />
            ))}
          </div>
          <div
            className="mt-4 h-10 w-full rounded-lg text-center text-sm font-bold leading-10 text-white"
            style={{ backgroundColor: '#e41a1a' }}
          >
            AI Refine
          </div>
        </div>

        {/* Right: preview mockup */}
        <div className="w-1/2 space-y-3 p-6" style={{ backgroundColor: '#ffffff' }}>
          <div
            className="h-6 w-2/3 rounded"
            style={{ backgroundColor: '#182B49' }}
          />
          <div className="h-4 w-1/2 rounded" style={{ backgroundColor: '#e0e0e0' }} />
          <div className="mt-4 space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-3 rounded"
                style={{
                  backgroundColor: '#e0e0e0',
                  width: `${85 - n * 10}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-6 space-y-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-3 rounded"
                style={{
                  backgroundColor: '#e0e0e0',
                  width: `${90 - n * 8}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-10 flex flex-wrap justify-center gap-6 text-lg font-semibold">
        {[
          '4 professional templates',
          'Live preview',
          'Direct edit',
          'AI refinement',
        ].map((f) => (
          <span
            key={f}
            className="rounded-full px-5 py-2"
            style={{
              backgroundColor: 'rgba(228, 26, 26, 0.1)',
              color: '#e41a1a',
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
