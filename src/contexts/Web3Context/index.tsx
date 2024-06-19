import Web3 from "web3";
import Web3Modal from "web3modal";
import BigNumber from "bignumber.js";
import copy from "copy-to-clipboard";
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import { ContextProviderProps } from "./types";
import { walletConnectProvider } from "@web3modal/wagmi";
import { CustomWeb3HttpProvider } from "./Web3Provider";
import { UserWallet } from "../StakingContext/models/wallet";
import { requestPublicKeyMetamask } from "../../utils/common";
import { ContractManager } from "../StakingContext/models/contractManager";
import React, { createContext, useContext, useEffect, useState } from "react";

import {
  BlockRewardHbbftCoins,
  CertifierHbbft,
  ConnectivityTrackerHbbft,
  DiamondDao,
  KeyGenHistory,
  RandomHbbft,
  StakingHbbft,
  TxPermissionHbbft,
  ValidatorSetHbbft,
} from "../contracts";

interface ContractsState {
  contracts: ContractManager;
  vsContract: ValidatorSetHbbft;
  stContract?: StakingHbbft;
  brContract?: BlockRewardHbbftCoins;
  kghContract?: KeyGenHistory;
  rngContract?: RandomHbbft;
  daoContract: DiamondDao;
  crContract?: CertifierHbbft;
  tpContract?: TxPermissionHbbft;
  ctContract?: ConnectivityTrackerHbbft;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [web3Initialized, setWeb3Initialized] = useState<boolean>(false);

  // Initialize Web3 with CustomHttpProvider
  const rpcUrl = process.env.REACT_APP_RPC_URL || 'https://rpc.uniq.diamonds';
  const [web3, setWeb3] = useState<Web3>(new Web3("https://rpc.uniq.diamonds"));
  // const customProvider = new CustomWeb3HttpProvider(rpcUrl, { timeout: 10000 }, (message: string) => toast.warn(message, { autoClose: 5000 }));
  // const [web3, setWeb3] = useState<Web3>(new Web3(customProvider));

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
  }, []);

  const initialize = async () => {
    if (!web3Initialized) {
      await initialzeContracts(initialContracts);
      setWeb3Initialized(true);
    }
  }

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
        ctContract
      ] = await Promise.all([
        contractManager.getValidatorSetHbbft(),
        contractManager.getDaoContract(),
        contractManager.getStakingHbbft(),
        contractManager.getCertifierHbbft(),
        contractManager.getContractPermission(),
        contractManager.getRewardHbbft(),
        contractManager.getConnectivityTracker()
      ]);
    
      setContractsManager({
        contracts: contractManager,
        vsContract,
        daoContract,
        stContract,
        crContract,
        tpContract,
        brContract,
        ctContract
      });
    } catch (error: any) {
      toast.warn(`Failed to initialize contracts: ${error.message}`);
    }
  };

  const connectWallet = async () => {
    try {
      const chainId = 777012;
      const url = rpcUrl;
      const chainOptions: { rpc: Record<number, string> } = {
        rpc: { [chainId]: url },
      };

      const providerOptions = {
        // walletconnect: {
        //   package: walletConnectProvider,
        //   options: chainOptions,
        // },
      };
  
      const web3Modal = new Web3Modal({
        network: "mainnet",
        cacheProvider: false,
        providerOptions
      });
  
      // clear cache so on each connect it asks for wallet type
      web3Modal.clearCachedProvider();
      const web3ModalInstance = await web3Modal.connect();
  
      // handle account change
      web3ModalInstance.on("accountsChanged", function (accounts: Array<string>) {
        if (accounts.length === 0) {
          window.location.reload();
        } else {
          connectWallet();
        }
      });
  
      const provider = new Web3(web3ModalInstance);
  
      // force user to change to DMD network
      if (await web3ModalInstance.request({ method: 'eth_chainId' }) !== chainId) {
        try {
          await web3ModalInstance.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: new Web3().utils.toHex(chainId) }],
          });
        } catch (err: any) {
          if (err.code === 4902) {
            await web3ModalInstance.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainName: "DMD",
                  chainId: new Web3().utils.toHex(chainId),
                  nativeCurrency: { name: "DMD", decimals: 18, symbol: "DMD" },
                  rpcUrls: [url],
                },
              ],
            });
          } else {
            console.error("[Wallet Connect] Other Error", err);
            return undefined;
          }
        }
      }
  
      const walletAddress = (await web3ModalInstance.request({ method: 'eth_accounts' }))[0];

      // try {
      //   await requestPublicKeyMetamask(provider, walletAddress).then((res) => copy(res))
      // } catch {}

      const myBalance = new BigNumber(await web3.eth.getBalance(walletAddress));
      const wallet = new UserWallet(web3.utils.toChecksumAddress(walletAddress), myBalance);

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
