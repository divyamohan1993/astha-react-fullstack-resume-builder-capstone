import { useState, useEffect, useCallback, type ReactNode } from 'react';

interface PitchNavProps {
  children: ReactNode[];
}

export function PitchNav({ children }: PitchNavProps) {
  const [current, setCurrent] = useState(0);
  const total = children.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      setCurrent((i) => Math.max(0, Math.min(total - 1, i + dir)));
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <div
      className="pitch-deck relative h-screen w-screen overflow-hidden"
      role="region"
      aria-roledescription="slide deck"
      aria-label="ResumeAI Pitch Deck"
    >
      {/* Slide track */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out print:block"
        style={{
          transform: `translateX(-${current * 100}vw)`,
          width: `${total * 100}vw`,
        }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="pitch-slide flex h-screen w-screen flex-shrink-0 items-center justify-center overflow-auto print:h-auto print:min-h-screen"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${i + 1} of ${total}`}
            aria-hidden={i !== current}
            style={{ pageBreakAfter: 'always' }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Navigation controls */}
      <nav
        className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full px-6 py-3 shadow-lg print:hidden"
        style={{ backgroundColor: 'rgba(24, 43, 73, 0.9)' }}
        aria-label="Slide navigation"
      >
        <button
          onClick={() => go(-1)}
          disabled={current === 0}
          className="rounded-full p-2 text-white transition-opacity disabled:opacity-30"
          aria-label="Previous slide"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 4L6 10L12 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {children.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all"
              style={{
                width: i === current ? 24 : 10,
                height: 10,
                backgroundColor:
                  i === current ? '#e41a1a' : 'rgba(255,255,255,0.4)',
              }}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
            />
          ))}
        </div>

        <span
          className="min-w-[3rem] text-center text-sm font-semibold text-white"
          aria-live="polite"
        >
          {current + 1}/{total}
        </span>

        <button
          onClick={() => go(1)}
          disabled={current === total - 1}
          className="rounded-full p-2 text-white transition-opacity disabled:opacity-30"
          aria-label="Next slide"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 4L14 10L8 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </nav>
    </div>
  );
}
