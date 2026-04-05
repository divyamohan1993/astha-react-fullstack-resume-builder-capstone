import { useState, useRef, useEffect, useId } from 'react';

interface CitationTooltipProps {
  citation: string;
  children: React.ReactNode;
}

export function CitationTooltip({ citation, children }: CitationTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 underline decoration-dotted"
        style={{ color: 'var(--accent-navy)' }}
        aria-describedby={open ? tooltipId : undefined}
        aria-label="Show citation"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {open && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg p-3 text-sm shadow-lg"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {citation}
        </div>
      )}
    </span>
  );
}
