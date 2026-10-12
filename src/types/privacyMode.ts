import { ReactNode } from 'react';

/**
 * Placeholder style options for PrivacyModeGuard
 */
export type PrivacyPlaceholderType = 'skeleton' | 'blur' | 'hidden' | 'redacted' | 'custom';

/**
 * Props for the PrivacyModeGuard component
 */
export interface PrivacyModeGuardProps {
  /** The actual content to display when privacy mode is OFF */
  children: ReactNode;
  
  /** Optional fallback content when privacy mode is ON */
  fallback?: ReactNode;
  
  /** Type of placeholder to show in privacy mode */
  placeholder?: PrivacyPlaceholderType;
  
  /** Custom placeholder element (only used if placeholder is 'custom') */
  customPlaceholder?: ReactNode;
  
  /** Label text for tooltips/accessibility */
  label?: string;
  
  /** Optional className for styling */
  className?: string;
}

/**
 * Privacy Mode context state
 */
export interface PrivacyModeState {
  /** Whether privacy mode is currently active */
  isPrivacyMode: boolean;
  
  /** Toggle privacy mode on/off (triggers page reload) */
  togglePrivacyMode: () => void;
}

/**
 * Privacy Mode Context Provider props
 */
export interface PrivacyModeProviderProps {
  children: ReactNode;
}

/**
 * Options for usePrivacyFetch hook
 */
export interface UsePrivacyFetchOptions {
  /** Skip fetching entirely */
  skip?: boolean;
  
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
  
  /** Enable automatic refetch on window focus */
  refetchOnFocus?: boolean;
  
  /** Enable automatic refetch on network reconnect */
  refetchOnReconnect?: boolean;
}

/**
 * Return type for usePrivacyFetch hook
 */
export interface UsePrivacyFetchResult<T> {
  /** The fetched data */
  data: T | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Whether privacy mode is currently active */
  isPrivacyMode: boolean;
  
  /** Whether the data is currently being fetched */
  isFetching: boolean;
  
  /** Manually refetch the data */
  refetch: () => Promise<void>;
}

/**
 * Fetcher function type for usePrivacyFetch
 */
export type FetcherFunction<T> = () => Promise<T>;

/**
 * HOC props type
 */
export interface WithPrivacyModeProps {
  privacyMode?: PrivacyModeState;
}
