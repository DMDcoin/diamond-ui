import React, { createContext, useContext, useState } from "react";
import { useWeb3Context } from "../Web3Context";
import { ContextProviderProps } from "../Web3Context/types";
import { Proposal } from "./types";
interface DaoContextProps {
  daoInitialized: boolean;
  activeProposals: Proposal[];
  initialize: () => Promise<void>;
  getActiveProposals: () => Promise<void>;
}

const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const web3Context = useWeb3Context();
  const [daoInitialized, setDaoInitialized] = useState<boolean>(false);
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);

  const initialize = async () => {
    if (daoInitialized) return;
    web3Context.contractsManager.daoContract = await web3Context.contractsManager.contracts.getDaoContract();
    web3Context.setContractsManager(web3Context.contractsManager);
    setDaoInitialized(true);
  }

  const getActiveProposals = async () => {
    const proposalIds = await web3Context.contractsManager.daoContract?.methods.getCurrentPhaseProposals().call();
    if (!proposalIds) return;
    const details = [];

    for (let i = 0; i < proposalIds.length; i++) {
      const proposalId = proposalIds[i];
      const proposalDetails = await web3Context.contractsManager.daoContract?.methods.getProposal(proposalId).call();
      const proposalVotes = await web3Context.contractsManager.daoContract?.methods.getProposalVotersCount(proposalId).call();
      details.push({...proposalDetails, votes: proposalVotes, id: proposalId});
    }

    setActiveProposals(details as any);
  }

  const contextValue = {
    // states
    daoInitialized,
    activeProposals,

    // functions
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
