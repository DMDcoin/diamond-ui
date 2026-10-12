'use client';

import React from 'react';
import {
  ComposedChart as RechartsComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ComposedChartProps } from './types';
import { useChartTheme, getAccentColor } from './useChartTheme';
import { useCompactChart } from './useCompactChart';
import ChartContainer from './ChartContainer';
import CustomTooltip from './CustomTooltip';

const ComposedChart: React.FC<ComposedChartProps> = ({
  data,
  xAxisKey,
  elements,
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
  showSecondaryYAxis = false,
  secondaryYAxisLabel,
}) => {
  const theme = useChartTheme();
  const { compact, onResize } = useCompactChart();
  const hasData = data && data.length > 0;

  const {
    width = '100%' as const,
    height = 400,
    margin = { top: 10, right: 30, left: 0, bottom: 0 },
  } = config;
  const chartMargin = compact ? { ...margin, left: 0, right: showSecondaryYAxis ? 0 : 12 } : margin;

  const renderElement = (element: any, index: number) => {
    const color = element.color || getAccentColor(index, theme);
    const elementKey = `${element.type}-${element.dataKey}`;
    const commonProps = {
      dataKey: element.dataKey,
      name: element.name || element.dataKey,
      yAxisId: element.yAxisId || 'left',
      animationDuration: animate ? 1000 : 0,
    };

    switch (element.type) {
      case 'line':
        return (
          <Line
            key={elementKey}
            {...commonProps}
            type={element.curveType || 'monotone'}
            stroke={color}
            strokeWidth={element.strokeWidth || 2}
            dot={element.dot !== undefined ? element.dot : true}
          />
        );
      case 'bar':
        return (
          <Bar
            key={elementKey}
            {...commonProps}
            fill={color}
            radius={[4, 4, 0, 0]}
            barSize={element.barSize}
          />
        );
      case 'area':
        return (
          <Area
            key={elementKey}
            {...commonProps}
            type={element.curveType || 'monotone'}
            stroke={color}
            strokeWidth={element.strokeWidth || 2}
            fill={color}
            fillOpacity={0.3}
            dot={element.dot ? { r: 3, fill: color, strokeWidth: 0 } : false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ChartContainer
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      hasData={hasData}
      className={className}
    >
      {compact && (yAxisLabel || secondaryYAxisLabel) && (
        <div className="chart-axis-titles">
          <span>{yAxisLabel}</span>
          {showSecondaryYAxis && secondaryYAxisLabel && <span>{secondaryYAxisLabel}</span>}
        </div>
      )}
      <ResponsiveContainer width={width} height={height} onResize={onResize}>
        <RechartsComposedChart data={data} margin={chartMargin}>
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
            yAxisId="left"
            stroke={theme.textColor}
            tick={{ fill: theme.textColor }}
            width={compact ? 'auto' : yAxisLabel ? 72 : 60}
            label={
              yAxisLabel && !compact
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
          {showSecondaryYAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={theme.textColor}
              tick={{ fill: theme.textColor }}
              width={compact ? 'auto' : secondaryYAxisLabel ? 72 : 60}
              label={
                secondaryYAxisLabel && !compact
                  ? {
                      value: secondaryYAxisLabel,
                      angle: 90,
                      position: 'insideRight',
                      offset: 0,
                      style: { textAnchor: 'middle' },
                      fill: theme.textColor,
                    }
                  : undefined
              }
            />
          )}
          {showTooltip && (
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
            />
          )}
          {elements.map((element, index) => renderElement(element, index))}
        </RechartsComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default ComposedChart;
