import { useRef, useCallback } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  placeholder?: string;
}

export function EditableText({
  value,
  onChange,
  tag: Tag = 'span',
  className = '',
  style,
  ariaLabel,
  placeholder,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null);

  const handleBlur = useCallback(() => {
    const text = ref.current?.textContent ?? '';
    if (text !== value) {
      onChange(text);
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && Tag !== 'p' && Tag !== 'div') {
      e.preventDefault();
      ref.current?.blur();
    }
  }, [Tag]);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLElement & HTMLDivElement>}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`outline-none ring-inset focus-visible:ring-2 ${className}`}
      style={{
        ...style,
        minHeight: '1em',
      }}
      role="textbox"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
}
