'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChartProps } from './types';
import { useChartTheme, getAccentColor } from './useChartTheme';
import { useCompactChart } from './useCompactChart';
import ChartContainer from './ChartContainer';
import CustomTooltip from './CustomTooltip';

const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisKey,
  bars,
  layout = 'horizontal',
  xAxisType = 'category',
  barSize,
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
    margin = {
      top: 10,
      right: 30,
      // Room for the rotated axis title so it doesn't sit on top of the tick numbers.
      left: yAxisLabel ? 20 : 0,
      bottom: xAxisLabel ? 12 : 0,
    },
  } = config;
  const chartMargin = compact ? { ...margin, left: 0, right: 12 } : margin;

  const isHorizontalNumeric = layout === 'horizontal' && xAxisType === 'number';

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
        <RechartsBarChart data={data} margin={chartMargin} layout={layout}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.gridColor}
              vertical={false}
            />
          )}
          <XAxis
            dataKey={layout === 'horizontal' ? xAxisKey : undefined}
            type={layout === 'horizontal' ? xAxisType : 'number'}
            padding={isHorizontalNumeric ? { left: 20, right: 20 } : undefined}
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
            dataKey={layout === 'vertical' ? xAxisKey : undefined}
            type={layout === 'vertical' ? 'category' : 'number'}
            stroke={theme.textColor}
            tick={{ fill: theme.textColor }}
            width={compact ? 'auto' : undefined}
            label={
              yAxisLabel && !compact
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 8,
                    fill: theme.textColor,
                  }
                : undefined
            }
          />
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip labelFormatter={tooltipLabelFormatter} />}
              cursor={isHorizontalNumeric ? false : { fill: 'rgba(128, 128, 128, 0.1)' }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
          )}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || getAccentColor(index, theme)}
              stackId={bar.stackId}
              barSize={barSize}
              animationDuration={animate ? 1000 : 0}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default BarChart;
