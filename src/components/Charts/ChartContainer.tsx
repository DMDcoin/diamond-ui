'use client';

import React from 'react';
import './Charts.css';

interface ChartContainerProps {
  children: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  hasData?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  isLoading = false,
  emptyMessage = 'No data available',
  hasData = true,
  className = '',
  title,
  description,
}) => {
  return (
    <div className={`chart-container ${className}`}>
      {title && (
        <div className="chart-header">
          <h3 className="chart-title">{title}</h3>
          {description && <p className="chart-description">{description}</p>}
        </div>
      )}

      <div className="chart-content">
        {isLoading && (
          <div className="chart-loading">
            <div className="chart-spinner"></div>
            <p>Loading chart data...</p>
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="chart-empty">
            <i className="fas fa-chart-line"></i>
            <p>{emptyMessage}</p>
          </div>
        )}

        {!isLoading && hasData && children}
      </div>
    </div>
  );
};

export default ChartContainer;
