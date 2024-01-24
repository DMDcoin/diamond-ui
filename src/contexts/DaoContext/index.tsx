import React, { createContext, useContext } from "react";
import { useWeb3Context } from "../Web3Context";
import { ContextProviderProps } from "../Web3Context/types";


interface DaoContextProps {
  initialize: () => Promise<void>;
  getActiveProposals: () => Promise<string[] | undefined>;
}
const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const web3Context = useWeb3Context();

  const initialize = async () => {
    web3Context.contractsManager.daoContract = await web3Context.contractsManager.contracts.getDaoContract();
  }

  const getActiveProposals = async () => {
    return await web3Context.contractsManager.daoContract?.methods.getCurrentPhaseProposals().call();
  }

  const contextValue = {
    initialize,
    getActiveProposals,
  };

  return (
    <DaoContext.Provider value={contextValue}>
      {children}
    </DaoContext.Provider>
  );
};

const useDaoContext = (): DaoContextProps => {
  const context = useContext(DaoContext);

  if (context === undefined) {
    throw new Error("Coudln't fetch DAO Context");
  }

  return context;
};

export { DaoContextProvider, useDaoContext };
