'use client';

import { useEffect, useState } from 'react';
import { useFadeInAnimation } from '@/hooks';
import { initializeTheme } from '@/utils/theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  // Initialize global fade-in animations (hook handles client-side check internally)
  useFadeInAnimation();

  useEffect(() => {
    setIsClient(true);
    
    // Use a longer timeout to ensure DOM elements are fully rendered
    const timeoutId = setTimeout(() => {
      initializeTheme();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, []);

  // Prevent hydration mismatch by hiding content until client-side rendering is complete
  if (!isClient) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
}