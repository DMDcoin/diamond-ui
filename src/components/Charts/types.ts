import type { ReactNode } from 'react';

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'scatter' | 'composed';

export interface BaseChartData {
  [key: string]: string | number | undefined;
}

export interface ChartDataPoint extends BaseChartData {
  name?: string;
  label?: string;
  value?: number;
}

export interface ChartConfig {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface BaseChartProps {
  data: ChartDataPoint[];
  config?: ChartConfig;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  className?: string;
  isLoading?: boolean;
  emptyMessage?: string;
}

export interface LineChartProps extends BaseChartProps {
  xAxisKey: string;
  lines: {
    dataKey: string;
    name?: string;
    color?: string;
    strokeWidth?: number;
    type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
    dot?: boolean;
  }[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  tooltipLabelFormatter?: (label: any) => ReactNode;
}

export interface BarChartProps extends BaseChartProps {
  xAxisKey: string;
  bars: {
    dataKey: string;
    name?: string;
    color?: string;
    stackId?: string;
  }[];
  layout?: 'horizontal' | 'vertical';
  xAxisType?: 'category' | 'number';
  barSize?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  tooltipLabelFormatter?: (label: any) => ReactNode;
}

export interface AreaChartProps extends BaseChartProps {
  xAxisKey: string;
  areas: {
    dataKey: string;
    name?: string;
    color?: string;
    type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
    stackId?: string;
  }[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface PieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey: string;
  innerRadius?: number | `${number}%`;
  outerRadius?: number | `${number}%`;
  showLabels?: boolean;
  colors?: string[];
  centerLabel?: string;
  centerValue?: string | number;
}

export interface ScatterChartProps extends BaseChartProps {
  xAxisKey: string;
  yAxisKey: string;
  zAxisKey?: string;
  color?: string;
  shape?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface ComposedChartProps extends BaseChartProps {
  xAxisKey: string;
  elements: Array<{
    type: 'line' | 'bar' | 'area';
    dataKey: string;
    name?: string;
    color?: string;
    yAxisId?: string;
    [key: string]: any;
  }>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showSecondaryYAxis?: boolean;
  secondaryYAxisLabel?: string;
}

export interface ChartTheme {
  textColor: string;
  gridColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColors: string[];
}
