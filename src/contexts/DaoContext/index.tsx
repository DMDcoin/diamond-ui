import { toast } from 'react-toastify';
import React, { createContext, useContext, useState } from "react";
import { useWeb3Context } from "../Web3Context";
import { ContextProviderProps } from "../Web3Context/types";
import { Proposal } from "./types";
interface DaoContextProps {
  daoPhase: string,
  daoInitialized: boolean;
  activeProposals: Proposal[];
  initialize: () => Promise<void>;
  getActiveProposals: () => Promise<void>;
  createProposal: (type: string, title: string, description: string) => Promise<void>;
}


const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const web3Context = useWeb3Context();

  const [daoPhase, setDaoPhase] = useState<string>('0');
  const [proposalFee, setProposalFee] = useState<string>('0');
  const [daoInitialized, setDaoInitialized] = useState<boolean>(false);
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);

  const initialize = async () => {
    if (daoInitialized) return;
    web3Context.contractsManager.daoContract = await web3Context.contractsManager.contracts.getDaoContract();
    web3Context.setContractsManager(web3Context.contractsManager);
    
    const pFee = await web3Context.contractsManager.daoContract?.methods.createProposalFee().call();
    setProposalFee(pFee);

    const phase = await web3Context.contractsManager.daoContract?.methods.daoPhase().call();
    setDaoPhase(phase.phase);

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

  const createProposal = async (type: string, title: string, description: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (!web3Context.userWallet.myAddr) {
          toast.warn("Please connect your wallet first");
          reject("Wallet not connected");
          return;
        }
  
        if (type === 'open') {
          const toastid = toast.loading("Creating proposal");
          try {       
            const zeroAddress = '0x' + '0'.repeat(40);
            await web3Context.contractsManager.daoContract?.methods.propose(
              [zeroAddress],
              [0],
              [zeroAddress],
              description,
            ).send({from: web3Context.userWallet.myAddr, value: proposalFee});
            toast.update(toastid, { render: "Proposal Created!", type: "success", isLoading: false, autoClose: 5000 });
            resolve();
          } catch(err) {
            console.error(err);
            toast.update(toastid, { render: "Proposal Creation Failed!", type: "error", isLoading: false, autoClose: 5000 });
            reject(err);
          }
        } else {
          resolve();
        }
    });
  };  

  const contextValue = {
    // states
    daoPhase,
    daoInitialized,
    activeProposals,

    // functions
    initialize,
    getActiveProposals,
    createProposal
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
