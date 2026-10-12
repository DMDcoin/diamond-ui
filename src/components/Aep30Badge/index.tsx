'use client';
import { formatAep30 } from '@/utils/format';
import '../SharedStats/SharedStats.css';

interface Aep30BadgeProps {
  aep30: number; // 0.0 – 1.0
}

export default function Aep30Badge({ aep30 }: Aep30BadgeProps) {
  return (
    <span className="dmd-aep30-badge">
      {formatAep30(aep30)}
    </span>
  );
}

interface Aep30BarProps {
  aep30: number; // 0.0 – 1.0
}

export function Aep30Bar({ aep30 }: Aep30BarProps) {
  const pct = Math.min(100, Math.max(0, aep30 * 100));
  return (
    <div className="dmd-aep30-bar">
      <div className="dmd-aep30-bar__track">
        <div
          className="dmd-aep30-bar__fill"
          style={{ width: `${pct}%` }}
        />
        <span className="dmd-aep30-bar__value">{formatAep30(pct / 100)}</span>
      </div>
      <span className="dmd-aep30-bar__sub">active epochs</span>
    </div>
  );
}

interface Aep30RingProps {
  aep30: number | null;
  isLoading?: boolean;
}

export function Aep30Ring({ aep30, isLoading }: Aep30RingProps) {
  const size = 120;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = aep30 != null ? Math.min(100, Math.max(0, aep30 * 100)) : 0;
  const dashOffset = circumference * (1 - pct / 100);

  let center = '—';
  if (isLoading) center = '...';
  else if (aep30 != null) center = formatAep30(pct / 100);

  return (
    <div className="dmd-aep30-ring">
      {aep30 != null && !isLoading && (
        <svg className="dmd-aep30-ring__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            className="dmd-aep30-ring__track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            className="dmd-aep30-ring__progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      )}
      <span className="dmd-aep30-ring__value">{center}</span>
    </div>
  );
}
