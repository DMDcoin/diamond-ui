'use client';

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { LineChartProps } from './types';
import { useChartTheme, getAccentColor } from './useChartTheme';
import { useCompactChart } from './useCompactChart';
import ChartContainer from './ChartContainer';
import CustomTooltip from './CustomTooltip';

const LineChart: React.FC<LineChartProps> = ({
  data,
  xAxisKey,
  lines,
  config = {},
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  animate = true,
  className = '',
  isLoading = false,
  emptyMessage = 'No data to display',
  xAxisLabel,
  yAxisLabel,
  tooltipLabelFormatter,
}) => {
  const theme = useChartTheme();
  const { compact, onResize } = useCompactChart();
  const hasData = data && data.length > 0;

  const {
    width = '100%' as const,
    height = 400,
    margin = { top: 10, right: 30, left: 0, bottom: 0 },
  } = config;
  const chartMargin = compact ? { ...margin, left: 0, right: 12 } : margin;

  return (
    <ChartContainer
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      hasData={hasData}
      className={className}
    >
      {compact && yAxisLabel && (
        <div className="chart-axis-titles">
          <span>{yAxisLabel}</span>
        </div>
      )}
      <ResponsiveContainer width={width} height={height} onResize={onResize}>
        <RechartsLineChart data={data} margin={chartMargin}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.gridColor}
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            stroke={theme.textColor}
            tick={{ fill: theme.textColor }}
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: 'insideBottom',
                    offset: -5,
                    fill: theme.textColor,
                  }
                : undefined
            }
          />
          <YAxis
            stroke={theme.textColor}
            tick={{ fill: theme.textColor }}
            width={compact ? 'auto' : undefined}
            label={
              yAxisLabel && !compact
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    fill: theme.textColor,
                  }
                : undefined
            }
          />
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip labelFormatter={tooltipLabelFormatter} />}
              cursor={{ strokeDasharray: '3 3' }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
          )}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type={line.type || 'monotone'}
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || getAccentColor(index, theme)}
              strokeWidth={line.strokeWidth || 2}
              dot={line.dot !== undefined ? line.dot : true}
              activeDot={{ r: 6 }}
              animationDuration={animate ? 1000 : 0}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default LineChart;
