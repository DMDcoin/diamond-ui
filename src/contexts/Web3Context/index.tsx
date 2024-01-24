import React, { createContext, useContext, useState } from "react";
import { ContextProviderProps } from "./types";
import Web3 from "web3";

import { BN } from "bn.js";
import Web3Modal from "web3modal";
import { walletConnectProvider } from "@web3modal/wagmi";
import { ContractManager } from "../StakingContext/models/contractManager";
import { UserWallet } from "../StakingContext/models/wallet";
import { BlockRewardHbbftCoins, DiamondDao, KeyGenHistory, RandomHbbft, StakingHbbft, ValidatorSetHbbft } from "../contracts";

interface ContractsState {
  contracts: ContractManager;
  vsContract: ValidatorSetHbbft;
  stContract?: StakingHbbft;
  brContract?: BlockRewardHbbftCoins;
  kghContract?: KeyGenHistory;
  rngContract?: RandomHbbft;
  daoContract?: DiamondDao;
}

interface Web3ContextProps {
  web3: Web3,
  userWallet: UserWallet,
  contractsManager: ContractsState,
  connectWallet: () => Promise<{ provider: Web3; wallet: UserWallet } | undefined>,
  setUserWallet: (newUserWallet: UserWallet) => void;
}


const Web3Context = createContext<Web3ContextProps | undefined>(undefined);

const Web3ContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const [web3, setWeb3] = useState<Web3>(new Web3("https://rpc.uniq.diamonds"));
  const [userWallet, setUserWallet] = useState<UserWallet>(new UserWallet("", new BN(0)));
  const initialContracts = new ContractManager(web3);
  const [contractsManager, setContractsManager] = useState<ContractsState>({
    contracts: initialContracts,
    vsContract: initialContracts.getValidatorSetHbbft(),
  });

  const connectWallet = async () => {
    try {
      const chainId = 777012;
      const url = "https://rpc.uniq.diamonds";
      const chainOptions: { rpc: Record<number, string> } = { rpc: { [chainId]: url } };

      const providerOptions = {
        walletconnect: {
          package: walletConnectProvider,
          options: chainOptions,
        },
      };
  
      const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: false, // optional
        providerOptions, // required
      });
  
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
      if (web3ModalInstance.chainId !== chainId) {
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
  
      const myBalance = new BN(await web3.eth.getBalance(web3ModalInstance.selectedAddress));
      const wallet = new UserWallet(web3ModalInstance.selectedAddress, myBalance);

      setWeb3(provider);
      setUserWallet(wallet);

      return {provider, wallet};
    } catch (err) {
      console.error("[Wallet Connect]", err);
    }
  };

  const contextValue = {
    // state
    web3,
    userWallet,
    contractsManager,

    // state functions
    setUserWallet: (newUserWallet: UserWallet) => setUserWallet(newUserWallet),  // Set the new userWallet state

    // other functions
    connectWallet,
  };

  return (
    <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>
  );
};

const useWeb3Context = (): Web3ContextProps => {
  const context = useContext(Web3Context);

  if (context === undefined) {
    throw new Error("Coudln't fetch Web3 Context");
  }

  return context;
};

export { Web3ContextProvider, useWeb3Context };
