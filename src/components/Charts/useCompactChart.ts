'use client';

import { useCallback, useState } from 'react';

const COMPACT_CHART_WIDTH = 480;

export const useCompactChart = () => {
  const [compact, setCompact] = useState(false);
  const onResize = useCallback((width: number) => {
    setCompact(width > 0 && width < COMPACT_CHART_WIDTH);
  }, []);
  return { compact, onResize };
};
