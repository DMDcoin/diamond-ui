'use client';

import { useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
};

export default function SelectField({ value, onChange, options, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`dmd-selectfield ${className}`} ref={containerRef}>
      <button type="button" className="dmd-selectfield-input" onClick={() => setOpen((o) => !o)}>
        <span>{selected?.label ?? ''}</span>
        <i className="fas fa-chevron-down"></i>
      </button>

      {open && (
        <div className="dmd-selectfield-popover">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`dmd-selectfield-option${opt.value === value ? ' dmd-selectfield-option--selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
