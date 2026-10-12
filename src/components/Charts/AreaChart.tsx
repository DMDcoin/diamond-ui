'use client';

import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AreaChartProps } from './types';
import { useChartTheme, getAccentColor } from './useChartTheme';
import ChartContainer from './ChartContainer';
import CustomTooltip from './CustomTooltip';

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  xAxisKey,
  areas,
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
}) => {
  const theme = useChartTheme();
  const hasData = data && data.length > 0;

  const {
    width = '100%' as const,
    height = 400,
    margin = { top: 10, right: 30, left: 0, bottom: 0 },
  } = config;

  return (
    <ChartContainer
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      hasData={hasData}
      className={className}
    >
      <ResponsiveContainer width={width} height={height}>
        <RechartsAreaChart data={data} margin={margin}>
          <defs>
            {areas.map((area, index) => {
              const color = area.color || getAccentColor(index, theme);
              return (
                <linearGradient
                  key={`gradient-${area.dataKey}`}
                  id={`gradient-${area.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              );
            })}
          </defs>
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
            width={yAxisLabel ? 72 : 60}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 0,
                    style: { textAnchor: 'middle' },
                    fill: theme.textColor,
                  }
                : undefined
            }
          />
          {showTooltip && (
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
          )}
          {areas.map((area, index) => {
            const color = area.color || getAccentColor(index, theme);
            return (
              <Area
                key={area.dataKey}
                type={area.type || 'monotone'}
                dataKey={area.dataKey}
                name={area.name || area.dataKey}
                stroke={color}
                fill={`url(#gradient-${area.dataKey})`}
                fillOpacity={1}
                stackId={area.stackId}
                animationDuration={animate ? 1000 : 0}
              />
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default AreaChart;
