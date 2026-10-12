'use client';

import { useTheme } from '@/hooks/useTheme';
import { useMemo } from 'react';
import { ChartTheme } from './types';

/**
 * Hook that provides theme-aware colors for charts
 * @returns ChartTheme object with current theme colors
 */
export const useChartTheme = (): ChartTheme => {
  const theme = useTheme();

  return useMemo(() => {
    const isDark = theme === 'dark';

    return {
      // Text colors
      textColor: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(18, 24, 38, 0.75)',
      
      // Grid colors
      gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      
      // Tooltip colors
      tooltipBg: isDark ? 'rgba(22, 22, 26, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      tooltipText: isDark ? '#ffffff' : '#121826',
      
      // Primary/Secondary colors
      primaryColor: isDark ? '#3a7bd5' : '#2563eb',
      secondaryColor: isDark ? '#00d2ff' : '#1d4ed8',
      
      // Accent colors for multi-series charts
      accentColors: isDark
        ? [
            '#3a7bd5',  // Blue
            '#00d2ff',  // Cyan
            '#8a2be2',  // Purple
            '#00ffbf',  // Teal
            '#ff6b9d',  // Pink
            '#ffd700',  // Gold
            '#00ff88',  // Green
            '#ff8c42',  // Orange
          ]
        : [
            '#2563eb',  // Blue
            '#0891b2',  // Cyan
            '#7c3aed',  // Purple
            '#059669',  // Teal
            '#db2777',  // Pink
            '#ca8a04',  // Gold
            '#16a34a',  // Green
            '#ea580c',  // Orange
          ],
    };
  }, [theme]);
};

/**
 * Get a specific accent color by index
 * @param index - Color index
 * @param theme - Chart theme
 * @returns Color string
 */
export const getAccentColor = (index: number, theme: ChartTheme): string => {
  return theme.accentColors[index % theme.accentColors.length];
};

/**
 * Generate gradient colors for visualizations
 * @param baseColor - Base color to create gradient from
 * @param steps - Number of gradient steps
 * @returns Array of gradient colors
 */
export const generateGradient = (baseColor: string, steps: number = 5): string[] => {
  // This is a simplified gradient generator
  const colors: string[] = [];
  
  for (let i = 0; i < steps; i++) {
    const opacity = 0.3 + (i / steps) * 0.7;
    colors.push(`${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
  }
  
  return colors;
};
