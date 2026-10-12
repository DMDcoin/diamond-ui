'use client';

/**
 * usePrivacyFetch Hook
 * Conditional data fetching hook that respects privacy mode
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsPrivacyMode } from '@/contexts/PrivacyMode';
import logger from '@/utils/logger';
import type {
  UsePrivacyFetchOptions,
  UsePrivacyFetchResult,
  FetcherFunction,
} from '@/types/privacyMode';

/**
 * Custom hook for data fetching that respects privacy mode
 * In privacy mode: only calls blockchainFetcher
 * In normal mode: calls apiFetcher with optional blockchain fallback
 * 
 * @param apiFetcher - Function to fetch from API
 * @param blockchainFetcher - Function to fetch from blockchain (fallback)
 * @param options - Configuration options
 * @returns Fetch result with data, loading, error states
 */
export function usePrivacyFetch<T>(
  apiFetcher: FetcherFunction<T>,
  blockchainFetcher: FetcherFunction<T>,
  options: UsePrivacyFetchOptions = {}
): UsePrivacyFetchResult<T> {
  const {
    skip = false,
    refetchInterval,
    refetchOnFocus = false,
    refetchOnReconnect = false,
  } = options;

  const isPrivacyMode = useIsPrivacyMode();
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!skip);
  const [isFetching, setIsFetching] = useState<boolean>(!skip);
  const [error, setError] = useState<Error | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  /**
   * Core fetch function
   */
  const fetchData = useCallback(async () => {
    if (skip) return;

    setIsFetching(true);
    
    try {
      let result: T;
      
      if (isPrivacyMode) {
        // Privacy mode ON - only use blockchain
        result = await blockchainFetcher();
      } else {
        // Privacy mode OFF - try API first, fallback to blockchain
        try {
          result = await apiFetcher();
        } catch (apiError) {
          logger.warn('API fetch failed, falling back to blockchain:', apiError);
          result = await blockchainFetcher();
        }
      }
      
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        setIsLoading(false);
        logger.error('Fetch error:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, [apiFetcher, blockchainFetcher, isPrivacyMode, skip]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (!skip) {
      fetchData();
    }
  }, [fetchData, skip]);

  // Setup refetch interval
  useEffect(() => {
    if (skip || !refetchInterval) return;

    intervalRef.current = setInterval(() => {
      fetchData();
    }, refetchInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refetchInterval, skip]);

  // Setup refetch on window focus
  useEffect(() => {
    if (skip || !refetchOnFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, refetchOnFocus, skip]);

  // Setup refetch on network reconnect
  useEffect(() => {
    if (skip || !refetchOnReconnect) return;

    const handleOnline = () => {
      fetchData();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchData, refetchOnReconnect, skip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    isPrivacyMode,
    isFetching,
    refetch,
  };
}

/**
 * Simplified version that only returns data and loading state
 */
export function usePrivacyData<T>(
  apiFetcher: FetcherFunction<T>,
  blockchainFetcher: FetcherFunction<T>,
  skip?: boolean
): { data: T | null; isLoading: boolean } {
  const { data, isLoading } = usePrivacyFetch(apiFetcher, blockchainFetcher, { skip });
  return { data, isLoading };
}
