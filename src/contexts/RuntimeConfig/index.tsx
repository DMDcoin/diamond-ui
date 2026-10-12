'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getRuntimeConfig, RuntimeConfig } from '@/lib/runtimeConfig';
import { setRuntimeConfig as setGlobalConfig } from '@/lib/config';

interface RuntimeConfigContextType {
  config: RuntimeConfig | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const RuntimeConfigContext = createContext<RuntimeConfigContextType | undefined>(undefined);

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const runtimeConfig = await getRuntimeConfig();
      setConfig(runtimeConfig);
      // Also set in global config for non-React contexts
      setGlobalConfig(runtimeConfig);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // On error, still allow fallback to process.env
      setGlobalConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <RuntimeConfigContext.Provider 
      value={{ 
        config, 
        loading, 
        error, 
        refetch: fetchConfig 
      }}
    >
      {children}
    </RuntimeConfigContext.Provider>
  );
}

/**
 * Hook to access runtime configuration
 */
export function useRuntimeConfig() {
  const context = useContext(RuntimeConfigContext);
  if (context === undefined) {
    throw new Error('useRuntimeConfig must be used within RuntimeConfigProvider');
  }
  return context;
}
