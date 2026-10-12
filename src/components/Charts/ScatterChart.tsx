'use client';

import React from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { ScatterChartProps } from './types';
import { useChartTheme } from './useChartTheme';
import ChartContainer from './ChartContainer';
import CustomTooltip from './CustomTooltip';

const ScatterChart: React.FC<ScatterChartProps> = ({
  data,
  xAxisKey,
  yAxisKey,
  zAxisKey,
  color,
  shape = 'circle',
  config = {},
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
    margin = { top: 20, right: 30, left: 20, bottom: 20 },
  } = config;

  const scatterColor = color || theme.primaryColor;

  return (
    <ChartContainer
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      hasData={hasData}
      className={className}
    >
      <ResponsiveContainer width={width} height={height}>
        <RechartsScatterChart margin={margin}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.gridColor}
            />
          )}
          <XAxis
            type="number"
            dataKey={xAxisKey}
            name={xAxisLabel || xAxisKey}
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
            type="number"
            dataKey={yAxisKey}
            name={yAxisLabel || yAxisKey}
            stroke={theme.textColor}
            tick={{ fill: theme.textColor }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    fill: theme.textColor,
                  }
                : undefined
            }
          />
          {zAxisKey && (
            <ZAxis
              type="number"
              dataKey={zAxisKey}
              range={[50, 400]}
            />
          )}
          {showTooltip && <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />}
          <Scatter
            name="Data Points"
            data={data}
            fill={scatterColor}
            shape={shape}
            animationDuration={animate ? 1000 : 0}
          />
        </RechartsScatterChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default ScatterChart;
