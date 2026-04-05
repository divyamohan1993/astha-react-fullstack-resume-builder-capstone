const sections = [
  {
    title: 'Offline Strategy',
    items: [
      'Service Worker (Workbox) precaches all assets',
      'IndexedDB persists resume data and ML models',
      'Background sync when reconnected',
    ],
    icon: '[ SW ]',
    color: '#e41a1a',
  },
  {
    title: 'Progressive Enhancement',
    items: [
      'WASM everywhere (any browser, any device)',
      'WebGPU acceleration when available',
      'CPU fallback for older hardware',
    ],
    icon: '[ PE ]',
    color: '#182B49',
  },
  {
    title: 'Zero Server Cost',
    items: [
      'Static deployment (Netlify, Vercel, GitHub Pages)',
      '0 CPU, no cold starts',
      'All AI runs in-browser',
    ],
    icon: '[ $0 ]',
    color: '#22c55e',
  },
  {
    title: 'Performance Targets',
    items: [
      'LCP < 2.5s',
      'INP < 200ms',
      'CLS < 0.1',
      'Student mode bundle < 500KB',
    ],
    icon: '[ ms ]',
    color: '#d4a800',
  },
];

export function Slide08TechDeep() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-16"
      style={{ backgroundColor: '#182B49', color: '#ffffff' }}
    >
      <h2 className="mb-10 text-4xl font-extrabold md:text-5xl">
        Technical Deep-Dive
      </h2>

      <div className="grid max-w-5xl gap-6 md:grid-cols-2">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderLeft: `4px solid ${s.color}`,
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className="rounded px-2 py-1 font-mono text-xs font-bold"
                style={{ backgroundColor: s.color, color: '#ffffff' }}
              >
                {s.icon}
              </span>
              <h3 className="text-xl font-bold">{s.title}</h3>
            </div>
            <ul className="space-y-1.5">
              {s.items.map((item) => (
                <li
                  key={item}
                  className="text-base"
                  style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
