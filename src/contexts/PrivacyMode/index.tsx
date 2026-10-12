'use client';

/**
 * Privacy Mode Context
 * Provides global privacy mode state with localStorage persistence and page reload on toggle
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { PrivacyModeState, PrivacyModeProviderProps } from '@/types/privacyMode';
import {
  initializePrivacyMode,
  setPrivacyModeStorage,
  clearPrivacyModeCache,
  DEFAULT_PRIVACY_MODE_STATE,
} from '@/utils/privacyMode';


const PrivacyModeContext = createContext<PrivacyModeState | undefined>(undefined);


export function PrivacyModeProvider({ children }: PrivacyModeProviderProps) {
  // Initialize state from localStorage
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    // Only initialize from storage on client side
    if (typeof window !== 'undefined') {
      return initializePrivacyMode();
    }
    return DEFAULT_PRIVACY_MODE_STATE;
  });

  // Sync with localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedValue = initializePrivacyMode();
      if (storedValue !== isPrivacyMode) {
        setIsPrivacyMode(storedValue);
      }
    }
  }, []);

  /**
   * Toggle privacy mode
   * Updates localStorage and triggers a full page reload
   */
  const togglePrivacyMode = useCallback(() => {
    if (typeof window === 'undefined') return;

    const newState = !isPrivacyMode;
    
    // Update localStorage
    setPrivacyModeStorage(newState);
    
    // Clear cache
    clearPrivacyModeCache();
    
    // Update state
    setIsPrivacyMode(newState);
    
    // Trigger full page reload to reinitialize data fetching with small delay
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [isPrivacyMode]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<PrivacyModeState>(
    () => ({
      isPrivacyMode,
      togglePrivacyMode,
    }),
    [isPrivacyMode, togglePrivacyMode]
  );

  return (
    <PrivacyModeContext.Provider value={contextValue}>
      {children}
    </PrivacyModeContext.Provider>
  );
}

/**
 * Hook to use Privacy Mode context
 * @returns {PrivacyModeState} Privacy mode state and toggle function
 * @throws {Error} If used outside of PrivacyModeProvider
 */
export function usePrivacyMode(): PrivacyModeState {
  const context = useContext(PrivacyModeContext);
  
  if (context === undefined) {
    throw new Error('usePrivacyMode must be used within a PrivacyModeProvider');
  }
  
  return context;
}

/**
 * Higher-Order Component to inject privacy mode props
 * @param Component - Component to wrap
 * @returns Wrapped component with privacy mode props
 */
export function withPrivacyMode<P extends object>(
  Component: React.ComponentType<P>
): React.FC<Omit<P, 'privacyMode'>> {
  return function WrappedComponent(props: Omit<P, 'privacyMode'>) {
    const privacyMode = usePrivacyMode();
    
    return <Component {...(props as P)} privacyMode={privacyMode} />;
  };
}

/**
 * Hook to get just the privacy mode state (boolean)
 * Useful when you only need to check if privacy mode is on/off
 */
export function useIsPrivacyMode(): boolean {
  const { isPrivacyMode } = usePrivacyMode();
  return isPrivacyMode;
}

export { PrivacyModeContext };
