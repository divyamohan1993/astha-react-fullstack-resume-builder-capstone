import { useRef } from 'react';

interface SkillTagInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  label?: string;
}

export function SkillTagInput({ skills, onChange, label = 'Skills' }: SkillTagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const val = inputRef.current?.value.trim();
    if (!val || skills.includes(val)) return;
    onChange([...skills, val]);
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.focus();
  };

  const remove = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <div className="flex flex-wrap gap-2" role="list" aria-label={`${label} tags`}>
        {skills.map((skill, i) => (
          <span
            key={i}
            role="listitem"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              background: 'var(--accent-navy)',
              color: '#ffffff',
            }}
          >
            {skill}
            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-1 inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full text-xs hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.2)' }}
              aria-label={`Remove ${skill}`}
            >
              &#x2715;
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a skill and press Enter..."
          onKeyDown={handleKeyDown}
          className="min-h-[44px] flex-1 rounded-md border px-3 py-2 text-sm"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
          aria-label="Add skill"
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
