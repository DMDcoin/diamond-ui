import Web3 from "web3";
import BigNumber from "bignumber.js";
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import { ContextProviderProps } from "./types";
import { useAccount, useDisconnect } from "wagmi";
import { CURR_VERSION_INFO } from "../../constants";
import { switchChain, watchAccount } from '@wagmi/core';
import { UserWallet } from "../StakingContext/models/wallet";
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ContractManager } from "../StakingContext/models/contractManager";
import React, { createContext, useContext, useEffect, useState } from "react";


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

  setUserWallet: (newUserWallet: UserWallet) => void;
  setContractsManager: (newContractsManager: ContractsState) => void;
  ensureWalletConnection: () => boolean;
  showLoader: (loading: boolean, loadingMsg: string) => void;
  getUpdatedBalance: () => Promise<BigNumber>;
  updateWalletBalance: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextProps | undefined>(undefined);

const Web3ContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const { disconnect } = useDisconnect();
  const { appKit } = useWalletConnectContext();
  const { connector, isConnected, status } = useAccount();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [web3Initialized, setWeb3Initialized] = useState<boolean>(false);

  // Initialize Web3 with CustomHttpProvider
  const chainId = import.meta.env.VITE_APP_CHAINID || 27272;
  const rpcUrl = import.meta.env.VITE_APP_RPC_URL || 'https://beta-rpc.bit.diamonds/';
  const [wagmiConnector, setWagmiConnector] = useState<WalletConnectProvider | null>(null);
  const [web3, setWeb3] = useState<Web3>(new Web3(rpcUrl));

  const [userWallet, setUserWallet] = useState<UserWallet>(new UserWallet("", new BigNumber(0)));
  const initialContracts = new ContractManager(web3);
  const [contractsManager, setContractsManager] = useState<ContractsState>({
    contracts: initialContracts,
    vsContract: initialContracts.getValidatorSetHbbft(),
    daoContract: initialContracts.getDaoContract()
  });

  useEffect(() => {
    if (connector?.getProvider && isConnected && status === 'connected') {
      InitializeWagmiWallet(connector);
    }
  }, [connector, isConnected, status]);

  useEffect(() => {
    console.log("[INFO] Initializing Web3 Context");
    initialize();
    handleCacheReset();
  }, []);

  useEffect(() => {
    if (wagmiConnector) {
      const unwatch = watchAccount(wagmiConfig, {
        onChange(account) { 
          if (account.address) {
            InitializeWagmiWallet(wagmiConnector);
          } else {
            window.location.reload();
          }
        },
      })
    
      return () => {
        unwatch()
      };
    }
  }, [wagmiConnector]);

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

  const InitializeWagmiWallet = async (connector: any) => {
    try {
      let provider = await connector.getProvider();
      provider = new Web3(provider);

      // Check if the user is on the correct network, if not switch to the desired network
      if (await provider.eth.getChainId() !== Number(chainId)) {
        try {
          showLoader(true, "Please connect to the DMD Network");
          await switchChain(wagmiConfig, { chainId: Number(chainId) });
          showLoader(false, "");
        } catch (err: any) {
          if (err.code === 4001) {
            showLoader(false, "");
            await connector.disconnect();
            disconnect();
            return toast.warn("Please connect to the DMD Network to continue");
          } else {
            console.error("[Wallet Connect] Error", err);
            showLoader(false, "");
            return undefined;
          }
        }
      }

      appKit.close(); // close modal after login

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
      console.error(err);
    }
  }

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
    showLoader,
    getUpdatedBalance,
    updateWalletBalance,
    ensureWalletConnection
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
