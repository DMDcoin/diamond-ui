import { toast } from 'react-toastify';
import React, { createContext, useContext, useEffect, useState } from "react";
import { useWeb3Context } from "../Web3Context";
import { ContextProviderProps } from "../Web3Context/types";
import { DaoPhase, Proposal, TotalVotingStats, Vote } from "./types";
import BigNumber from 'bignumber.js';
import { timestampToDate } from '../../utils/common';
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });
interface DaoContextProps {
  daoPhase: any,
  daoPhaseCount: string;
  daoInitialized: boolean;
  activeProposals: Proposal[];
  phaseEndTimer: string;
  allDaoProposals: Proposal[];
  governancePotBalance: BigNumber;

  initialize: () => Promise<void>;
  setActiveProposals: (proposals: Proposal[]) => void;
  getActiveProposals: () => Promise<void>;
  dismissProposal: (proposalId: string, reason: string) => Promise<void>;
  getStateString: (stateValue: string) => string;
  castVote: (proposalId: number, vote: number, reason: string) => Promise<void>;
  getProposalVotingStats: (proposalId: string) => Promise<TotalVotingStats>;
  createProposal: (type: string, title: string, discussionUrl: string, targets: string[], values: string[], callDatas: string[], description: string) => Promise<string>;
  getProposalTimestamp: (proposalId: string) => Promise<number>;
  timestampToDate: (timestamp: string) => string;
  getHistoricProposals: () => Promise<void>;
  finalizeProposal: (proposalId: string) => Promise<string>;
  getCachedProposals: () => Proposal[];
  getProposalDetails: (proposalId: string) => Promise<Proposal>;
  setProposalsState: (proposals: Proposal[]) => Promise<void>;
  getHistoricProposalsEvents: () => Promise<Array<string>>;
  getMyVote: (proposalId: string) => Promise<Vote>;
  executeProposal: (proposalId: string) => Promise<string>;
}

const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const web3Context = useWeb3Context();

  const [daoPhaseCount, setDaoPhaseCount] = useState("1");
  const [proposalFee, setProposalFee] = useState<string>('0');
  const [events, setEvents] = useState<NodeJS.Timeout | null>(null);
  const [phaseEndTimer, setPhaseEndTime] = useState<string>('0h 0m');
  const [daoInitialized, setDaoInitialized] = useState<boolean>(false);
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
  const [allDaoProposals, setAllDaoProposals] = useState<Proposal[]>([]);
  const [governancePotBalance, setGovernancePotBalance] = useState<BigNumber>(BigNumber('0'));
  const [daoPhase, setDaoPhase] = useState<DaoPhase>({ daoEpoch: '', end: '', phase: '', start: '' });

  useEffect(() => {
    // localStorage.clear();
    if (web3Context.web3Initialized) {
      initialize();
    }
  }, [web3Context.userWallet, web3Context.web3Initialized]);

  const initialize = async () => {
    if (daoInitialized) return;
    console.log("[INFO] Initializing Dao Context");
    setDaoInitialized(true);

    web3Context.setContractsManager(web3Context.contractsManager);
    
    const pFee = await web3Context.contractsManager.daoContract.methods.createProposalFee().call();
    setProposalFee(pFee);

    const phase: DaoPhase = await web3Context.contractsManager.daoContract.methods.daoPhase().call();
    setDaoPhase(phase);

    const phaseCount = await web3Context.contractsManager.daoContract.methods.daoPhaseCount().call();
    setDaoPhaseCount(phaseCount);

    const governancePot = await web3Context.web3.eth.getBalance(web3Context.contractsManager.daoContract.options.address);
    setGovernancePotBalance(BigNumber(governancePot).dividedBy(1e18));

    subscribeToEvents();
  }

  const handleErrorMsg = (err: Error, alternateMsg: string) => {
    if (err.message && !err.message.includes("EVM") && (err.message.includes("MetaMask") || err.message.includes("Transaction"))) {
      toast.error(err.message);
    } else if (err.message && err.message.includes("BigNumber") || err.message.toLowerCase().includes("invalid")) {
      toast.error("Invalid input, please check the values and try again.");
    } else {
      toast.error(alternateMsg);
    }
  }

  const getProposalTypeString = (proposalType: string) => {
    switch (proposalType) {
      case '0':
        return 'Open';
      case '1':
        return 'Contract upgrade';
      case '2':
        return 'Ecosystem Parameter Change';
      default:
        return 'Unknown';
    }
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
    const daoContractAbi: any = web3Context.contractsManager.daoContract.options.jsonInterface;

    // Find all possible signatures for the ProposalCreated event
    const eventSignatures = [
      web3Context.web3.utils.keccak256('ProposalCreated(address,uint256,address[],uint256[],bytes[],string,string,string)'),
      daoContractAbi.find((item: any) => item.name === 'ProposalCreated' && item.type === 'event')?.signature
    ].filter(Boolean); // Remove any undefined signatures

    const proposalIdTopic = web3Context.web3.utils.padLeft(web3Context.web3.utils.toHex(proposalId), 64);

    for (const signature of eventSignatures) {
        try {
            const logs = await web3Context.web3.eth.getPastLogs({
                address: web3Context.contractsManager.daoContract.options.address,
                topics: [
                    signature,    // Event signature for ProposalCreated
                    null,         // Placeholder for first parameter if it's not indexed
                    proposalIdTopic // Filter by proposalId
                ],
                fromBlock: 0,
                toBlock: 'latest'
            });

            if (logs && logs.length > 0) {
                // Fetch the timestamp of the block where the event was emitted
                const block = await web3Context.web3.eth.getBlock(logs[0].blockNumber);
                return block.timestamp as number;
            }
        } catch (error) {
            console.error(`Error fetching logs with signature ${signature}:`, error);
            // Continue to the next signature if there's an error
        }
    }

    throw new Error("No events found for the given proposalId");
  };

  const getCachedProposals = () => {
    let cachedProposals: Proposal[] = [];
    const cachedProposalsString = localStorage.getItem('allDaoProposals');
    if (cachedProposalsString) {
      cachedProposals = JSON.parse(cachedProposalsString);
    }

    return cachedProposals;
  }

  const getProposalDetails = async (proposalId: string) => {
    // Retrieve allDaoProposals from localStorage
    let updatedData: Proposal | undefined = getCachedProposals().find((proposal) => proposal.id === proposalId);
    let proposalDetails;
    let proposalTimestamp;

    const proposalVotes = await web3Context.contractsManager.daoContract.methods.getProposalVotersCount(proposalId).call();
    
    if (!updatedData) updatedData = initializeProposal(proposalId);

    try {
      if (updatedData && (!updatedData.proposer || !['1', '5', '6'].includes(updatedData.state))) {
        proposalDetails = await web3Context.contractsManager.daoContract.methods.getProposal(proposalId).call();
        updatedData = {
          ...updatedData,
          ...proposalDetails,
          values: proposalDetails?.[4],
          daoPhaseCount: proposalDetails?.[9] || "1",
          proposalType: getProposalTypeString(proposalDetails?.[10] || "3"),
        };
      }

      if (updatedData && !updatedData.timestamp) {
        proposalTimestamp = await getProposalTimestamp(proposalId);
        updatedData.timestamp = proposalTimestamp.toString();
      }
    } catch (error) {}

    updatedData["id"] = proposalId;
    updatedData["votes"] = proposalVotes;

    return updatedData;
  }

  const initializeProposal = (
    proposalId: string,
    calldatas: Array<string> = [],
    description: string = "",
    proposer: string = "",
    targets: Array<string> = [],
    values: Array<string> = []
  ): Proposal => {
    return {
      title: '',
      proposer: proposer,
      state: '',
      targets: targets,
      values: values,
      calldatas: calldatas,
      description: description,
      votes: '',
      id: proposalId,
      timestamp: '',
      daoPhaseCount: '',
      proposalType: ''
    };
  }

  const getActiveProposals = async () => {
    console.log("[INFO] Getting active proposals");
    const activePs = await web3Context.contractsManager.daoContract.methods.getCurrentPhaseProposals().call();
    if (!activePs) return;

    let proposalDetails = activePs.map((proposalId: string) => initializeProposal(proposalId));
    setActiveProposals(proposalDetails);
    web3Context.showLoader(false, "");

    const chunkSize = 10;
    const numChunks = Math.ceil(activePs.length / chunkSize);
    
    // Process each chunk sequentially
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = (i + 1) * chunkSize;
      const chunkProposalIds = activePs.slice(start, end);

      // Fetch details for the current chunk of proposalIds
      const chunkProposalDetailsPromises = chunkProposalIds.map(proposalId => getProposalDetails(proposalId));
      const chunkProposalDetails = await Promise.all(chunkProposalDetailsPromises);

      // Update local storage and state with the details of the current chunk of proposals
      const updatedProposals = await Promise.all(chunkProposalDetails);
      const activeProposalsCopy = [...proposalDetails];

      updatedProposals.forEach(proposal => {
        const storedProposalIndex = activeProposalsCopy.findIndex(p => p.id === proposal.id);

        if (storedProposalIndex === -1) {
          activeProposalsCopy.push(proposal as any);
        } else {
          activeProposalsCopy[storedProposalIndex] = proposal as any;
        }
      });

      setActiveProposals(activeProposalsCopy);
      proposalDetails = activeProposalsCopy;
    }
    console.log("[INFO] All active proposals fetched and updated");
  }

  const getProposalVotingStats = (proposalId: string): Promise<TotalVotingStats> => {
    console.log("[INFO] Getting Proposal Voting Stats")
    let stats = { positive: new BigNumber(0), negative: new BigNumber(0), total: new BigNumber(0)};
    return new Promise(async (resolve, reject) => {
        try {
          const proposalVoters = await web3Context.contractsManager.daoContract.methods.getProposalVoters(proposalId).call();

          if (!proposalVoters?.length) return resolve(stats);
          
          let stakeNo = new BigNumber(0);
          let stakeYes = new BigNumber(0);
          let totalStake = new BigNumber(0);
          let stakeAbstain = new BigNumber(0);

          const votingStats = await web3Context.contractsManager.daoContract.methods.countVotes(proposalId).call();

          if (votingStats) {
            stakeNo = new BigNumber(votingStats[3]);
            stakeYes = new BigNumber(votingStats[2]);

            totalStake = stakeAbstain.plus(stakeNo).plus(stakeYes);
          }

          const positivePercentage = stakeYes.dividedBy(totalStake).multipliedBy(100);
          const negativePercentage = stakeNo.dividedBy(totalStake).multipliedBy(100);
          
          stats = {
            positive: positivePercentage.isNaN() ? new BigNumber(0) : positivePercentage,
            negative: negativePercentage.isNaN() ? new BigNumber(0) : negativePercentage,
            total: totalStake
          };

          resolve(stats);
        } catch (error) {
          resolve(stats);
        }
    });
  };

  const getProposalExists = async (targets: string[], values: string[], callDatas: string[], description: string) => {
    const proposalId = await web3Context.contractsManager.daoContract.methods.hashProposal(
      targets, values, callDatas, description
    ).call();
    return await web3Context.contractsManager.daoContract.methods.proposalExists(proposalId).call();
  }

  const createProposal = async (type: string, title: string, discussionUrl: string, targets: string[], values: string[], callDatas: string[], description: string) => {
    return new Promise<string>(async (resolve, reject) => {
        if (daoPhase.phase !== "0") return toast.warn("Cannot propose in voting phase");        
        if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
        if (await getProposalExists(targets, values, callDatas, description)) return toast.warn("Proposal already exists");

        try {
          web3Context.showLoader(true, "Creating proposal 💎");
          await web3Context.contractsManager.daoContract.methods.propose(
            targets,
            values,
            callDatas,
            title,
            description,
            discussionUrl
          ).send({from: web3Context.userWallet.myAddr, value: proposalFee});
          const proposalId = await web3Context.contractsManager.daoContract.methods.hashProposal(
            targets, values, callDatas, description
          ).call();
          web3Context.showLoader(false, "");
          toast.success("Proposal Created 💎");
          resolve(proposalId);
        } catch(err: any) {
          console.log(err);
          web3Context.showLoader(false, "");
          console.log(err)
          handleErrorMsg(err, "Proposal creation failed");
          reject("");
        }
    });
  };

  const dismissProposal = async (proposalId: string, reason: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
  
        web3Context.showLoader(true, "Dismissing proposal 💎");
        try {       
          await web3Context.contractsManager.daoContract.methods.cancel(proposalId, reason).send({from: web3Context.userWallet.myAddr});
          web3Context.showLoader(false, "");
          toast.success("Proposal Dismissed 💎");
          resolve();
        } catch(err: any) {
          console.error(err);
          web3Context.showLoader(false, "");
          handleErrorMsg(err, "Proposal dismissal failed");
          reject(err);
        }
    });
  };

  const castVote = async (proposalId: number, vote: number, reason: string) => {
    return new Promise<void>(async (resolve, reject) => {
      if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
      
      web3Context.showLoader(true, `Casting vote 💎`);
      try {
        if (reason.length > 0) {
          await web3Context.contractsManager.daoContract.methods.voteWithReason(proposalId, vote, reason).send({from: web3Context.userWallet.myAddr});
        } else {
          await web3Context.contractsManager.daoContract.methods.vote(proposalId, vote).send({from: web3Context.userWallet.myAddr});
        }
        web3Context.showLoader(false, "");
        toast.success(`Vote Casted 💎`);
        resolve();
      } catch(err: any) {
        console.log(err);
        web3Context.showLoader(false, "");
        handleErrorMsg(err, "Voting Failed!");
        reject(err);
      }
    });
  }

  const subscribeToEvents = async () => {
    if (!events) {
      let phase = await web3Context.contractsManager.daoContract.methods.daoPhase().call();
      setPhaseTimer(phase);
      
      const interval = setInterval(async () => {
        try {
          phase = await web3Context.contractsManager.daoContract.methods.daoPhase().call();
          
          setDaoPhase((prevPhase: any) => {
            if (prevPhase && phase && prevPhase.phase !== phase.phase) {
              console.log("Phase changed");
              
              try {
                getActiveProposals();
                getHistoricProposals();
              } catch (proposalError) {
                console.error("Error fetching proposals:", proposalError);
              }
              
              // Fetch daoPhaseCount with error handling
              web3Context.contractsManager.daoContract.methods.daoPhaseCount().call()
                .then(count => setDaoPhaseCount(count))
                .catch(countError => console.error("Error fetching daoPhaseCount:", countError));
  
              return phase;
            }
            return prevPhase;
          });
  
          setPhaseTimer(phase);
        } catch (error) {
          console.error("Error fetching daoPhase:", error);
        }
      }, 5000);
  
      setEvents(interval);
    }
  }

  const setPhaseTimer = (phase: any) => {
    const currTime = Math.floor(new Date().getTime() / 1000);

    // Calculate remaining time in seconds
    const remainingSeconds = Math.max(parseFloat(phase.end) - currTime, 0);

    // Calculate hours and minutes from remaining seconds
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);

    setPhaseEndTime(`${hours}h ${minutes}m`);
  }

  const getHistoricProposalsEvents = async (): Promise<Array<string>> => {
    let allProposals: Array<any> = [];
    const storedProposalsString = localStorage.getItem('allDaoProposals');
    let storedProposals: Proposal[] = storedProposalsString ? JSON.parse(storedProposalsString) : [];

    const stats = await web3Context.contractsManager.daoContract.methods.statistic().call();
    if (storedProposals.length >= Number(stats?.total)) {
      return storedProposals.map((proposal) => proposal.id);
    }

    const currentBlock = await web3Context.web3.eth.getBlockNumber();

    const eventsBatchSize = 100000;

    const daoContractAbi = web3Context.contractsManager.daoContract.options.jsonInterface;
    const currentEventSignature: any = daoContractAbi.find(item => item.name === 'ProposalCreated' && item.type === 'event');
    
    const oldEventSignatures = [
      web3Context.web3.utils.keccak256('ProposalCreated(address,uint256,address[],uint256[],bytes[],string,string,string)'),
      currentEventSignature?.signature
    ]

    for (let i = 0; i < currentBlock; i += eventsBatchSize) {
      const start = i;
      const end = Math.min(i + eventsBatchSize - 1, currentBlock);

      // Fetch logs for all event signatures
      const logs = await web3Context.web3.eth.getPastLogs({
        address: web3Context.contractsManager.daoContract.options.address,
        topics: [oldEventSignatures], // Filter by all signatures
        fromBlock: start,
        toBlock: end
      });

      logs.forEach((log: any) => {
        const decoded = web3Context.web3.eth.abi.decodeLog(
          currentEventSignature?.inputs,
          log.data,
          log.topics.slice(1)
        );
        allProposals.push(decoded);
      });
    };

    allProposals.forEach(async (p) => {
      const proposalIndex = storedProposals.findIndex((proposal) => proposal.id === p[1]);
      if (proposalIndex === -1) {
        storedProposals.push(initializeProposal(p[1], p[4], p[5], p[0], p[2], p[3]));
      }
    });
    localStorage.setItem('allDaoProposals', JSON.stringify(storedProposals));

    return allProposals.map((proposal) => proposal[1]);
  }

  const getHistoricProposals = async () => {
    console.log("[INFO] Getting historic proposals");
    const allProposalIds = await getHistoricProposalsEvents();
    if (allProposalIds.length === 0) web3Context.showLoader(false, "");

    const chunkSize = 20;
    const numChunks = Math.ceil(allProposalIds.length / chunkSize);

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
      setProposalsState(updatedProposals);
    }

    console.log("[INFO] All historic proposals fetched and updated");
  };

  const setProposalsState = async (proposals: Proposal[]) => {
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
    return new Promise<string>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return resolve("");

        web3Context.showLoader(true, "Finalizing proposal 💎");
        try {
          await web3Context.contractsManager.daoContract.methods.finalize(proposalId).send({ from: web3Context.userWallet.myAddr });
          const proposalUpdated = await getProposalDetails(proposalId);
          await setProposalsState([proposalUpdated]);
          web3Context.showLoader(false, "");
          toast.success("Proposal Finalized 💎");
          resolve("success");
        } catch(err: any) {
          console.error(err);
          web3Context.showLoader(false, "");
          handleErrorMsg(err, "Proposal finalization failed");
          resolve("failed");
        }
    });
  }

  const getMyVote = async (proposalId: string): Promise<Vote> => {
    return await web3Context.contractsManager.daoContract.methods
      .votes(proposalId, web3Context.userWallet.myAddr)
      .call();
  };

  const executeProposal = async (proposalId: string) => {
    return new Promise<string>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return resolve("");
        let proposalDetails = await getProposalDetails(proposalId);
        if (proposalDetails.proposalType == 'Contract upgrade' &&  proposalDetails.proposer !== web3Context.userWallet.myAddr) return toast.warn("Only proposer can execute the proposal");

        web3Context.showLoader(true, "Executing proposal 💎");
        try {
          await web3Context.contractsManager.daoContract.methods.execute(proposalId).send({ from: web3Context.userWallet.myAddr });
          proposalDetails = await getProposalDetails(proposalId);
          await setProposalsState([proposalDetails]);
          web3Context.showLoader(false, "");
          toast.success("Proposal Executed 💎");
          resolve("success");
        } catch(err: any) {
          console.error(err);
          web3Context.showLoader(false, "");
          handleErrorMsg(err, "Proposal execution failed");
          resolve("failed");
        }
    });
  }

  // TODO: Decode calldata of calls to our core contracts
  // const decodeCallData = (callData: string) => {
  //   const selector = callData.slice(0, 10);
  //   const matchedFunction = abi.find((func: any) => func.signature === selector);
  //   return matchedFunction;
  // }

  const contextValue = {
    // states
    daoPhase,
    daoPhaseCount,
    phaseEndTimer,
    daoInitialized,
    activeProposals,
    allDaoProposals,
    governancePotBalance,

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
    getCachedProposals,
    getProposalDetails,
    setProposalsState,
    getHistoricProposalsEvents,
    getMyVote,
    setActiveProposals,
    executeProposal
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
