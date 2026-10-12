'use client';

import React from 'react';
import { useChartTheme } from './useChartTheme';
import { formatDecimal } from '@/utils/format';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelFormatter?: (label: any) => React.ReactNode;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, labelFormatter }) => {
  const theme = useChartTheme();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const displayLabel = labelFormatter && label !== undefined ? labelFormatter(label) : label;

  return (
    <div
      className="chart-custom-tooltip"
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 8px 10px -4px rgba(0, 0, 0, 0.3), 0 3px 5px -3px rgba(0, 0, 0, 0.2)',
      }}
    >
      {displayLabel && (
        <div
          className="tooltip-label"
          style={{
            color: theme.tooltipText,
            fontWeight: 600,
            marginBottom: '8px',
            fontSize: '0.9rem',
          }}
        >
          {displayLabel}
        </div>
      )}
      {payload.map((entry, index) => (
        <div
          key={`tooltip-item-${index}`}
          className="tooltip-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: theme.tooltipText,
            fontSize: '0.85rem',
            margin: '4px 0',
          }}
        >
          <div
            className="tooltip-color"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              background: entry.color || entry.fill || entry.stroke,
            }}
          />
          <span style={{ flex: 1 }}>
            {entry.name}:
          </span>
          <span style={{ fontWeight: 600 }}>
            {typeof entry.value === 'number'
              ? formatDecimal(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CustomTooltip;
