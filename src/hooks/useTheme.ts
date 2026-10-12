'use client';

import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check initial theme
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const isLight = document.body.classList.contains('light-theme');
        setTheme(isLight ? 'light' : 'dark');
      }
    };

    // Initial check
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });

    if (typeof window !== 'undefined') {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // During SSR or before client hydration, always return dark theme
  if (!isClient) {
    return 'dark';
  }

  return theme;
};
