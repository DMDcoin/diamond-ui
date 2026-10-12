'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string; // yyyy-mm-dd, or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string): string {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Mon-first day-of-week grid, including leading/trailing days from adjacent months. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
}

export default function DateField({ value, onChange, placeholder = 'Select date' }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setViewDate(selected ?? new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const grid = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth());

  return (
    <div className="dmd-datefield" ref={containerRef}>
      <button type="button" className="dmd-datefield-input" onClick={() => setOpen((o) => !o)}>
        <span className={value ? '' : 'dmd-datefield-placeholder'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <i className="fas fa-calendar"></i>
      </button>

      {open && (
        <div className="dmd-datefield-popover">
          <div className="dmd-datefield-header">
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <span>{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="dmd-datefield-weekdays">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="dmd-datefield-grid">
            {grid.map((day) => {
              const inMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selected && day.toDateString() === selected.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  className={[
                    'dmd-datefield-day',
                    !inMonth && 'dmd-datefield-day--muted',
                    isSelected && 'dmd-datefield-day--selected',
                    isToday && !isSelected && 'dmd-datefield-day--today',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    onChange(toValue(day));
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {value && (
            <button type="button" className="dmd-datefield-clear" onClick={() => { onChange(''); setOpen(false); }}>
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
