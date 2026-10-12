/**
 * Runtime Configuration Manager
 */

import logger from '@/utils/logger';

export interface RuntimeConfig {
  // Blockchain Configuration
  chainId: string;
  chainName: string;
  rpcUrl: string;
  wsUrl: string;
  explorerUrl: string;
  
  // Contract Addresses
  claimingContractAddress: string;
  aggregatorContractAddress: string;
  daoContractAddress: string;
  lowMajorityContractAddress: string;
  diamondRegistryContractAddress: string;
  
  // WalletConnect
  wcProjectId: string;
  
  // Moderation
  reportEmail: string;

  // Application Settings
  siteUrl: string;
  port: string;
  
  // Debug Settings
  debugTx: string;
  debugTxLevel: string;
}

let cachedConfig: RuntimeConfig | null = null;
let configPromise: Promise<RuntimeConfig> | null = null;

/**
 * Fetches runtime configuration from the API endpoint
 * Uses caching to avoid repeated API calls
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  if (configPromise) {
    return configPromise;
  }

  configPromise = fetch('/api/config')
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch runtime configuration');
      }
      return res.json();
    })
    .then(config => {
      cachedConfig = config;
      configPromise = null;
      return config;
    })
    .catch(error => {
      logger.error('Error fetching runtime config:', error);
      configPromise = null;
      return getDefaultConfig();
    });

  return configPromise;
}

/**
 * Returns default configuration as fallback
 */
function getDefaultConfig(): RuntimeConfig {
  return {
    chainId: '',
    chainName: '',
    rpcUrl: '',
    wsUrl: '',
    explorerUrl: '',
    claimingContractAddress: '',
    aggregatorContractAddress: '',
    daoContractAddress: '',
    lowMajorityContractAddress: '',
    diamondRegistryContractAddress: '',
    wcProjectId: '2cceb4f25f1cb889b967ea3c40bfd7cd',
    reportEmail: '',
    siteUrl: '',
    port: '3000',
    debugTx: '0',
    debugTxLevel: '0',
  };
}

/**
 * Clears the cached configuration
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  configPromise = null;
}

/**
 * Gets a specific config value by key
 */
export async function getConfigValue<K extends keyof RuntimeConfig>(
  key: K
): Promise<RuntimeConfig[K]> {
  const config = await getRuntimeConfig();
  return config[key];
}
