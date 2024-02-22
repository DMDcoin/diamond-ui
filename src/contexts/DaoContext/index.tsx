import { toast } from 'react-toastify';
import React, { createContext, useContext, useEffect, useState } from "react";
import { useWeb3Context } from "../Web3Context";
import { ContextProviderProps } from "../Web3Context/types";
import { Proposal, TotalVotingStats } from "./types";
interface DaoContextProps {
  daoPhase: any,
  daoInitialized: boolean;
  activeProposals: Proposal[];
  initialize: () => Promise<void>;
  getActiveProposals: () => Promise<void>;
  createProposal: (type: string, title: string, description: string) => Promise<void>;
  phaseEndTimer: string;
  dismissProposal: (proposalId: string, reason: string) => Promise<void>;
  getStateString: (stateValue: string) => string;
  castVote: (proposalId: number, vote: number, reason: string) => Promise<void>;
  getProposalVotingStats: (proposalId: string) => Promise<TotalVotingStats>;
}


const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const web3Context = useWeb3Context();

  const [daoPhase, setDaoPhase] = useState<any>();
  const [proposalFee, setProposalFee] = useState<string>('0');
  const [phaseEndTimer, setPhaseEndTime] = useState<string>('');
  const [daoInitialized, setDaoInitialized] = useState<boolean>(false);
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    if (!phaseEndTimer && daoPhase) {
      // Initialize phaseEndTimer and setInterval only once
      setPhaseEndTime('0h 0m');
      const intervalId = setInterval(() => {
        // Current time in seconds
        const currTime = Math.floor(new Date().getTime() / 1000);

        // Calculate remaining time in seconds
        const remainingSeconds = Math.max(parseFloat(daoPhase?.end) - currTime, 0);

        // Calculate hours and minutes from remaining seconds
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);

        setPhaseEndTime(`${hours}h ${minutes}m`);
      }, 1000);

      return () => clearInterval(intervalId); // Cleanup function to clear interval on unmount
    }
  }, [daoPhase]);

  const initialize = async () => {
    if (daoInitialized) return;
    web3Context.contractsManager.daoContract = await web3Context.contractsManager.contracts.getDaoContract();
    web3Context.setContractsManager(web3Context.contractsManager);
    
    const pFee = await web3Context.contractsManager.daoContract?.methods.createProposalFee().call();
    setProposalFee(pFee);

    const phase = await web3Context.contractsManager.daoContract?.methods.daoPhase().call();
    setDaoPhase(phase);

    setDaoInitialized(true);
  }

  const timestampToDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const month = date.toLocaleString('default', { month: 'short' }); // Get short month name
    const day = date.getDate();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  const getStateString = (stateValue: string) => {
    switch (stateValue) {
      case '0':
        return 'Created';
      case '1':
        return 'Canceled';
      case '2':
        return 'Active';
      case '3':
        return 'VotingFinished';
      case '4':
        return 'Accepted';
      case '5':
        return 'Declined';
      case '6':
        return 'Executed';
      default:
        return 'Unknown';
    }
  };

  const getProposalTimestamp = async (proposalId: string): Promise<number> => {
    const events = await web3Context.contractsManager.daoContract?.getPastEvents(
      'ProposalCreated',
      {
        filter: { proposalId: proposalId },
        fromBlock: 0,
        toBlock: 'latest'
      });

      return new Promise((resolve, reject) => {
        events && web3Context.web3.eth.getBlock(events[0].blockNumber, (err, block) => {
            resolve(block.timestamp as number);
        });
      })
  };

  const getActiveProposals = async () => {
    const proposalIds = await web3Context.contractsManager.daoContract?.methods.getCurrentPhaseProposals().call();
    if (!proposalIds) return;
    const details = [];

    for (let i = 0; i < proposalIds.length; i++) {
      const proposalId = proposalIds[i];
      const proposalTimestamp: number = await getProposalTimestamp(proposalId);
      const proposalDetails = await web3Context.contractsManager.daoContract?.methods.getProposal(proposalId).call();
      const proposalVotes = await web3Context.contractsManager.daoContract?.methods.getProposalVotersCount(proposalId).call();
      console.log({proposalVotes}, {proposalId})
      details.push({
        ...proposalDetails,
        values: proposalDetails?.[4],
        votes: proposalVotes,
        id: proposalId,
        timestamp: timestampToDate(proposalTimestamp),
        type: 'open'
      });
    }

    setActiveProposals(details as any);
  }

  const getProposalVotingStats = (proposalId: string): Promise<TotalVotingStats> => {
    return new Promise(async (resolve, reject) => {
        try {
          let stats = { positive: 0, negative: 0 };
          const proposalVoters = await web3Context.contractsManager.daoContract?.methods.getProposalVoters(proposalId).call();

          if (!proposalVoters) return resolve(stats);

          let totalVotes = 0;
          let positiveVotes = 0;
          let negativeVotes = 0;
          for (let i = 0; i < proposalVoters.length; i++) {
              const voter = proposalVoters[i];
              const vote = await web3Context.contractsManager.daoContract?.methods.votes(proposalId, voter).call();
              if (vote?.vote === '2') {
                positiveVotes++;
              } else if (vote?.vote === '1') {
                negativeVotes++;
              }
              totalVotes++;
          }

          const positivePercentage = Math.round((positiveVotes / totalVotes) * 100);
          const negativePercentage = Math.round((negativeVotes / totalVotes) * 100);
          stats = {
              positive: positivePercentage ? positivePercentage : 0,
              negative: negativePercentage ? negativePercentage : 0
          };
          
          resolve(stats);
        } catch (error) {
          reject(error);
        }
    });
  };

  const createProposal = async (type: string, title: string, description: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
  
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

  const dismissProposal = async (proposalId: string, reason: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
  
        const toastid = toast.loading("Dismissing proposal");
        try {       
          await web3Context.contractsManager.daoContract?.methods.cancel(proposalId, reason).send({from: web3Context.userWallet.myAddr});
          toast.update(toastid, { render: "Proposal Dismissed!", type: "success", isLoading: false, autoClose: 5000 });
          resolve();
        } catch(err) {
          console.error(err);
          toast.update(toastid, { render: "Proposal Dismissal Failed!", type: "error", isLoading: false, autoClose: 5000 });
          reject(err);
        }
    });
  };

  const castVote = async (proposalId: number, vote: number, reason: string) => {
    return new Promise<void>(async (resolve, reject) => {
      if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
      
      const toastid = toast.loading("Casting vote");
      try {
        if (reason.length > 0) {
          await web3Context.contractsManager.daoContract?.methods.voteWithReason(proposalId, vote, reason).send({from: web3Context.userWallet.myAddr});
        } else {
          await web3Context.contractsManager.daoContract?.methods.vote(proposalId, vote).send({from: web3Context.userWallet.myAddr});
        }
        toast.update(toastid, { render: "Vote Casted!", type: "success", isLoading: false, autoClose: 5000 });
        resolve();
      } catch(err) {
        console.error(err);
        toast.update(toastid, { render: "Voting Failed!", type: "error", isLoading: false, autoClose: 5000 });
        reject(err);
      }
    });
  }

  const contextValue = {
    // states
    daoPhase,
    phaseEndTimer,
    daoInitialized,
    activeProposals,

    // functions
    initialize,
    getActiveProposals,
    createProposal,
    dismissProposal,
    getStateString,
    castVote,
    getProposalVotingStats
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
