'use client';

import Loader from '@/components/Loader';
import { useAppKit, createAppKit } from '@reown/appkit/react'
import React, { type ReactNode, useEffect, useState } from 'react'
import { wagmiAdapter, projectId, getNetworks } from './config/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cookieToInitialState, WagmiProvider, useAccount, useConnect, useDisconnect, type Config } from 'wagmi'
import { useRuntimeConfig } from '@/contexts/RuntimeConfig'
import logger from '@/utils/logger';

// Set up queryClient
const queryClient = new QueryClient()

const getMetadata = () => ({
  name: 'Diamond UI',
  icons: ['/favicon.ico'],
  url: typeof window !== 'undefined' ? window.location.origin : 'https://diamond-ui.vercel.app',
  description: 'Decentralized platform for DMD operations, offering tools for validator management, staking, DAO governance, and personalized user profiles to promote trust and stability in the DMD ecosystem.'
})

const excludeWalletIds = [
  "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393",
  "f323633c1f67055a45aac84e321af6ffe46322da677ffdd32f9bc1e33bafe29c"
]

// Supported wallet IDs
const supportedWalletIds = [
  "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // metamask
  "163d2cf19babf05eb8962e9748f9ebe613ed52ebf9c8107c9a0f104bfcf161b3", // brave
  "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // coinbase
]

let appKitInitialized = false

const initializeAppKit = () => {
  if (appKitInitialized) return

  try {
    const networks = getNetworks()
    
    // Create the modal
    createAppKit({
      adapters: [wagmiAdapter],
      projectId: projectId,
      networks: networks as any,
      defaultNetwork: networks[0] as any,
      metadata: getMetadata(),
      features: {
        analytics: false,
        swaps: false,
        onramp: false,
        email: false,
        socials: [],
        emailShowWallets: false
      },
      allowUnsupportedChain: true,
      enableCoinbase: false,
      enableEIP6963: true,
      enableInjected: true,
      featuredWalletIds: supportedWalletIds,
      includeWalletIds: supportedWalletIds,
      excludeWalletIds: excludeWalletIds,
      themeMode: "light",
      themeVariables: {
        "--w3m-accent": "#0145b2",
        "--w3m-color-mix": "#0145b2",
        "--w3m-color-mix-strength": 40,
        "--w3m-border-radius-master": "8px",
        "--w3m-font-family": "inherit",
        "--w3m-z-index": 1000
      },
      allWallets: "HIDE",
    })
    
    appKitInitialized = true
    return true
  } catch (error) {
    logger.error('❌ Failed to initialize AppKit:', error)
    return false
  }
}

interface WalletConnectProviderProps {
  children: ReactNode;
  cookies?: string | null;
}

export const WalletConnectProvider: React.FC<WalletConnectProviderProps> = ({ 
  children, 
  cookies 
}) => {
  // Wait for runtime config to load before initializing wallet connection
  const { config: runtimeConfig, loading: configLoading } = useRuntimeConfig()
  const [isAppKitReady, setIsAppKitReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  
  useEffect(() => {
    // Don't initialize until runtime config is loaded
    if (configLoading) {
      return
    }
    
    // Initialize AppKit on client side with loaded runtime config
    const success = initializeAppKit()
    if (success !== false) {
      // Small delay to ensure AppKit is fully ready
      const timer = setTimeout(() => {
        setIsAppKitReady(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setInitError('Failed to initialize wallet connection')
    }
  }, [configLoading])  // Re-run when config loading completes
  
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  // Show loading while runtime config is loading
  if (configLoading) {
    return <Loader isLoading={true} loadingMessage="Loading configuration..." />
  }

  // Show error if initialization failed
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600">{initError}</p>
          <p className="text-gray-600 text-sm mt-2">
            Please check your environment configuration
          </p>
        </div>
      </div>
    )
  }

  // Don't render children until AppKit is ready
  if (!isAppKitReady) {
    return (
      <Loader isLoading={true} loadingMessage={""}/>
    )
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export const useWalletConnect = () => {
  const { open, close } = useAppKit()
  const { disconnect } = useDisconnect()
  const { connect, connectors } = useConnect()
  const { address, isConnected, isConnecting, isDisconnected, status } = useAccount()
  

  return {
    // AppKit methods
    open,
    close,
    
    // Wagmi account info
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    status,
    
    // Connection methods
    connect,
    disconnect,
    connectors,
  }
}

export default WalletConnectProvider;
