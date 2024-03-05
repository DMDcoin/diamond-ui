import { toast } from 'react-toastify';
import React, { createContext, useContext, useEffect, useState } from "react";
import { useWeb3Context } from "../Web3Context";
import { ContextProviderProps } from "../Web3Context/types";
import { Proposal, TotalVotingStats } from "./types";
import BigNumber from 'bignumber.js';
interface DaoContextProps {
  daoPhase: any,
  daoInitialized: boolean;
  activeProposals: Proposal[];
  phaseEndTimer: string;
  allDaoProposals: Proposal[];
  myTotalStake: BigNumber | undefined;
  totalStakedAmount: BigNumber | undefined;

  initialize: () => Promise<void>;
  getActiveProposals: () => Promise<void>;
  dismissProposal: (proposalId: string, reason: string) => Promise<void>;
  getStateString: (stateValue: string) => string;
  castVote: (proposalId: number, vote: number, reason: string) => Promise<void>;
  getProposalVotingStats: (proposalId: string) => Promise<TotalVotingStats>;
  createProposal: (type: string, title: string, targets: string[], values: string[], callDatas: string[], description: string) => Promise<void>;
  getProposalTimestamp: (proposalId: string) => Promise<number>;
  timestampToDate: (timestamp: number) => string;
  getHistoricProposals: () => Promise<void>;
  finalizeProposal: (proposalId: string) => Promise<void>;  
}

const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const web3Context = useWeb3Context();

  const [daoPhase, setDaoPhase] = useState<any>();
  const [proposalFee, setProposalFee] = useState<string>('0');
  const [phaseEndTimer, setPhaseEndTime] = useState<string>('');
  const [events, setEvents] = useState<NodeJS.Timeout | null>(null);
  const [daoInitialized, setDaoInitialized] = useState<boolean>(false);
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
  const [allDaoProposals, setAllDaoProposals] = useState<Proposal[]>([]);
  const [myTotalStake, setMyTotalStake] = useState<BigNumber | undefined>(undefined);
  const [totalStakedAmount, setTotalStakedAmount] = useState<BigNumber | undefined>(undefined);

  useEffect(() => {
    if (!myTotalStake && web3Context.userWallet.myAddr) {
      getTotalStakedAmount();
    }

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
    subscribeToEvents();
  }, [daoPhase, web3Context.userWallet.myAddr]);

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

  const getAllProposalsDetail = (proposalId: string) => {
    let storedProposals: Proposal[] = [];
    const storedProposalsString = localStorage.getItem('allDaoProposals');
    if (storedProposalsString) {
      storedProposals = JSON.parse(storedProposalsString);
    }

    return storedProposals.find((proposal) => proposal.id === proposalId);
  }

  const getProposalDetails = async (proposalId: string) => {
    // Retrieve allDaoProposals from localStorage
    let updatedData: Proposal | undefined = getAllProposalsDetail(proposalId);
    
    let proposalDetails;
    let proposalTimestamp;

    const proposalVotes = await web3Context.contractsManager.daoContract?.methods.getProposalVotersCount(proposalId).call();
    
    if (!updatedData) updatedData = {
      proposer: '',
      votingDaoEpoch: '',
      state: '',
      targets: [],
      values: [],
      calldatas: [],
      description: '',
      votes: '',
      id: '',
      timestamp: '',
      type: ''
    };

    if (updatedData && (!updatedData.proposer || !['1', '4', '5', '6'].includes(updatedData.state))) {
      proposalDetails = await web3Context.contractsManager.daoContract?.methods.getProposal(proposalId).call();
      updatedData = {...updatedData, ...proposalDetails, values: proposalDetails?.[4]};
    }

    if (updatedData && !updatedData.timestamp) {
      proposalTimestamp = await getProposalTimestamp(proposalId);
      updatedData.timestamp = timestampToDate(proposalTimestamp);
    }

    updatedData["type"] = 'open';
    updatedData["id"] = proposalId;
    updatedData["votes"] = proposalVotes;

    return updatedData;
  }

  const getActiveProposals = async () => {
    console.log("Getting active proposals");
    const activeProposals = await web3Context.contractsManager.daoContract?.methods.getCurrentPhaseProposals().call();
    if (!activeProposals) return;

    const details = [];
    for (let i = 0; i < activeProposals.length; i++) {
      const proposalDetails = await getProposalDetails(activeProposals[i]);
      details.push(proposalDetails);
    }

    setActiveProposals(details);
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

  const createProposal = async (type: string, title: string, targets: string[], values: string[], callDatas: string[], description: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (daoPhase.phase !== "0") return toast.warn("Cannot propose in voting phase");        
        if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");

        const toastid = toast.loading("Creating proposal");
        try {
          console.log(
            targets,
            values,
            callDatas,
            description
          )
          await web3Context.contractsManager.daoContract?.methods.propose(
            targets,
            values,
            callDatas,
            description,
          ).send({from: web3Context.userWallet.myAddr, value: proposalFee});
          toast.update(toastid, { render: "Proposal Created!", type: "success", isLoading: false, autoClose: 5000 });
          resolve();
        } catch(err) {
          toast.update(toastid, { render: "Proposal Creation Failed!", type: "error", isLoading: false, autoClose: 1 });
          reject(err);
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

  const subscribeToEvents = async () => {
    if (!events) {
      const interval = setInterval(async() => {
        const phase = await web3Context.contractsManager.daoContract?.methods.daoPhase().call();
        setDaoPhase(phase);
      }, 5000);
      setEvents(interval);
    }
  }

  const getHistoricProposalsIds = async (): Promise<Array<string>> => {
    let allProposalIds: Array<string> = [];
    const currentBlock = await web3Context.web3.eth.getBlockNumber();

    const eventsBatchSize = 100000;

    for (let i = 0; i < currentBlock; i += eventsBatchSize) {
      const start = i;
      const end = Math.min(i + eventsBatchSize - 1, currentBlock);

      await web3Context.contractsManager.daoContract?.getPastEvents(
        'ProposalCreated',
        {
          filter: {},
          fromBlock: start,
          toBlock: end
        }).then(async (events) => {
          events.map(async (event) => {
            allProposalIds.push(event.returnValues.proposalId);
          });
        });
    }

    const storedProposalsString = localStorage.getItem('allDaoProposals');
    let storedProposals: Proposal[] = storedProposalsString ? JSON.parse(storedProposalsString) : [];

    allProposalIds.forEach(async (proposalId) => {
      const proposalIndex = storedProposals.findIndex((proposal) => proposal.id === proposalId);
      if (proposalIndex === -1) {
        storedProposals.push({
          proposer: '',
          votingDaoEpoch: '',
          state: '',
          targets: [],
          values: undefined,
          calldatas: [],
          description: '',
          votes: undefined,
          id: proposalId,
          timestamp: '',
          type: ''
        });
      }
    });
    localStorage.setItem('allDaoProposals', JSON.stringify(storedProposals));

    return allProposalIds;
  }

  const getHistoricProposals = async () => {
    console.log("Getting historic proposals");
    const allProposalIds = await getHistoricProposalsIds();

    const chunkSize = 1;
    const numChunks = Math.ceil(allProposalIds.length / chunkSize);

    web3Context.setIsLoading(false);

    // Process each chunk sequentially
    for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = (i + 1) * chunkSize;
        const chunkProposalIds = allProposalIds.slice(start, end);

        // Fetch details for the current chunk of proposalIds
        const chunkProposalDetailsPromises = chunkProposalIds.map(proposalId => getProposalDetails(proposalId));
        const chunkProposalDetails = await Promise.all(chunkProposalDetailsPromises);

        // Update local storage and state with the details of the current chunk of proposals
        const updatedProposals = await Promise.all(chunkProposalDetails);
        setAllProposalsState(updatedProposals);
    }

    console.log("All historic proposals fetched and updated");
  };

  const setAllProposalsState = async (proposals: Proposal[]) => {
    let storedProposals: Proposal[] = [];
    const storedProposalsString = localStorage.getItem('allDaoProposals');
    if (storedProposalsString) {
      storedProposals = JSON.parse(storedProposalsString);
    }
    const updatedStoredProposals = [...storedProposals];

    proposals.forEach(proposal => {
      const storedProposalIndex = updatedStoredProposals.findIndex(p => p.id === proposal.id);

      if (storedProposalIndex === -1) {
        updatedStoredProposals.push(proposal);
      } else {
        updatedStoredProposals[storedProposalIndex] = proposal;
      }
    });

    localStorage.setItem('allDaoProposals', JSON.stringify(updatedStoredProposals));
    setAllDaoProposals(updatedStoredProposals);
  };

  const finalizeProposal = async (proposalId: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return resolve();

        const toastid = toast.loading("Finalizing proposal");
        try {
          await web3Context.contractsManager.daoContract?.methods.finalize(proposalId).send({ from: web3Context.userWallet.myAddr });
          await getHistoricProposals();
          toast.update(toastid, { render: "Proposal Finalized!", type: "success", isLoading: false, autoClose: 5000 });
          resolve();
        } catch(err) {
          toast.update(toastid, { render: "Proposal Finalization Failed!", type: "error", isLoading: false, autoClose: 5000 });
          resolve();
        }
    });
  }

  const getTotalStakedAmount = async () => {
    let myStakedAmount = new BigNumber(0);
    let totalStakedAmount = new BigNumber(0);

    if (!myTotalStake) {
        setMyTotalStake(new BigNumber(0));
    } else {
        return;
    }

    console.log("[INFO] Getting Total Staked Amounts");

    if (!web3Context.contractsManager.stContract) {
        web3Context.contractsManager.stContract = await web3Context.contractsManager.contracts.getStakingHbbft();
    }
    const allPools = await web3Context.contractsManager.stContract?.methods.getPools().call();
    if (!allPools || !web3Context.userWallet.myAddr) return myStakedAmount;

    const myStakePromises = allPools.map(pool => {
      return web3Context.contractsManager.stContract?.methods.stakeAmount(pool, web3Context.userWallet.myAddr).call();
    });
    const myStakeAmounts = await Promise.allSettled(myStakePromises);
    myStakeAmounts.forEach((result) => {
        if (result.status === 'fulfilled') {
          const myStake = result.value;
          if (myStake) myStakedAmount = myStakedAmount.plus(myStake);
        } else {
          console.error("Failed to fetch stake amount:", result.reason);
        }
    });

    const totalStakedPromises = allPools.map(pool => {
      return web3Context.contractsManager.stContract?.methods.stakeAmountTotal(pool).call();
    })
    const totalStakeAmounts = await Promise.allSettled(totalStakedPromises);
    totalStakeAmounts.forEach((result) => {
        if (result.status === 'fulfilled') {
          const totalStake = result.value;
          if (totalStake) totalStakedAmount.plus(totalStake);
        } else {
          console.error("Failed to fetch total stake amount:", result.reason);
        }
    });

    setTotalStakedAmount(myStakedAmount);
    setMyTotalStake(myStakedAmount);
    return myStakedAmount;
  }

  const decodeCallData = (callData: string) => {
    // const selector = callData.slice(0, 10);
    // const matchedFunction = abi.find((func: any) => func.signature === selector);
    // return matchedFunction;
  }

  const contextValue = {
    // states
    daoPhase,
    phaseEndTimer,
    daoInitialized,
    activeProposals,
    allDaoProposals,
    myTotalStake,
    totalStakedAmount,

    // functions
    initialize,
    getActiveProposals,
    createProposal,
    dismissProposal,
    getStateString,
    castVote,
    getProposalVotingStats,
    getProposalTimestamp,
    timestampToDate,
    getHistoricProposals,
    finalizeProposal,
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
