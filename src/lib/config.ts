import { RuntimeConfig } from './runtimeConfig';

/**
 * In-memory cache for runtime config
 */
let runtimeConfigCache: RuntimeConfig | null = null;
let runtimeConfigFetched = false;

/**
 * Priority: Runtime Config → process.env → default
 */
export const config = {
  // Blockchain Configuration
  get chainId(): string {
    if (runtimeConfigCache?.chainId) return runtimeConfigCache.chainId;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.chainId) {
      return (window as any).__RUNTIME_CONFIG__.chainId;
    }
    return process.env.NEXT_PUBLIC_CHAINID || '17771';
  },

  get chainName(): string {
    if (runtimeConfigCache?.chainName) return runtimeConfigCache.chainName;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.chainName) {
      return (window as any).__RUNTIME_CONFIG__.chainName;
    }
    return process.env.NEXT_PUBLIC_CHAIN_NAME || 'DMD Diamond';
  },

  get rpcUrl(): string {
    if (runtimeConfigCache?.rpcUrl) return runtimeConfigCache.rpcUrl;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.rpcUrl) {
      return (window as any).__RUNTIME_CONFIG__.rpcUrl;
    }
    return process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.bit.diamonds/';
  },

  get wsUrl(): string {
    if (runtimeConfigCache?.wsUrl) return runtimeConfigCache.wsUrl;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.wsUrl) {
      return (window as any).__RUNTIME_CONFIG__.wsUrl;
    }
    return process.env.NEXT_PUBLIC_WS_URL || 'wss://rpc.bit.diamonds/ws';
  },

  get explorerUrl(): string {
    if (runtimeConfigCache?.explorerUrl) return runtimeConfigCache.explorerUrl;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.explorerUrl) {
      return (window as any).__RUNTIME_CONFIG__.explorerUrl;
    }
    return process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.bit.diamonds/';
  },

  // Contract Addresses
  get claimingContractAddress(): string {
    if (runtimeConfigCache?.claimingContractAddress) return runtimeConfigCache.claimingContractAddress;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.claimingContractAddress) {
      return (window as any).__RUNTIME_CONFIG__.claimingContractAddress;
    }
    return process.env.NEXT_PUBLIC_CLAIMING_CONTRACT_ADDRESS || '';
  },

  get aggregatorContractAddress(): string {
    if (runtimeConfigCache?.aggregatorContractAddress) return runtimeConfigCache.aggregatorContractAddress;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.aggregatorContractAddress) {
      return (window as any).__RUNTIME_CONFIG__.aggregatorContractAddress;
    }
    return process.env.NEXT_PUBLIC_AGGREGATOR_CONTRACT_ADDRESS || 
           process.env.NEXT_PUBLIC_AGGREGATOR_CONTRACT_ADDRESS || 
           '0x9990000000000000000000000000000000000000';
  },

  get daoContractAddress(): string {
    if (runtimeConfigCache?.daoContractAddress) return runtimeConfigCache.daoContractAddress;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.daoContractAddress) {
      return (window as any).__RUNTIME_CONFIG__.daoContractAddress;
    }
    return process.env.NEXT_PUBLIC_DAO_CONTRACT_ADDRESS || '0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0';
  },

  get lowMajorityContractAddress(): string {
    if (runtimeConfigCache?.lowMajorityContractAddress) return runtimeConfigCache.lowMajorityContractAddress;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.lowMajorityContractAddress) {
      return (window as any).__RUNTIME_CONFIG__.lowMajorityContractAddress;
    }
    return process.env.NEXT_PUBLIC_LOW_MAJORITY_CONTRACT_ADDRESS || '';
  },

  get diamondRegistryContractAddress(): string {
    if (runtimeConfigCache?.diamondRegistryContractAddress) {
      return runtimeConfigCache.diamondRegistryContractAddress;
    }
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.diamondRegistryContractAddress) {
      return (window as any).__RUNTIME_CONFIG__.diamondRegistryContractAddress;
    }
    return process.env.NEXT_PUBLIC_DIAMOND_REGISTRY_CONTRACT_ADDRESS || '';
  },

  // WalletConnect
  get wcProjectId(): string {
    if (runtimeConfigCache?.wcProjectId) return runtimeConfigCache.wcProjectId;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.wcProjectId) {
      return (window as any).__RUNTIME_CONFIG__.wcProjectId;
    }
    return process.env.NEXT_PUBLIC_WC_PROJECT_ID || '2cceb4f25f1cb889b967ea3c40bfd7cd';
  },

  // Application Settings
  get reportEmail(): string {
    if (runtimeConfigCache?.reportEmail) return runtimeConfigCache.reportEmail;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.reportEmail) {
      return (window as any).__RUNTIME_CONFIG__.reportEmail;
    }
    return process.env.NEXT_PUBLIC_REPORT_EMAIL || '';
  },

  get siteUrl(): string {
    if (runtimeConfigCache?.siteUrl) return runtimeConfigCache.siteUrl;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.siteUrl) {
      return (window as any).__RUNTIME_CONFIG__.siteUrl;
    }
    return process.env.NEXT_PUBLIC_SITE_URL || '';
  },

  get port(): string {
    if (runtimeConfigCache?.port) return runtimeConfigCache.port;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.port) {
      return (window as any).__RUNTIME_CONFIG__.port;
    }
    return process.env.NEXT_PUBLIC_PORT || '3000';
  },

  // Debug Settings
  get debugTx(): string {
    if (runtimeConfigCache?.debugTx) return runtimeConfigCache.debugTx;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.debugTx) {
      return (window as any).__RUNTIME_CONFIG__.debugTx;
    }
    return process.env.NEXT_PUBLIC_DEBUG_TX || '0';
  },

  get debugTxLevel(): string {
    if (runtimeConfigCache?.debugTxLevel) return runtimeConfigCache.debugTxLevel;
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.debugTxLevel) {
      return (window as any).__RUNTIME_CONFIG__.debugTxLevel;
    }
    return process.env.NEXT_PUBLIC_DEBUG_TX_LEVEL || '0';
  },
};

/**
 * Initialize runtime config from the API
 */
export function setRuntimeConfig(runtimeConfig: RuntimeConfig | null): void {
  runtimeConfigCache = runtimeConfig;
  runtimeConfigFetched = true;
  
  // Also set on window for global access
  if (typeof window !== 'undefined' && runtimeConfig) {
    (window as any).__RUNTIME_CONFIG__ = runtimeConfig;
  }
}

/**
 * Check if runtime config is available
 */
export function hasRuntimeConfig(): boolean {
  return runtimeConfigCache !== null || 
         (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__ !== undefined);
}

/**
 * Get the current config source (for debugging)
 */
export function getConfigSource(): 'runtime' | 'env' {
  return hasRuntimeConfig() ? 'runtime' : 'env';
}

/**
 * get config value with type conversion
 */
export function getNumberConfig(key: keyof typeof config, defaultValue: number = 0): number {
  const value = config[key];
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

export default config;
