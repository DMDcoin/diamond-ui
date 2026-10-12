'use client';
import React from 'react';
import { formatDecimal, formatRpt30 } from '@/utils/format';
import '../SharedStats/SharedStats.css';

interface Rpt30CellProps {
  rpt30: number;
  rpt30_delta?: number | null;
}

export default function Rpt30Cell({ rpt30, rpt30_delta }: Rpt30CellProps) {
  let deltaEl: React.ReactNode = null;
  if (rpt30_delta != null) {
    const cls = rpt30_delta > 0 ? 'up' : rpt30_delta < 0 ? 'down' : 'flat';
    const arrow = rpt30_delta > 0 ? '▲' : rpt30_delta < 0 ? '▼' : '→';
    deltaEl = (
      <span className={`dmd-rpt30-cell__delta dmd-rpt30-cell__delta--${cls}`}>
        {arrow} {formatDecimal(rpt30_delta, { sign: true })}
      </span>
    );
  }
  return (
    <div className="dmd-rpt30-cell">
      <span className="dmd-rpt30-cell__value">{formatRpt30(rpt30)}</span>
      <span className="dmd-rpt30-cell__sub">per 1000 / 30d</span>
      {deltaEl}
    </div>
  );
}
