'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PieChartProps } from './types';
import { formatPercent } from '@/utils/format';
import { useChartTheme, getAccentColor } from './useChartTheme';
import ChartContainer from './ChartContainer';
import CustomTooltip from './CustomTooltip';

const PieChart: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  innerRadius = 0,
  outerRadius = '80%',
  showLabels = true,
  colors,
  config = {},
  showLegend = true,
  showTooltip = true,
  animate = true,
  className = '',
  isLoading = false,
  emptyMessage = 'No data to display',
  centerLabel,
  centerValue,
}) => {
  const theme = useChartTheme();
  const hasData = data && data.length > 0;

  const {
    width = '100%' as const,
    height = 400,
  } = config;

  const isDonut = typeof innerRadius === 'number' 
    ? innerRadius > 0 
    : innerRadius !== undefined && innerRadius !== '0%';

  // Custom label renderer for pie segments
  const renderLabel = (entry: any) => {
    if (!showLabels) return '';
    const percent = (entry.value / entry.payload.total) * 100;
    return `${entry[nameKey]}: ${formatPercent(percent)}`;
  };

  return (
    <ChartContainer
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      hasData={hasData}
      className={className}
    >
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width={width} height={height}>
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              label={showLabels ? renderLabel : false}
              labelLine={showLabels}
              animationDuration={animate ? 1000 : 0}
              animationBegin={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    colors && colors[index]
                      ? colors[index]
                      : getAccentColor(index, theme)
                  }
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>

        {/* Center label for donut charts */}
        {isDonut && (centerLabel || centerValue) && (
          <div className="donut-center-label">
            {centerLabel && <div className="label">{centerLabel}</div>}
            {centerValue && <div className="value">{centerValue}</div>}
          </div>
        )}
      </div>
    </ChartContainer>
  );
};

export default PieChart;
