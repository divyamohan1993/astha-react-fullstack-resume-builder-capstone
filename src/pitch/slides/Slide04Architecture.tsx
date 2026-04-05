const layers = [
  {
    id: 'L1',
    label: 'L1: Keyword / NLP',
    desc: 'TF-IDF, regex extraction',
    color: '#e41a1a',
  },
  {
    id: 'L2',
    label: 'L2: MiniLM Embeddings',
    desc: 'ONNX Runtime Web (WASM)',
    color: '#d4a800',
  },
  {
    id: 'L3',
    label: 'L3: Gemma 3 Reasoning',
    desc: 'WebLLM (WebGPU + WASM)',
    color: '#182B49',
  },
  {
    id: 'L4',
    label: 'L4: Gemini API Fallback',
    desc: 'Optional, user API key',
    color: '#666666',
  },
];

const stack = [
  'Vite 6',
  'React 19',
  'Tailwind CSS 4',
  'Zustand',
  'ONNX Runtime',
  'WebLLM',
  'Workbox PWA',
];

export function Slide04Architecture() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 md:p-16"
      style={{ backgroundColor: '#182B49', color: '#ffffff' }}
    >
      <h2 className="mb-10 text-4xl font-extrabold md:text-5xl">
        Architecture
      </h2>

      {/* 4-layer pipeline */}
      <div className="mb-10 flex max-w-4xl flex-wrap items-center justify-center gap-0">
        {layers.map((layer, i) => (
          <div key={layer.id} className="flex items-center">
            <div
              className="flex flex-col items-center rounded-xl px-6 py-5 text-center shadow-lg"
              style={{ backgroundColor: layer.color, minWidth: 180 }}
            >
              <span className="text-lg font-bold">{layer.label}</span>
              <span className="mt-1 text-sm opacity-80">{layer.desc}</span>
            </div>
            {i < layers.length - 1 && (
              <svg
                width="32"
                height="24"
                viewBox="0 0 32 24"
                className="mx-1 flex-shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M4 12H24M24 12L18 6M24 12L18 18"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="flex flex-wrap justify-center gap-3">
        {stack.map((tech) => (
          <span
            key={tech}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
