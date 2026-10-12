import logger from '@/utils/logger';

/**
 * LocalStorage key for privacy mode state
 */
export const PRIVACY_MODE_STORAGE_KEY = 'dmd-privacy-mode';

/**
 * Default state for privacy mode (OFF by default)
 */
export const DEFAULT_PRIVACY_MODE_STATE = false;

let cachedPrivacyModeState: boolean | null = null;

/**
 * Check if privacy mode is currently active
 * Works outside React components by reading directly from localStorage
 * @returns {boolean} True if privacy mode is active, false otherwise
 */
export function isPrivacyModeActive(): boolean {
  // Use cached state if available
  if (cachedPrivacyModeState !== null) {
    return cachedPrivacyModeState;
  }

  // Only access localStorage on client side
  if (typeof window === 'undefined') {
    return DEFAULT_PRIVACY_MODE_STATE;
  }

  try {
    const stored = localStorage.getItem(PRIVACY_MODE_STORAGE_KEY);
    cachedPrivacyModeState = stored === 'true';
    return cachedPrivacyModeState;
  } catch (error) {
    logger.warn('Failed to read privacy mode from localStorage:', error);
    return DEFAULT_PRIVACY_MODE_STATE;
  }
}

/**
 * Set privacy mode state in localStorage
 * @param {boolean} value - New privacy mode state
 */
export function setPrivacyModeStorage(value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, value.toString());
    cachedPrivacyModeState = value;
  } catch (error) {
    logger.warn('Failed to save privacy mode to localStorage:', error);
  }
}

/**
 * Get privacy mode state from localStorage
 * @returns {boolean} Current privacy mode state
 */
export function getPrivacyModeStorage(): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_PRIVACY_MODE_STATE;
  }

  try {
    const stored = localStorage.getItem(PRIVACY_MODE_STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    logger.warn('Failed to read privacy mode from localStorage:', error);
    return DEFAULT_PRIVACY_MODE_STATE;
  }
}

/**
 * Clear the cached privacy mode state
 */
export function clearPrivacyModeCache(): void {
  cachedPrivacyModeState = null;
}

/**
 * Initialize privacy mode state from localStorage on app startup
 */
export function initializePrivacyMode(): boolean {
  const state = getPrivacyModeStorage();
  cachedPrivacyModeState = state;
  return state;
}

/**
 * Check if an API call should be made based on privacy mode
 * @returns {boolean} True if API calls are allowed, false otherwise
 */
export function shouldAllowApiCalls(): boolean {
  return !isPrivacyModeActive();
}

/**
 * Utility to conditionally execute API or blockchain fetcher
 * @param apiFetcher - Function to call for API data
 * @param blockchainFetcher - Function to call for blockchain data
 * @returns Promise resolving to the appropriate data
 */
export async function conditionalFetch<T>(
  apiFetcher: () => Promise<T>,
  blockchainFetcher: () => Promise<T>
): Promise<T> {
  if (shouldAllowApiCalls()) {
    try {
      return await apiFetcher();
    } catch (error) {
      // Fallback to blockchain if API fails
      logger.warn('API fetch failed, falling back to blockchain:', error);
      return await blockchainFetcher();
    }
  } else {
    // Privacy mode is ON - only use blockchain
    return await blockchainFetcher();
  }
}
