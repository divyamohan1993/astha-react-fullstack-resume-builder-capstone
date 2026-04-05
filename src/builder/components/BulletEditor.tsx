import { useRef } from 'react';

interface BulletEditorProps {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  label?: string;
}

export function BulletEditor({ bullets, onChange, label = 'Bullet points' }: BulletEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const val = inputRef.current?.value.trim();
    if (!val) return;
    onChange([...bullets, val]);
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.focus();
  };

  const remove = (index: number) => {
    onChange(bullets.filter((_, i) => i !== index));
  };

  const update = (index: number, value: string) => {
    const next = [...bullets];
    next[index] = value;
    onChange(next);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...bullets];
    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === bullets.length - 1) return;
    const next = [...bullets];
    [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <ul className="space-y-1">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
              &bull;
            </span>
            <input
              type="text"
              value={bullet}
              onChange={(e) => update(i, e.target.value)}
              className="min-h-[36px] flex-1 rounded border px-2 py-1 text-sm"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              aria-label={`Bullet ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="min-h-[36px] min-w-[36px] rounded text-sm disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
              aria-label={`Move bullet ${i + 1} up`}
            >
              &#x25B2;
            </button>
            <button
              type="button"
              onClick={() => moveDown(i)}
              disabled={i === bullets.length - 1}
              className="min-h-[36px] min-w-[36px] rounded text-sm disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
              aria-label={`Move bullet ${i + 1} down`}
            >
              &#x25BC;
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="min-h-[36px] min-w-[36px] rounded text-sm"
              style={{ color: 'var(--accent-red)' }}
              aria-label={`Remove bullet ${i + 1}`}
            >
              &#x2715;
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a bullet point..."
          onKeyDown={handleKeyDown}
          className="min-h-[44px] flex-1 rounded-md border px-3 py-2 text-sm"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
          aria-label="New bullet point"
        />
        <button
          type="button"
          onClick={add}
          className="min-h-[44px] rounded-md px-4 text-sm font-medium text-white"
          style={{ background: 'var(--accent-navy)' }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
