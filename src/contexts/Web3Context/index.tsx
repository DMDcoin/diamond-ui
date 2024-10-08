import Web3 from "web3";
import Web3Modal from "web3modal";
import { useAccount } from "wagmi";
import BigNumber from "bignumber.js";
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import { ContextProviderProps } from "./types";
import { CURR_VERSION_INFO } from "../../constants";
import { UserWallet } from "../StakingContext/models/wallet";
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ContractManager } from "../StakingContext/models/contractManager";
import React, { createContext, useContext, useEffect, useState } from "react";
import { switchChain } from '@wagmi/core'


import {
  BlockRewardHbbft,
  BonusScoreSystem,
  CertifierHbbft,
  ConnectivityTrackerHbbft,
  DiamondDao,
  HbbftAggregator,
  StakingHbbft,
  TxPermissionHbbft,
  ValidatorSetHbbft,
} from "../contracts";
import { wagmiConfig } from "../WalletConnect/config";
import { useWalletConnectContext } from "../WalletConnect";

interface ContractsState {
  contracts: ContractManager;
  vsContract: ValidatorSetHbbft;
  stContract?: StakingHbbft;
  brContract?: BlockRewardHbbft;
  daoContract: DiamondDao;
  crContract?: CertifierHbbft;
  tpContract?: TxPermissionHbbft;
  ctContract?: ConnectivityTrackerHbbft;
  aggregator?: HbbftAggregator;
  bsContract?: BonusScoreSystem
}

interface Web3ContextProps {
  web3: Web3;
  userWallet: UserWallet;
  contractsManager: ContractsState;
  web3Initialized: boolean;

  connectWallet: () => Promise<{ provider: Web3; wallet: UserWallet } | undefined>;
  setUserWallet: (newUserWallet: UserWallet) => void;
  setContractsManager: (newContractsManager: ContractsState) => void;
  ensureWalletConnection: () => boolean;
  showLoader: (loading: boolean, loadingMsg: string) => void;
  getUpdatedBalance: () => Promise<BigNumber>;
}

const Web3Context = createContext<Web3ContextProps | undefined>(undefined);

const Web3ContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const { appKit } = useWalletConnectContext();
  const { connector, isConnected } = useAccount();

  useEffect(() => {
    if (connector && isConnected) {
      connectWalletWagmi(connector);
    }
  }, [connector, isConnected]);

  const connectWalletWagmi = async (connector: any) => {
    try {
      let provider = await connector.getProvider();
      provider = new Web3(provider);
      
      // Check if the user is on the correct network, if not switch to the desired network
      const chainIdHex = new Web3().utils.toHex(chainId);
      if (await provider.eth.getChainId() !== Number(chainId)) {
        try {
          await switchChain(wagmiConfig, { chainId: Number(chainId) });
        } catch (err: any) {
          if (err.code === 4001) {
            await connector.disconnect();
            return appKit.close();
          } else {
            console.error("[Wallet Connect] Error", err);
            return undefined;
          }
        }
      }

      appKit.close();

      // Retrieve the wallet address
      const walletAddress = (await provider.eth.getAccounts())[0];
  
      // Fetch the wallet balance
      const myBalance = new BigNumber(await provider.eth.getBalance(walletAddress));
      const wallet = new UserWallet(provider.utils.toChecksumAddress(walletAddress), myBalance);
  
      // Set the wallet and provider in the app state
      setWeb3(provider);
      setUserWallet(wallet);
      reinitializeContractsWithProvider(provider);
  
      return { provider, wallet };
    } catch (err) {
      console.error(err);
    }
  }

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [web3Initialized, setWeb3Initialized] = useState<boolean>(false);

  // Initialize Web3 with CustomHttpProvider
  const chainId = import.meta.env.VITE_APP_CHAINID || 777018;
  const rpcUrl = import.meta.env.VITE_APP_RPC_URL || 'https://alpha4.uniq.domains/rpc';
  const [web3, setWeb3] = useState<Web3>(new Web3(rpcUrl));
  const [web3ModalInstance, setWeb3ModalInstance] = useState<any>(null);
  const [accountChangeListener, setAccountChangeListener] = useState<any>(null);

  const [userWallet, setUserWallet] = useState<UserWallet>(new UserWallet("", new BigNumber(0)));
  const initialContracts = new ContractManager(web3);
  const [contractsManager, setContractsManager] = useState<ContractsState>({
    contracts: initialContracts,
    vsContract: initialContracts.getValidatorSetHbbft(),
    daoContract: initialContracts.getDaoContract()
  });

  useEffect(() => {
    console.log("[INFO] Initializing Web3 Context");
    initialize();
    handleCacheReset();
  }, []);

  useEffect(() => {
    // handle account change
    if (!accountChangeListener && web3ModalInstance) {
      const listener = (accounts: Array<string>) => {
        if (accounts && accounts.length === 0) {
          window.location.reload();
        } else {
          connectWallet();
        }
      };
      
      web3ModalInstance.on("accountsChanged", listener);
      setAccountChangeListener(listener);
  
      return () => {
        web3ModalInstance.off("accountsChanged", listener);
      };
    }
  }, [web3ModalInstance]);

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
        console.log('[INFO] Cache cleared due to app version update');
      }
      localStorage.setItem('appVersion', CURRENT_APP_VERSION);
    }
  };

  const showLoader = (loading: boolean, loadingMsg: string) => {
    setIsLoading(loading);
    setLoadingMessage(loadingMsg);
  }

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
        bsContract
      ] = await Promise.all([
        contractManager.getValidatorSetHbbft(),
        contractManager.getDaoContract(),
        contractManager.getStakingHbbft(),
        contractManager.getCertifierHbbft(),
        contractManager.getContractPermission(),
        contractManager.getRewardHbbft(),
        contractManager.getConnectivityTracker(),
        contractManager.getHbbftAggregator(),
        contractManager.getBonusScoreSystem()
      ]);
    
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
        bsContract
      });
    } catch (error: any) {
      toast.warn(`${error.message}`);
    }
  };

  const connectWallet = async () => {
    try {
      // Ensure MetaMask or WalletConnect are available
      if (typeof window.ethereum === 'undefined') {
        toast.warn('MetaMask is not installed. Please install it to continue.');
        return;
      }
  
      // Define WalletConnect V2 options
      const providerOptions = {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            projectId: '<YOUR_WALLETCONNECT_PROJECT_ID>',  // You'll need to get this from WalletConnect
            rpc: {
              [chainId]: rpcUrl, // RPC URLs for the desired chain
            },
            chains: [chainId],   // Array of chain IDs supported
          },
        },
      };
  
      // Initialize Web3Modal with WalletConnect v2 options
      const web3Modal = new Web3Modal({
        network: "mainnet",
        cacheProvider: false,
        providerOptions,
      });
  
      // Clear cache so on each connect it asks for wallet type
      web3Modal.clearCachedProvider();
  
      // Connect using Web3Modal
      const web3ModalInstance = await web3Modal.connect();
      setWeb3ModalInstance(web3ModalInstance);
  
      // Create a Web3 provider instance
      const provider = new Web3(web3ModalInstance);
  
      // Check if the user is on the correct network, if not switch to the desired network
      const chainIdHex = new Web3().utils.toHex(chainId);
      if (await web3ModalInstance.request({ method: 'eth_chainId' }) !== chainId) {
        try {
          await web3ModalInstance.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });
        } catch (err: any) {
          if (err.code === 4902) {
            // Chain not added yet, attempt to add it
            await web3ModalInstance.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainName: import.meta.env.VITE_APP_CHAIN_NAME || "DMD Diamond",
                  chainId: chainIdHex,
                  nativeCurrency: { name: "DMD", decimals: 18, symbol: "DMD" },
                  rpcUrls: [rpcUrl],
                  blockExplorerUrls: null,
                },
              ],
            });
          } else {
            console.error("[Wallet Connect] Error", err);
            return undefined;
          }
        }
      }
  
      // Retrieve the wallet address
      const walletAddress = (await web3ModalInstance.request({ method: 'eth_accounts' }))[0];
  
      // Fetch the wallet balance
      const myBalance = new BigNumber(await provider.eth.getBalance(walletAddress));
      const wallet = new UserWallet(provider.utils.toChecksumAddress(walletAddress), myBalance);
  
      // Set the wallet and provider in the app state
      setWeb3(provider);
      setUserWallet(wallet);
      reinitializeContractsWithProvider(provider);
  
      return { provider, wallet };
    } catch (err) {
      console.error("[Wallet Connect]", err);
    }
  };

  const ensureWalletConnection = (): boolean => {
    if (!userWallet.myAddr) {
      toast.warn("Please connect your wallet first");
      return false;
    }
    return true;
  }

  const getUpdatedBalance = async (): Promise<BigNumber> => {
    if (!userWallet || !web3) return new BigNumber(0);

    const myBalance = new BigNumber(await web3.eth.getBalance(userWallet.myAddr));
    setUserWallet({ ...userWallet, myBalance });
    return myBalance;
  }

  const contextValue = {
    // state
    web3,
    userWallet,
    web3Initialized,
    contractsManager,

    // state functions
    setUserWallet: (newUserWallet: UserWallet) => setUserWallet(newUserWallet),  // Set the new userWallet state
    setContractsManager,  // Set the new contractsManager state

    // other functions
    connectWallet,
    ensureWalletConnection,
    showLoader,
    getUpdatedBalance
  };

  return (
    <Web3Context.Provider value={contextValue}>
      <Loader isLoading={isLoading} loadingMessage={loadingMessage}/>
      {/* <WalletConnectModalSign
                projectId={"2cceb4f25f1cb889b967ea3c40bfd7cd"}
                metadata={{
                    name: 'My Dapp',
                    description: 'My Dapp description',
                    url: 'https://my-dapp.com',
                    icons: ['https://my-dapp.com/logo.png']
                }}
            /> */}
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
