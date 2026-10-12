'use client';

import Web3 from "web3";
import BigNumber from "bignumber.js";
import { toast } from 'react-toastify';
import Loader from "@/components/Loader";
import { useAccount, useDisconnect } from "wagmi";
import { UserWallet } from "@/contexts/types/wallet";
import { CURR_VERSION_INFO } from "@/constants/version";
import { switchChain, watchAccount } from '@wagmi/core';
import { useWalletConnect } from "@/contexts/WalletConnect";
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ContractManager } from "@/contexts/services/contractManager";
import { wagmiConfig } from "@/contexts/WalletConnect/config/wagmi";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { validateRpcUrl } from "@/utils/rpc";
import { getRPC, saveRPC, clearRPC } from "@/utils/storage";
import { checkProviderHealth, getGasPriceSafe, isEip1193Provider } from "../../utils/providerHealth";
import config from '@/lib/config';
import logger from '@/utils/logger';

import {
  BlockRewardHbbft,
  BonusScoreSystem,
  CertifierHbbft,
  ConnectivityTrackerHbbft,
  DiamondDao,
  DMDAggregator,
  DMDRegistrarController,
  DMDNames,
  StakingHbbft,
  TxPermissionHbbft,
  ValidatorSetHbbft,
} from "@/contracts/types";

interface ContractsState {
  contracts: ContractManager;
  vsContract: ValidatorSetHbbft;
  stContract?: StakingHbbft;
  brContract?: BlockRewardHbbft;
  daoContract: DiamondDao;
  crContract?: CertifierHbbft;
  tpContract?: TxPermissionHbbft;
  ctContract?: ConnectivityTrackerHbbft;
  aggregator?: DMDAggregator;
  bsContract?: BonusScoreSystem;
  diamondRegistryContract?: DMDRegistrarController;
  diamondNamesContract?: DMDNames;
}

interface Web3ContextProps {
  web3: Web3;
  readonlyWeb3: Web3;
  userWallet: UserWallet;
  contractsManager: ContractsState;
  web3Initialized: boolean;

  setUserWallet: (newUserWallet: UserWallet) => void;
  setContractsManager: (newContractsManager: ContractsState) => void;
  ensureWalletConnection: () => boolean;
  retryWalletConnection: () => Promise<void>;
  showLoader: (loading: boolean, loadingMsg: string) => void;
  getUpdatedBalance: () => Promise<BigNumber>;
  updateWalletBalance: () => Promise<void>;
  ensureProviderReady: () => Promise<boolean>;
  applyCustomRpc: (url: string) => Promise<{ ok: boolean; message?: string }>;
  resetToDefaultRpc: () => Promise<void>;
  getGasPriceSafe: () => Promise<string>;
}

const Web3Context = createContext<Web3ContextProps | undefined>(undefined);

const Web3ContextProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { disconnect } = useDisconnect();
  const { close } = useWalletConnect();
  const { connector, isConnected, status } = useAccount();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const loaderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [web3Initialized, setWeb3Initialized] = useState<boolean>(false);

  // Initialize Web3 with CustomHttpProvider
  const chainId = config.chainId || '17771';
  /**
   * The URL is determined using the following precedence:
   * 1. The value stored under the "rpcUrl" key in localStorage.
   * 2. Runtime config from /api/config (Docker) or process.env (local dev)
   * 3. A default URL ("https://testnet-rpc.bit.diamonds/") if neither of the above is available.
   */
  // Prefer cookie/localStorage via storage util, then hybrid config
  const rpcUrl = getRPC() || config.rpcUrl;
  const [wagmiConnector, setWagmiConnector] = useState<WalletConnectProvider | null>(null);
  // Wallet-connected for signing
  const [web3, setWeb3] = useState<Web3>(new Web3(rpcUrl));
  // Stable HTTP RPC for reads only
  const [readonlyWeb3, setReadonlyWeb3] = useState<Web3>(new Web3(rpcUrl));

  const [userWallet, setUserWallet] = useState<UserWallet>(new UserWallet("", new BigNumber(0)));
  const initialContracts = new ContractManager(web3);
  const [contractsManager, setContractsManager] = useState<ContractsState>({
    contracts: initialContracts,
    vsContract: initialContracts.getValidatorSetHbbft(),
    daoContract: initialContracts.getDaoContract()
  });

  useEffect(() => {
    if (connector?.getProvider && isConnected && status === 'connected') {
      connectAndInitialize(connector);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector, isConnected, status]);

  useEffect(() => {
    logger.log("[INFO] Initializing Web3 Context");
    initialize();
    handleCacheReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach basic EIP-1193 event listeners when using a wallet provider
  useEffect(() => {
    const provider: any = (web3 as any)?.currentProvider;
    if (provider && isEip1193Provider(provider)) {
      const onAccountsChanged = async (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          // Switch back to readonly RPC for stability
          setUserWallet(new UserWallet("", new BigNumber(0)));
          setWeb3(readonlyWeb3);
        } else {
          await connectAndInitialize(wagmiConnector || { getProvider: async () => provider, disconnect: async () => {}, name: provider?.name });
        }
      };
      const onChainChanged = async (_chainId: string) => {
        // Force refresh of contracts and wallet balance on network change
        try {
          const cid = await web3.eth.getChainId();
          if (cid !== Number(chainId)) {
            toast.warn("Wrong network. Please switch to DMD Network.");
          }
          await reinitializeContractsWithProvider(web3);
          await updateWalletBalance();
        } catch (err) {
          logger.warn('[Provider] chainChanged handling error', err);
        }
      };
      const onDisconnect = () => {
        // Fall back to readonly provider to keep UI responsive
        setUserWallet(new UserWallet("", new BigNumber(0)));
        setWeb3(readonlyWeb3);
      };

      provider.on?.('accountsChanged', onAccountsChanged);
      provider.on?.('chainChanged', onChainChanged);
      provider.on?.('disconnect', onDisconnect);

      return () => {
        provider.removeListener?.('accountsChanged', onAccountsChanged);
        provider.removeListener?.('chainChanged', onChainChanged);
        provider.removeListener?.('disconnect', onDisconnect);
      };
    }
  }, [web3, readonlyWeb3, wagmiConnector]);

  useEffect(() => {
    if (wagmiConnector) {
      const unwatch = watchAccount(wagmiConfig, {
        onChange(account) { 
          if (account.address) {
            connectAndInitialize(wagmiConnector);
          } else {
            window.location.reload();
          }
        },
      })
    
      return () => {
        unwatch()
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagmiConnector]);

  // Provider monitor - if connected wallet becomes unresponsive, try refreshing
  useEffect(() => {
    let timer: any;
    let consecutiveFailures = 0;
    const start = () => {
      if (!userWallet?.myAddr) return; // only when connected
      timer = setInterval(async () => {
        try {
          const { ok } = await checkProviderHealth(web3, { expectedChainId: Number(chainId), timeoutMs: 4000 });
          if (!ok) {
            consecutiveFailures += 1;
            if (consecutiveFailures >= 2) {
              // Attempt a silent refresh via connector
              if (wagmiConnector?.getProvider) {
                try {
                  const p = await wagmiConnector.getProvider();
                  const next = new Web3(p);
                  setWeb3(next);
                  await reinitializeContractsWithProvider(next);
                  consecutiveFailures = 0;
                } catch (e) {
                  logger.warn('[Provider] auto-refresh failed', e);
                }
              }
            }
          } else {
            consecutiveFailures = 0;
          }
        } catch {}
      }, 30000); // 30s
    };
    start();
    return () => {
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userWallet.myAddr, web3, wagmiConnector]);

  const initialize = async () => {
    if (!web3Initialized) {
      await initialzeContracts(initialContracts);
      setWeb3Initialized(true);
    }
  }

  const handleCacheReset = () => {
    const CURRENT_APP_VERSION = CURR_VERSION_INFO.version;
    const SHOULD_RESET_CACHE = CURR_VERSION_INFO.reset;
    const storedAppVersion = localStorage.getItem('appVersion');

    if (storedAppVersion !== CURRENT_APP_VERSION) {
      if (SHOULD_RESET_CACHE) {
        localStorage.clear();
        logger.log('[INFO] Cache cleared due to app version update');
      }
      localStorage.setItem('appVersion', CURRENT_APP_VERSION);
    }
  };

  const LOADER_TIMEOUT_MS = 120000;

  const clearLoaderTimeout = () => {
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
  };

  const showLoader = (loading: boolean, loadingMsg: string) => {
    clearLoaderTimeout();
    setIsLoading(loading);
    setLoadingMessage(loadingMsg);

    if (loading) {
      loaderTimeoutRef.current = setTimeout(() => {
        loaderTimeoutRef.current = null;
        setIsLoading(false);
        setLoadingMessage("");
        toast.info("Still waiting on a response. Check your wallet — the request may not have reached it.");
      }, LOADER_TIMEOUT_MS);
    }
  }

  const dismissLoader = () => {
    clearLoaderTimeout();
    setIsLoading(false);
    setLoadingMessage("");
  }

  useEffect(() => clearLoaderTimeout, []);

  const reinitializeContractsWithProvider = async (provider: Web3) => {
    await initialzeContracts(new ContractManager(provider));
  }

  const initialzeContracts = async (contractManager: ContractManager) => {
    try {
      const [
        vsContract,
        daoContract,
        stContract,
        crContract,
        tpContract,
        brContract,
        ctContract,
        aggregator,
        bsContract,
      ] = await Promise.all([
        contractManager.getValidatorSetHbbft(),
        contractManager.getDaoContract(),
        contractManager.getStakingHbbft(),
        contractManager.getCertifierHbbft(),
        contractManager.getContractPermission(),
        contractManager.getRewardHbbft(),
        contractManager.getConnectivityTracker(),
        contractManager.getDMDAggregator(),
        contractManager.getBonusScoreSystem(),
      ]);

      const diamondRegistryContract = config.diamondRegistryContractAddress
        ? contractManager.getDiamondRegistry()
        : undefined;

      const diamondNamesContract = diamondRegistryContract
        ? await contractManager.getDiamondNames().catch(() => undefined)
        : undefined;

      setContractsManager({
        contracts: contractManager,
        vsContract,
        stContract,
        brContract,
        daoContract,
        crContract,
        tpContract,
        ctContract,
        aggregator,
        bsContract,
        diamondRegistryContract,
        diamondNamesContract,
      });
    } catch (error: any) {
      toast.warn(`${error.message}`);
    }
  };

  const applyCustomRpc = async (url: string) => {
    showLoader(true, "Validating RPC endpoint...");
    const res = await validateRpcUrl(url, { expectedChainId: Number(chainId) });
    if (!res.ok) {
      showLoader(false, "");
      return { ok: false, message: res.error?.message || "Invalid RPC" };
    }
    // Save to storage
    const stored = saveRPC(url);
    if (!stored) {
      showLoader(false, "");
      return { ok: false, message: "Failed to save RPC to storage" };
    }
    // Reinitialize provider/contracts
    const httpProvider = new Web3(url);
    setReadonlyWeb3(httpProvider);
    const cp: any = (web3 as any)?.currentProvider;
    if (!cp || !isEip1193Provider(cp)) {
      setWeb3(httpProvider);
      await reinitializeContractsWithProvider(httpProvider);
    }
    showLoader(false, "");
    return { ok: true };
  };

  const resetToDefaultRpc = async () => {
    showLoader(true, "Resetting RPC...");
    clearRPC();
    const defaultUrl = config.rpcUrl;
    const httpProvider = new Web3(defaultUrl);
    setReadonlyWeb3(httpProvider);
    const cp: any = (web3 as any)?.currentProvider;
    if (!cp || !isEip1193Provider(cp)) {
      setWeb3(httpProvider);
      await reinitializeContractsWithProvider(httpProvider);
    }
    showLoader(false, "");
  };

  const InitializeWagmiWallet = async (connector: any) => {
    try {
      const walletProvider: any = await connector.getProvider();
      const provider = new Web3(walletProvider);

      const isCoinbaseSdk = connector.id === 'coinbaseWalletSDK' || connector.type === 'coinbaseWallet';
      const isCoinbaseExtension =
        walletProvider?.connectionType === 'extension_connection_type' ||
        Boolean(walletProvider?.isCoinbaseBrowser) ||
        walletProvider?.providerInfo?.type === 'coinbasewallet';

      // Check if it's specifically a Coinbase Smart Wallet (keys.coinbase.com)
      const isCoinbaseSmartWallet = isCoinbaseSdk && !isCoinbaseExtension;

      if (isCoinbaseSmartWallet) {
        showLoader(false, "");
        await connector.disconnect();
        disconnect();
        return toast.warn("Smart Wallet is not supported. Please use the Coinbase Wallet extension.");
      }

      // Check if the user is on the correct network, if not switch to the desired network
      if (await provider.eth.getChainId() !== Number(chainId)) {
        try {
          showLoader(true, "Please connect to the DMD Network");
          await switchChain(wagmiConfig, { chainId: Number(chainId) });
          showLoader(false, "");
        } catch (err: any) {
          // Error 4902: Chain not added to wallet yet
          if (err.code === 4902) {
            try {
              showLoader(true, "Adding DMD Network to your wallet...");
              const rawProvider = await connector.getProvider();
              
              // Add the chain to wallet using wallet_addEthereumChain
              await rawProvider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${Number(chainId).toString(16)}`,
                  chainName: config.chainName || 'DMD Diamond',
                  nativeCurrency: {
                    name: 'DMD',
                    symbol: 'DMD',
                    decimals: 18
                  },
                  rpcUrls: [config.rpcUrl],
                  blockExplorerUrls: [config.explorerUrl]
                }]
              });
              
              showLoader(false, "");
              toast.success("DMD Network added successfully!");
            } catch (addError: any) {
              logger.error("[Wallet Connect] Failed to add chain", addError);
              showLoader(false, "");
              await connector.disconnect();
              disconnect();
              return toast.warn("Failed to add DMD Network. Please add it manually to continue.");
            }
          } else if (err.code === 4001) {
            // User rejected the request
            showLoader(false, "");
            await connector.disconnect();
            disconnect();
            return toast.warn("Please connect to the DMD Network to continue");
          } else {
            logger.error("[Wallet Connect] Error", err);
            showLoader(false, "");
            throw err;
          }
        }
      }

      close();

      // Retrieve the wallet address
      const walletAddress = (await provider.eth.getAccounts())[0];

      // Fetch the wallet balance
      const myBalance = new BigNumber(await provider.eth.getBalance(walletAddress));
      const wallet = new UserWallet(provider.utils.toChecksumAddress(walletAddress), myBalance);

      // Set the wallet and provider in the app state
      setWeb3(provider);
      setUserWallet(wallet);
      setWagmiConnector(connector);
      reinitializeContractsWithProvider(provider);
        
      return { provider, wallet };
    } catch (err) {
      logger.error("[Wallet Connect] Initialization error", err);
      throw err;
    }
  }

  /**
   * Fully tear down the wallet session so app state and the reown/wagmi
   * connection can't drift apart. Falls back to the read-only provider so the
   * app stays usable.
   */
  const resetWalletSession = async (activeConnector?: any) => {
    try { await activeConnector?.disconnect?.(); } catch {}
    try { disconnect(); } catch { /* not connected */ }
    setUserWallet(new UserWallet("", new BigNumber(0)));
    setWagmiConnector(null);
    setWeb3(readonlyWeb3);
    showLoader(false, "");
  };

  /**
   * Connect + initialize with one silent retry.
   * if the retry also fails the session is reset and the user is asked to retry.
   */
  const connectAndInitialize = async (connector: any, allowRetry = true): Promise<any> => {
    try {
      return await InitializeWagmiWallet(connector);
    } catch (err) {
      logger.error("[Wallet Connect] Initialization failed", err);
      if (allowRetry) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return connectAndInitialize(connector, false);
      }
      await resetWalletSession(connector);
      toast.error("Wallet connection failed. Please try again.", { toastId: "wallet-connect-failed" });
      return undefined;
    }
  };

  /**
   * Re-runs init on the existing connector; used by
   * the header so the reown Disconnect modal is never the recovery path.
   */
  const retryWalletConnection = async () => {
    if (connector?.getProvider) {
      showLoader(true, "Reconnecting wallet...");
      await connectAndInitialize(connector);
      showLoader(false, "");
    } else {
      await resetWalletSession(connector);
    }
  };

  const updateWalletBalance = async () => {
    if (!userWallet || !web3) return;

    const myBalance = new BigNumber(await web3.eth.getBalance(userWallet.myAddr));
    setUserWallet({ ...userWallet, myBalance });
  }

  const ensureWalletConnection = (): boolean => {
    if (!userWallet.myAddr) {
      toast.warn("Please connect your wallet first");
      return false;
    }
    return true;
  }

  // Validate wallet provider health before any transaction
  const ensureProviderReady = async (): Promise<boolean> => {
    try {
      // Is provider healthy?
      const { ok, reason } = await checkProviderHealth(web3, { expectedChainId: Number(chainId) });
      if (ok) return true;

      logger.log('[Provider] Health check failed:', reason);

      // Try refreshing via connector
      if (wagmiConnector?.getProvider) {
        logger.log('[Provider] Attempting auto-refresh via connector...');
        try {
          const p = await wagmiConnector.getProvider();
          const next = new Web3(p);
          setWeb3(next);
          await reinitializeContractsWithProvider(next);
          
          // Recheck after refresh
          const recheck = await checkProviderHealth(next, { expectedChainId: Number(chainId) });
          if (recheck.ok) {
            logger.log('[Provider] Auto-refresh successful!');
            toast.success('Wallet connection restored');
            return true;
          }
          logger.log('[Provider] Auto-refresh failed, still unhealthy');
        } catch (refreshErr) {
          logger.warn('[Provider] Auto-refresh error:', refreshErr);
        }
      }

      // If no accounts, prompt user to reconnect
      if (reason?.includes('No accounts') || reason?.includes('not ready')) {
        toast.error('Wallet connection lost, please reconnect after refresh', { autoClose: 4000 });
        // Disconnect after a short delay to allow user to read the message
        setTimeout(() => {
          logger.log('[Provider] Auto-disconnecting stale wallet');
          disconnect();
          close();
        }, 5000); // 5 seconds
        return false;
      }

      // If wrong chain
      if (reason?.includes('chain')) {
        toast.error(reason, { autoClose: 7000 });
        return false;
      }

      // Force disconnect and reconnect
      toast.error('Wallet provider unresponsive, please reconnect after refresh', { autoClose: 4000 });
      setTimeout(() => {
        logger.log('[Provider] Auto-disconnecting unresponsive wallet');
        disconnect();
        close();
      }, 5000); // 5 seconds
      return false;
    } catch (err) {
      logger.warn('[Provider] readiness check failed', err);
      toast.error('Wallet connection error. Please disconnect and reconnect your wallet.', { autoClose: 5000 });
      return false;
    }
  };

  const getUpdatedBalance = async (): Promise<BigNumber> => {
    if (!userWallet || !web3) return new BigNumber(0);

    const myBalance = new BigNumber(await web3.eth.getBalance(userWallet.myAddr));
    setUserWallet({ ...userWallet, myBalance });
    return myBalance;
  }

  // Provide a safe way to fetch gas price with fallback to HTTP RPC
  const getGasPriceSafeFn = async (): Promise<string> => {
    return getGasPriceSafe(web3, readonlyWeb3);
  };

  const contextValue = {
    // state
    web3,
    readonlyWeb3,
    userWallet,
    web3Initialized,
    contractsManager,

    // state functions
    setUserWallet: (newUserWallet: UserWallet) => setUserWallet(newUserWallet),  // Set the new userWallet state
    setContractsManager,  // Set the new contractsManager state

    // other functions
    showLoader,
    getUpdatedBalance,
    updateWalletBalance,
    ensureWalletConnection,
    retryWalletConnection,
    ensureProviderReady,
    applyCustomRpc,
    resetToDefaultRpc,
    getGasPriceSafe: getGasPriceSafeFn
  };

  return (
    <Web3Context.Provider value={contextValue}>
      <Loader isLoading={isLoading} loadingMessage={loadingMessage} onDismiss={dismissLoader}/>
      {children}
    </Web3Context.Provider>
  );
};

const useWeb3Context = (): Web3ContextProps => {
  const context = useContext(Web3Context);

  if (context === undefined) {
    throw new Error("Couldn't fetch Web3 Context");
  }

  return context;
};

export { Web3ContextProvider, useWeb3Context };
