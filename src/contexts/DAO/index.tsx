'use client';

import { toast } from 'react-toastify';
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useWeb3Context } from "@/contexts/Web3";
import { DaoPhase, Proposal, ProposalVote, ProposalVotesResult, TotalVotingStats, Vote } from "@/contexts/types/dao";
import BigNumber from 'bignumber.js';
import { getFunctionSelector, timestampToDate } from '../../utils/common';
import { getRuntimeConfig } from '@/lib/runtimeConfig';
import { formatTxError } from '@/utils/web3Errors';
import { buildTxOptions } from '@/utils/txOptions';
import { useStakingContext } from '@/contexts/Staking';
import logger from '@/utils/logger';
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

const PROPOSAL_STATE_VOTING_FINISHED = 3;
const VOTES_FETCH_CHUNK_SIZE = 10;
const VOTES_CACHE_PREFIX = 'dao_proposal_votes_v1_';

interface CachedProposalVotes {
  fingerprint: string;
  votes: ProposalVote[];
}

const votesCacheKey = (proposalId: string): string => `${VOTES_CACHE_PREFIX}${proposalId}`;

const sortVotesByRecency = (votes: ProposalVote[]): ProposalVote[] =>
  [...votes].sort((a, b) => {
    const byTimestamp = Number(b.timestamp || 0) - Number(a.timestamp || 0);
    if (byTimestamp !== 0) return byTimestamp;
    return BigNumber(b.stake || 0).comparedTo(BigNumber(a.stake || 0)) ?? 0;
  });

const readVotesCache = (proposalId: string): CachedProposalVotes | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(votesCacheKey(proposalId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProposalVotes;
    if (!parsed?.fingerprint || !Array.isArray(parsed.votes)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeVotesCache = (proposalId: string, entry: CachedProposalVotes): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(votesCacheKey(proposalId), JSON.stringify(entry));
  } catch {}
};

const clearVotesCache = (proposalId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(votesCacheKey(proposalId));
  } catch {}
};

interface DaoContextProps {
  daoPhase: any,
  proposalFee: string;
  daoPhaseCount: string;
  daoInitialized: boolean;
  activeProposals: Proposal[];
  phaseEndTimer: string;
  allDaoProposals: Proposal[];
  governancePotBalance: BigNumber;
  claimingContractBalance: BigNumber;
  lowMajorityContractBalance: BigNumber;
  lowMajorityContractAddress: string;
  notEnoughGovernanceFunds: boolean;
  notEnoughLowMajorityFunds: boolean;

  initialize: () => Promise<void>;
  setActiveProposals: (proposals: Proposal[]) => void;
  getActiveProposals: () => Promise<void>;
  dismissProposal: (proposalId: string, reason: string) => Promise<void>;
  getStateString: (stateValue: string) => string;
  castVote: (proposalId: string, vote: number, reason: string) => Promise<void>;
  getProposalVotingStats: (proposalId: string) => Promise<TotalVotingStats>;
  createProposal: (type: string, title: string, discussionUrl: string, targets: string[], values: string[], callDatas: string[], description: string) => Promise<string>;
  getProposalTimestamp: (proposalId: string) => Promise<number>;
  timestampToDate: (timestamp: string) => string;
  getHistoricProposals: () => Promise<void>;
  getProposalTimeline: (proposalId: string) => Promise<any>;
  finalizeProposal: (proposalId: string) => Promise<string>;
  getCachedProposals: () => Proposal[];
  getProposalDetails: (proposalId: string) => Promise<Proposal>;
  setProposalsState: (proposals: Proposal[]) => Promise<void>;
  getHistoricProposalsEvents: () => Promise<Array<string>>;
  getMyVote: (proposalId: string, myAddr: string) => Promise<Vote>;
  getProposalVotes: (proposalId: string) => Promise<ProposalVotesResult>;
  executeProposal: (proposalId: string) => Promise<string>;
  getDaoPotBalanceChange: (blocksAgo: number) => Promise<{ changePercentage: string | null, absoluteChange: string, direction: string }>;
  getProposalThreshold: (proposalType: string, proposal?: any) => number;
}

const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<{ children: ReactNode }>  = ({ children }) => {
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();
  
  const [daoPhaseCount, setDaoPhaseCount] = useState("1");
  const [proposalFee, setProposalFee] = useState<string>('0');
  const [events, setEvents] = useState<NodeJS.Timeout | null>(null);
  const [phaseEndTimer, setPhaseEndTime] = useState<string>('0h 0m');
  const [daoInitialized, setDaoInitialized] = useState<boolean>(false);
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
  const [allDaoProposals, setAllDaoProposals] = useState<Proposal[]>([]);
  const [notEnoughGovernanceFunds, setNotEnoughGovernanceFunds] = useState<boolean>(false);
  const [notEnoughLowMajorityFunds, setNotEnoughLowMajorityFunds] = useState<boolean>(false);
  const [governancePotBalance, setGovernancePotBalance] = useState<BigNumber>(BigNumber('0'));
  const [claimingContractBalance, setClaimingContractBalance] = useState<BigNumber>(BigNumber('0'));
  const [lowMajorityContractBalance, setLowMajorityContractBalance] = useState<BigNumber>(BigNumber('0'));
  const [lowMajorityContractAddress, setLowMajorityContractAddress] = useState<string>("");
  const [daoPhase, setDaoPhase] = useState<DaoPhase>({ daoEpoch: '', end: '', phase: '', start: '' });

  useEffect(() => {
    // localStorage.clear();
    async function fetchConfigAndInit() {
      const config = await getRuntimeConfig();
      setLowMajorityContractAddress(config.lowMajorityContractAddress || "0xDA0DA0DA0da0dA0Da0DA00da0DA0DA00000DeCaF");
      if (web3Context.web3Initialized) {
        initialize(config.lowMajorityContractAddress || "0xDA0DA0DA0da0dA0Da0DA00da0DA0DA00000DeCaF");
      }
    }
    fetchConfigAndInit();
  }, [web3Context.userWallet, web3Context.web3Initialized]);

  // Refresh proposal types when lowMajorityContractBalance is loaded
  useEffect(() => {
    if (daoInitialized && !lowMajorityContractBalance.isEqualTo(0) && activeProposals.length > 0) {
      getActiveProposals();
    }
  }, [lowMajorityContractBalance, daoInitialized]);

  // Recalculate warnings when balances change
  useEffect(() => {
    if (daoInitialized && activeProposals.length > 0) {
      calculateFundingWarnings(activeProposals);
    }
  }, [governancePotBalance, lowMajorityContractBalance, activeProposals.length]);

  const initialize = async (runtimeLowMajorityAddress?: string) => {
    if (daoInitialized) return;
    logger.log("[INFO] Initializing Dao Context");
    setDaoInitialized(true);

    web3Context.setContractsManager(web3Context.contractsManager);

    const pFee = await web3Context.contractsManager.daoContract.methods.createProposalFee().call();
    setProposalFee(pFee);

    const phase: DaoPhase = await web3Context.contractsManager.daoContract.methods.daoPhase().call();
    setDaoPhase(phase);

    const phaseCount = await web3Context.contractsManager.daoContract.methods.daoPhaseCount().call();
    setDaoPhaseCount(phaseCount);

    const governancePot =  await web3Context.contractsManager.daoContract.methods.governancePot().call();
    setGovernancePotBalance(BigNumber(governancePot).dividedBy(1e18));

    const runtimeConfig = await getRuntimeConfig();
    const claimingPot = await web3Context.web3.eth.getBalance(runtimeConfig.claimingContractAddress || "0xe0E6787A55049A90aAa4335D0Ff14fAD26B8e88e");
    setClaimingContractBalance(BigNumber(claimingPot).dividedBy(1e18));

    const lowMajAddr = runtimeLowMajorityAddress || lowMajorityContractAddress;
    const lowMajorityPot = await web3Context.web3.eth.getBalance(lowMajAddr);
    setLowMajorityContractBalance(BigNumber(lowMajorityPot).dividedBy(1e18));

    subscribeToEvents();
  }

  const handleErrorMsg = (err: any, alternateMsg: string) => {
    let errorMessage = alternateMsg;

    // Check for user rejection
    if (err.code === 4001 || err.message?.includes('User denied') || err.message?.includes('User rejected')) {
      toast.info('User denied transaction signature.');
      return;
    }

    // Try to extract meaningful error from various MetaMask error structures
    if (err.message) {
      // Check for execution reverted errors with reason
      const revertMatch = err.message.match(/execution reverted: (.+?)(?:\n|$)/);
      if (revertMatch) {
        errorMessage = revertMatch[1];
      }

      // Check for internal JSON-RPC error
      else if (err.data?.message) {
        errorMessage = err.data.message;
      }

      // Check for cause chain
      else if (err.cause?.message) {
        errorMessage = err.cause.message;
      }

      // Use the main message if it's user-friendly
      else if (!err.message.includes('Internal JSON-RPC error') && 
                !err.message.includes('EVM') &&
                err.message.length < 200) {
        errorMessage = err.message;
      }
    }

    // Try to decode via ABI/custom errors for more clarity
    try {
      const daoAbi: any = web3Context.contractsManager.daoContract.options.jsonInterface || [];
      const decodedMsg = formatTxError(web3Context.web3, daoAbi, err, errorMessage);
      if (decodedMsg) errorMessage = decodedMsg;
    } catch {}

    // Clean up common prefixes/suffixes
    errorMessage = errorMessage
      .replace(/^execution reverted:?\s*/i, '')
      .replace(/^err:\s*/i, '')
      .trim();

    toast.error(errorMessage);
    logger.error('Tx error details:', { message: err.message, cause: err.cause, data: err.data, stack: err.stack });
  }

  const getProposalTypeFromContract = (contractProposalType: string) => {
    switch (contractProposalType) {
      case '0':
        return {
          type: 'OPEN_LOW_MAJORITY',
          displayName: 'Open Low Majority',
          threshold: 0.33
        };
      case '1':
        return {
          type: 'CONTRACT_UPGRADE',
          displayName: 'Contract Upgrade',
          threshold: 0.50
        };
      case '2':
        return {
          type: 'ECOSYSTEM_PARAMETER_CHANGE',
          displayName: 'Ecosystem Parameter Change',
          threshold: 0.33
        };
      case '3':
        return {
          type: 'OPEN_HIGH_MAJORITY',
          displayName: 'Open High Majority',
          threshold: 0.50
        };
      default:
        return {
          type: 'UNKNOWN',
          displayName: 'Unknown',
          threshold: 0.33
        };
    }
  }

  const determineMajorityType = (targets: string[], values: string[]): 'Low Majority' | 'High Majority' => {
    // Check if it's a contract fill (targeting low majority contract)
    if (targets.some((target: string) =>
      target.toLowerCase() === lowMajorityContractAddress.toLowerCase())) {
      return 'High Majority';
    }
    
    // Calculate total requested amount for regular open proposals
    const totalRequestedAmount = values ? values.reduce((sum: BigNumber, value: string) => {
      return sum.plus(BigNumber(value || '0').dividedBy(1e18));
    }, BigNumber(0)) : BigNumber(0);
    
    // Check if amount exceeds low majority contract balance
    const isHighMajority = totalRequestedAmount.isGreaterThan(lowMajorityContractBalance);
    
    return isHighMajority ? 'High Majority' : 'Low Majority';
  }

  const getProposalTypeString = (contractProposalType: string, proposal?: any) => {
    const contractType = getProposalTypeFromContract(contractProposalType);
    
    // For Open proposals, we might want to add additional context
    if (contractType.type === 'OPEN_LOW_MAJORITY' || contractType.type === 'OPEN_HIGH_MAJORITY') {
      const values = proposal?.values || [];
      const targets = proposal?.targets || [];
      
      // Check if it's a contract fill (targeting low majority contract)
      if (targets.some((target: string) =>
        target.toLowerCase() === lowMajorityContractAddress.toLowerCase())) {
        return 'Contract Fill';
      }
      
      // Check if it involves payout
      const totalRequestedAmount = values.reduce((sum: BigNumber, value: string) => {
        return sum.plus(BigNumber(value || '0').dividedBy(1e18));
      }, BigNumber(0));
      
      if (totalRequestedAmount.isGreaterThan(0)) {
        return 'Open Payout';
      }
      
      return 'Open';
    }
    
    return contractType.displayName;
  }

  const getProposalThreshold = (contractProposalType: string): number => {
    const contractType = getProposalTypeFromContract(contractProposalType);
    return contractType.threshold * 100; // Return as percentage
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
            logger.error(`Error fetching logs with signature ${signature}:`, error);
            // Continue to the next signature if there's an error
        }
    }

    throw new Error("No events found for the given proposalId");
  };

  // Returns creation block + timestamp for a proposal by inspecting ProposalCreated logs
  const getProposalCreationBlock = async (proposalId: string): Promise<{ timestamp: number; blockNumber: number } | null> => {
    try {
      const daoContractAbi: any = web3Context.contractsManager.daoContract.options.jsonInterface;
      const eventSignatures = [
        web3Context.web3.utils.keccak256('ProposalCreated(address,uint256,address[],uint256[],bytes[],string,string,string)'),
        daoContractAbi.find((item: any) => item.name === 'ProposalCreated' && item.type === 'event')?.signature
      ].filter(Boolean);

      const proposalIdTopic = web3Context.web3.utils.padLeft(web3Context.web3.utils.toHex(proposalId), 64);

      for (const signature of eventSignatures) {
        try {
          const logs = await web3Context.web3.eth.getPastLogs({
            address: web3Context.contractsManager.daoContract.options.address,
            topics: [signature, null, proposalIdTopic],
            fromBlock: 0,
            toBlock: 'latest'
          });

          if (logs && logs.length > 0) {
            const blockNumber = logs[0].blockNumber;
            const block = await web3Context.web3.eth.getBlock(blockNumber);
            return { timestamp: block.timestamp as number, blockNumber };
          }
        } catch (err) {
          logger.error('Error reading ProposalCreated logs:', err);
        }
      }
    } catch (err) {
      logger.error('getProposalCreationBlock failed:', err);
    }

    return null;
  };

  // Build a timeline for a proposal by reading on-chain events: SwitchDaoPhase, VotingFinalized, ProposalExecuted
  const getProposalTimeline = async (proposalId: string) => {
    const daoAbi: any = web3Context.contractsManager.daoContract.options.jsonInterface;
    const result: any = {};

    try {
      const creation = await getProposalCreationBlock(proposalId);
      if (!creation) return null;
      result.createdAt = String(creation.timestamp);
      result.creationBlock = String(creation.blockNumber);

      const switchEvent = daoAbi.find((it: any) => it.name === 'SwitchDaoPhase' && it.type === 'event');
      if (switchEvent) {
        const sig = switchEvent.signature;
        const phaseTopic = web3Context.web3.utils.padLeft(web3Context.web3.utils.toHex(1), 64); // phase == 1

        try {
          const logs = await web3Context.web3.eth.getPastLogs({
            address: web3Context.contractsManager.daoContract.options.address,
            topics: [sig, phaseTopic],
            fromBlock: creation.blockNumber,
            toBlock: 'latest'
          });

          if (logs && logs.length > 0) {
            const log = logs[0];
            const decoded = web3Context.web3.eth.abi.decodeLog(switchEvent.inputs, log.data, log.topics.slice(1));
            result.votingStartAt = String(decoded.start || '');
            result.votingEndAt = String(decoded.end || '');
          }
        } catch (err) {
          logger.error('Error fetching SwitchDaoPhase logs:', err);
        }
      }

      const vfEvent = daoAbi.find((it: any) => it.name === 'VotingFinalized' && it.type === 'event');
      if (vfEvent) {
        const sig = vfEvent.signature;
        const proposalIdTopic = web3Context.web3.utils.padLeft(web3Context.web3.utils.toHex(proposalId), 64);
        try {
          const logs = await web3Context.web3.eth.getPastLogs({
            address: web3Context.contractsManager.daoContract.options.address,
            topics: [sig, null, proposalIdTopic],
            fromBlock: creation.blockNumber,
            toBlock: 'latest'
          });

          if (logs && logs.length > 0) {
            const log = logs[logs.length - 1];
            const block = await web3Context.web3.eth.getBlock(log.blockNumber);
            const decoded = web3Context.web3.eth.abi.decodeLog(vfEvent.inputs, log.data, log.topics.slice(1));
            const accepted = decoded.accepted;
            result.finalizedAt = String(block.timestamp as number);
            result.finalizedResult = accepted ? 'Accepted' : 'Declined';
          } else {
            result.finalizedResult = 'Pending';
          }
        } catch (err) {
          logger.error('Error fetching VotingFinalized logs:', err);
        }
      }

      const peEvent = daoAbi.find((it: any) => it.name === 'ProposalExecuted' && it.type === 'event');
      if (peEvent) {
        const sig = peEvent.signature;
        const proposalIdTopic = web3Context.web3.utils.padLeft(web3Context.web3.utils.toHex(proposalId), 64);
        try {
          const logs = await web3Context.web3.eth.getPastLogs({
            address: web3Context.contractsManager.daoContract.options.address,
            topics: [sig, null, proposalIdTopic],
            fromBlock: creation.blockNumber,
            toBlock: 'latest'
          });

          if (logs && logs.length > 0) {
            const log = logs[logs.length - 1];
            const block = await web3Context.web3.eth.getBlock(log.blockNumber);
            result.executedAt = String(block.timestamp as number);
          }
        } catch (err) {
          logger.error('Error fetching ProposalExecuted logs:', err);
        }
      }

      return result;
    } catch (err) {
      logger.error('getProposalTimeline failed:', err);
      return null;
    }
  };

  const getCachedProposals = () => {
    let cachedProposals: Proposal[] = [];
    const cachedProposalsString = localStorage.getItem('allDaoProposals');
    if (cachedProposalsString) {
      cachedProposals = JSON.parse(cachedProposalsString);
    }

    return cachedProposals;
  }

  const updateProposalsWithSameEpochSnapshot = async (daoEpoch: string, snapshotValue: string) => {
    try {
      const storedProposals = getCachedProposals();
      const proposalsToUpdate = storedProposals.filter(
        proposal => proposal.daoPhaseCount === daoEpoch && 
        (!proposal.totalStakeSnapshot || proposal.totalStakeSnapshot === "0")
      );

      if (proposalsToUpdate.length > 0) {
        // Update totalStakeSnapshot for all proposals with the same daoEpoch
        const updatedProposals = proposalsToUpdate.map(proposal => ({
          ...proposal,
          totalStakeSnapshot: snapshotValue
        }));

        await setProposalsState(updatedProposals);
      }
    } catch (error) {
      logger.error('Error updating proposals with same epoch snapshot:', error);
    }
  }

  const getProposalDetails = async (proposalId: string): Promise<Proposal> => {
    // Retrieve allDaoProposals from localStorage
    let updatedData: Proposal | undefined = getCachedProposals().find((proposal) => proposal.id === proposalId);
    let proposalDetails;
    let proposalTimestamp;

    const proposalVotes = await web3Context.contractsManager.daoContract.methods.getProposalVotersCount(proposalId).call();
    
    if (!updatedData) updatedData = initializeProposal(proposalId);

    try {
    if (updatedData && (!updatedData.proposer || !['1', '5', '6'].includes(updatedData.state))) {
      proposalDetails = await web3Context.contractsManager.daoContract.methods.getProposal(proposalId).call();
      const rawType = proposalDetails?.[11] || "3";
      updatedData = {
        ...updatedData,
        ...proposalDetails,
        values: proposalDetails?.[4],
        daoPhaseCount: proposalDetails?.[9] || "1",
        rawProposalType: rawType,
        proposalType: getProposalTypeString(rawType, { values: proposalDetails?.[4], targets: proposalDetails?.[3] }),
      };
      } if (updatedData && !updatedData.timestamp) {
        proposalTimestamp = await getProposalTimestamp(proposalId);
        updatedData.timestamp = proposalTimestamp.toString();
      }
    } catch (error) {}

    const votingStats = await getProposalVotingStats(proposalId);
    
    // Get or calculate totalStakeSnapshot
    let totalStakeForCalculation = "0";
    if (updatedData) {
      // Check if we need to fetch/update the snapshot
      if (!updatedData.totalStakeSnapshot || updatedData.totalStakeSnapshot === "0") {
        try {
          const daoEpoch = updatedData.daoPhaseCount || "1";
          const snapshotValue = await web3Context.contractsManager.daoContract?.methods.daoEpochTotalStakeSnapshot(daoEpoch).call() || "0";
          
          if (snapshotValue !== "0") {
            // Update this proposal with the snapshot
            updatedData.totalStakeSnapshot = snapshotValue;
            totalStakeForCalculation = snapshotValue;
            
            // Update all proposals with the same daoEpoch in localStorage
            await updateProposalsWithSameEpochSnapshot(daoEpoch, snapshotValue);
          } else {
            // Fallback to current totalStake if snapshot not available
            totalStakeForCalculation = await web3Context.contractsManager.stContract?.methods.totalStakedAmount().call() || "0";
            updatedData.totalStakeSnapshot = "0"; // Keep as 0 to indicate snapshot not yet available
          }
        } catch (error) {
          // Fallback to current totalStake on error
          totalStakeForCalculation = await web3Context.contractsManager.stContract?.methods.totalStakedAmount().call() || "0";
          updatedData.totalStakeSnapshot = "0";
        }
      } else {
        // Use cached snapshot value
        totalStakeForCalculation = updatedData.totalStakeSnapshot;
      }
    } else {
      // For new proposals, use current totalStake
      totalStakeForCalculation = await web3Context.contractsManager.stContract?.methods.totalStakedAmount().call() || "0";
    }

    if (updatedData) {
      updatedData["id"] = proposalId;
      updatedData["votes"] = proposalVotes;
      updatedData['exceedingYes'] = BigNumber.max(0, BigNumber(votingStats.positive).minus(votingStats.negative)).dividedBy(totalStakeForCalculation).multipliedBy(100).toFixed(4)
      updatedData['participation'] = BigNumber(votingStats.total).dividedBy(totalStakeForCalculation).multipliedBy(100).toFixed(4)
    }

    return updatedData || initializeProposal(proposalId);
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
      rawProposalType: '',
      proposalType: '',
      participation: '0',
      exceedingYes: '0',
      totalStakeSnapshot: '0'
    };
  }

  const getActiveProposals = async () => {
    logger.log("[INFO] Getting active proposals");
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
    logger.log("[INFO] All active proposals fetched and updated");
    
    // Calculate warning states after all proposals are loaded
    calculateFundingWarnings(proposalDetails);
  }

  const calculateFundingWarnings = (proposals: Proposal[]) => {
    let totalHighMajorityRequested = BigNumber(0);
    let totalLowMajorityRequested = BigNumber(0);

    proposals.forEach(proposal => {
      // Only consider active/created proposals that have values (funding requests)
      if (proposal.state === "0" && proposal.values && proposal.values.length > 0) {
        // Calculate total requested amount
        const proposalAmount = proposal.values.reduce((sum: BigNumber, value: string) => {
          return sum.plus(BigNumber(value || '0').dividedBy(1e18));
        }, BigNumber(0));

        // Determine proposal majority
        if (proposal.rawProposalType === "3") {// High Majority proposals
          totalHighMajorityRequested = totalHighMajorityRequested.plus(proposalAmount);
        } else if (proposal.rawProposalType === "0") { // Low Majority proposals 
          totalLowMajorityRequested = totalLowMajorityRequested.plus(proposalAmount);
        }
      }
    });

    // Update warning flags
    const highMajorityExceeds = totalHighMajorityRequested.isGreaterThan(governancePotBalance);
    const lowMajorityExceeds = totalLowMajorityRequested.isGreaterThan(lowMajorityContractBalance);

    setNotEnoughGovernanceFunds(highMajorityExceeds);
    setNotEnoughLowMajorityFunds(lowMajorityExceeds);
  }

  const getProposalVotingStats = (proposalId: string): Promise<TotalVotingStats> => {
    logger.log("[INFO] Getting Proposal Voting Stats")
    let stats = { positive: new BigNumber(0), negative: new BigNumber(0), total: new BigNumber(0)};
    return new Promise(async (resolve, reject) => {
        try {
          const proposalVoters = await web3Context.contractsManager.daoContract.methods.getProposalVoters(proposalId).call();

          if (!proposalVoters?.length) return resolve(stats);
          
          let stakeNo = new BigNumber(0);
          let stakeYes = new BigNumber(0);
          let totalStake = new BigNumber(0);

          const votingStats = await web3Context.contractsManager.daoContract.methods.countVotes(proposalId).call();

          if (votingStats) {
            stakeNo = new BigNumber(votingStats[3]);
            stakeYes = new BigNumber(votingStats[2]);

            totalStake = stakeNo.plus(stakeYes);
          }
          
          stats = {
            positive: stakeYes,
            negative: stakeNo,
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
        if (daoPhase.phase !== "0") {
          toast.warn("Cannot propose in voting phase");
          return reject("Cannot propose in voting phase");
        }
        if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
        if (await getProposalExists(targets, values, callDatas, description)) {
          toast.warn("Proposal already exists");
          return reject("Proposal already exists");
        }

        try {
          // Pre-validate provider readiness
          const ready = await web3Context.ensureProviderReady();
          if (!ready) {return reject("Provider not ready");}

          web3Context.showLoader(true, "Creating proposal 💎");
          
          let proposalTypeEnum = 0;
          if (type === 'open') {
            const majorityType = determineMajorityType(targets, values);
            proposalTypeEnum = majorityType === 'High Majority' ? 1 : 0;
          } else if (type === 'low-majority-fill') {
            proposalTypeEnum = 1;
          }

          const gasPrice = await web3Context.getGasPriceSafe();
          const method = web3Context.contractsManager.daoContract.methods.propose(
            targets,
            values,
            callDatas,
            title,
            description,
            discussionUrl,
            proposalTypeEnum
          );
          await method.send(await buildTxOptions(method, { from: web3Context.userWallet.myAddr, gasPrice, value: proposalFee }));
          const proposalId = await web3Context.contractsManager.daoContract.methods.hashProposal(
            targets, values, callDatas, description
          ).call();
          web3Context.showLoader(false, "");
          toast.success("Proposal Created 💎");
          resolve(proposalId);
        } catch(err: any) {
          logger.log(err);
          web3Context.showLoader(false, "");
          handleErrorMsg(err, "Proposal creation failed");
          reject("");
        }
    });
  };

  const dismissProposal = async (proposalId: string, reason: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
  
        // Pre-validate provider readiness
        const ready = await web3Context.ensureProviderReady();
        if (!ready) {return reject("Provider not ready");}

        web3Context.showLoader(true, "Dismissing proposal 💎");
        try {       
          const gasPrice = await web3Context.getGasPriceSafe();
          const method = web3Context.contractsManager.daoContract.methods.cancel(proposalId, reason);
          await method.send(await buildTxOptions(method, { from: web3Context.userWallet.myAddr, gasPrice }));
          web3Context.showLoader(false, "");
          toast.success("Proposal Dismissed 💎");
          resolve();
        } catch(err: any) {
          logger.error(err);
          web3Context.showLoader(false, "");
          handleErrorMsg(err, "Proposal dismissal failed");
          reject(err);
        }
    });
  };

  const castVote = async (proposalId: string, vote: number, reason: string) => {
    logger.log("[INFO] Casting vote", proposalId, vote, reason);
    return new Promise<void>(async (resolve, reject) => {
      if (!web3Context.ensureWalletConnection()) return reject("Wallet not connected");
      
      // Pre-validate provider readiness
      const ready = await web3Context.ensureProviderReady();
      if (!ready) {return reject("Provider not ready");}

      web3Context.showLoader(true, `Casting vote 💎`);
      try {
        // Check if user has already voted on this proposal
        const existingVote = await getMyVote(proposalId.toString(), web3Context.userWallet.myAddr);
        const hasVotedBefore = Number(existingVote.timestamp) > 0;

        const gasPrice = await web3Context.getGasPriceSafe();
        const from = web3Context.userWallet.myAddr;

        if (hasVotedBefore) {
          // User has voted before - use changeVote function
          const method = web3Context.contractsManager.daoContract.methods.changeVote(proposalId, vote, reason);
          await method.send(await buildTxOptions(method, { from, gasPrice }));
          toast.success(`Vote Changed 💎`);
        } else {
          // First-time voting - use vote or voteWithReason
          if (reason.length > 0) {
            const method = web3Context.contractsManager.daoContract.methods.voteWithReason(proposalId, vote, reason);
            await method.send(await buildTxOptions(method, { from, gasPrice }));
          } else {
            const method = web3Context.contractsManager.daoContract.methods.vote(proposalId, vote);
            await method.send(await buildTxOptions(method, { from, gasPrice }));
          }
          toast.success(`Vote Casted 💎`);
        }
        
        web3Context.showLoader(false, "");
        resolve();
      } catch(err: any) {
        logger.log(err);
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
              logger.log("Phase changed");
              
              try {
                getActiveProposals();
                getHistoricProposals();
              } catch (proposalError) {
                logger.error("Error fetching proposals:", proposalError);
              }
              
              // Fetch daoPhaseCount with error handling
              web3Context.contractsManager.daoContract.methods.daoPhaseCount().call()
                .then(count => setDaoPhaseCount(count))
                .catch(countError => logger.error("Error fetching daoPhaseCount:", countError));
  
              return phase;
            }
            return prevPhase;
          });
  
          setPhaseTimer(phase);
        } catch (error) {
          logger.error("Error fetching daoPhase:", error);
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
    logger.log("[INFO] Getting historic proposals");
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

    logger.log("[INFO] All historic proposals fetched and updated");
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
    
    // Update warning states when proposals are updated
    const activeProposals = updatedStoredProposals.filter(p => 
      Number(p.daoPhaseCount) === Number(daoPhaseCount) && p.state !== "1" // Not dismissed
    );
    calculateFundingWarnings(activeProposals);
  };

  const finalizeProposal = async (proposalId: string) => {
    return new Promise<string>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return resolve("");

        // Pre-validate provider readiness
        const ready = await web3Context.ensureProviderReady();
        if (!ready) {return reject("Provider not ready");}

        web3Context.showLoader(true, "Finalizing proposal 💎");
        try {
          const gasPrice = await web3Context.getGasPriceSafe();
          await web3Context.contractsManager.daoContract.methods.finalize(proposalId).send({ from: web3Context.userWallet.myAddr, gasPrice });
          const proposalUpdated = await getProposalDetails(proposalId);
          await setProposalsState([proposalUpdated]);
          web3Context.showLoader(false, "");
          toast.success("Proposal Finalized 💎");
          resolve("success");
        } catch(err: any) {
          logger.error(err);
          web3Context.showLoader(false, "");
          handleErrorMsg(err, "Proposal finalization failed");
          resolve("failed");
        }
    });
  }

  const getProposalVotes = async (proposalId: string): Promise<ProposalVotesResult> => {
    const daoContract = web3Context.contractsManager.daoContract;
    const voters: string[] = await daoContract.methods.getProposalVoters(proposalId).call();

    if (!voters?.length) {
      clearVotesCache(proposalId);
      return { votes: [], stakeSource: 'live' };
    }

    const proposal: any = await daoContract.methods.proposals(proposalId).call();
    const state = Number(proposal?.state ?? 0);
    const votingDaoEpoch = String(proposal?.votingDaoEpoch ?? '0');

    const useSnapshot = state >= PROPOSAL_STATE_VOTING_FINISHED;
    const stakeSource: 'snapshot' | 'live' = useSnapshot ? 'snapshot' : 'live';

    const fingerprint = await buildVotesFingerprint(proposalId, voters, state);
    const cached = readVotesCache(proposalId);
    if (cached && cached.fingerprint === fingerprint) {
      return { votes: cached.votes, stakeSource };
    }

    const collected: ProposalVote[] = [];

    for (let i = 0; i < voters.length; i += VOTES_FETCH_CHUNK_SIZE) {
      const chunk = voters.slice(i, i + VOTES_FETCH_CHUNK_SIZE);

      const chunkVotes = await Promise.all(chunk.map(async (voter): Promise<ProposalVote> => {
        const [record, stake] = await Promise.all([
          daoContract.methods.votes(proposalId, voter).call(),
          getVoterStake(voter, votingDaoEpoch, useSnapshot),
        ]);

        return {
          voter,
          vote: String((record as any)?.vote ?? (record as any)?.[1] ?? ''),
          reason: String((record as any)?.reason ?? (record as any)?.[2] ?? ''),
          timestamp: String((record as any)?.timestamp ?? (record as any)?.[0] ?? '0'),
          stake: String(stake ?? '0'),
        };
      }));

      collected.push(...chunkVotes);
    }

    const sorted = sortVotesByRecency(collected);
    writeVotesCache(proposalId, { fingerprint, votes: sorted });

    return { votes: sorted, stakeSource };
  };

  const getVoterStake = async (voter: string, votingDaoEpoch: string, useSnapshot: boolean): Promise<string> => {
    try {
      if (useSnapshot) {
        return await web3Context.contractsManager.daoContract.methods
          .daoEpochStakeSnapshot(votingDaoEpoch, voter)
          .call();
      }
      const stakingContract = web3Context.contractsManager.stContract;
      if (!stakingContract) return '0';
      return await stakingContract.methods.stakeAmountTotal(voter).call();
    } catch (error) {
      logger.error(error);
      return '0';
    }
  };

  const buildVotesFingerprint = async (proposalId: string, voters: string[], state: number): Promise<string> => {
    const roster = voters.map((voter) => voter.toLowerCase()).sort().join(',');
    let tally = 'unavailable';

    try {
      const counted: any = await web3Context.contractsManager.daoContract.methods.countVotes(proposalId).call();
      tally = [counted?.countYes, counted?.countNo, counted?.stakeYes, counted?.stakeNo].join(':');
    } catch {}

    return `${state}|${tally}|${roster}`;
  };

  const getMyVote = async (proposalId: string, myAddr: string): Promise<Vote> => {
    return await web3Context.contractsManager.daoContract.methods
      .votes(proposalId, myAddr)
      .call();
  };

  const executeProposal = async (proposalId: string) => {
    return new Promise<string>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return resolve("");
        let proposalDetails = await getProposalDetails(proposalId);
        if (proposalDetails.proposalType == 'Contract Upgrade' &&  proposalDetails.proposer !== web3Context.userWallet.myAddr) {
          toast.warn("Only proposer can execute the proposal");
          return resolve("failed");
        }

        // Pre-validate provider readiness
        const ready = await web3Context.ensureProviderReady();
        if (!ready) {return reject("Provider not ready");}

        web3Context.showLoader(true, "Executing proposal 💎");
        try {
          const gasPrice = await web3Context.getGasPriceSafe();
          await web3Context.contractsManager.daoContract.methods.execute(proposalId).send({ from: web3Context.userWallet.myAddr, gasPrice });
          proposalDetails = await getProposalDetails(proposalId);
          await setProposalsState([proposalDetails]);
          await postProposalExecutionUpdates(proposalId); // Update parameters if ECP
          web3Context.showLoader(false, "");
          toast.success("Proposal Executed 💎");
          resolve("success");
        } catch(err: any) {
          logger.error(err);
          web3Context.showLoader(false, "");
          handleErrorMsg(err, "Proposal execution failed");
          resolve("failed");
        }
    });
  }

  const decodeEcosystemParameterCalldata = (calldata: string) => {
    try {
      // Remove '0x' prefix and get function selector (first 4 bytes)
      const functionSelector = calldata.slice(0, 10);

      // Map of function selectors to their corresponding parameter update methods
      const selectorToParameterMap: { [key: string]: { contractType: string, method: string, updateFunction: () => Promise<void> } } = {
        [getFunctionSelector('setCreateProposalFee(uint256)')]: {
          contractType: 'dao',
          method: 'createProposalFee',
          updateFunction: async () => {
            const pFee = await web3Context.contractsManager.daoContract.methods.createProposalFee().call();
            setProposalFee(pFee);
            logger.log(`[INFO] Updated createProposalFee to ${pFee}`);
          }
        },
        [getFunctionSelector('setDelegatorMinStake(uint256)')]: {
          contractType: 'staking',
          method: 'delegatorMinStake',
          updateFunction: async () => {
            stakingContext.retrieveGlobalValues();
            logger.log(`[INFO] Updated delegatorMinStake`);
          }
        },
        [getFunctionSelector('setStandByFactor(uint256)')]: {
          contractType: 'bonus-score-system',
          method: 'standByFactor',
          updateFunction: async () => {
            logger.log(`[INFO] Updated standByFactor`);
          }
        },
      };

      const parameterInfo = selectorToParameterMap[functionSelector];
      if (parameterInfo) {
        logger.log(`[INFO] Detected ${parameterInfo.method} parameter change on ${parameterInfo.contractType} contract`);
        return parameterInfo;
      }

      return null;
    } catch (error) {
      logger.error('Error decoding ecosystem parameter calldata:', error);
      return null;
    }
  };

  const postProposalExecutionUpdates = async (proposalId: string) => {
    const proposalDetails = await getProposalDetails(proposalId);

    if (proposalDetails.proposalType === 'Ecosystem Parameter Change') {
      // Decode calldata to determine which specific parameter was changed
      if (proposalDetails.calldatas && proposalDetails.calldatas.length > 0) {
        const calldata = proposalDetails.calldatas[0];
        
        const parameterInfo = decodeEcosystemParameterCalldata(calldata);
        
        if (parameterInfo) {
          try {
            await parameterInfo.updateFunction();
            logger.log(`[INFO] Successfully updated ${parameterInfo.method}`);
            return;
          } catch (error) {
            logger.error(`Error updating ${parameterInfo.method}:`, error);
          }
        }
      }
    }

    const pFee = await web3Context.contractsManager.daoContract.methods.createProposalFee().call();
    setProposalFee(pFee);

    // Refresh balances
    const governancePot =  await web3Context.contractsManager.daoContract.methods.governancePot().call();
    setGovernancePotBalance(BigNumber(governancePot).dividedBy(1e18));

    const runtimeConfig = await getRuntimeConfig();
    const claimingPot = await web3Context.web3.eth.getBalance(runtimeConfig.claimingContractAddress || "0xe0E6787A55049A90aAa4335D0Ff14fAD26B8e88e");
    setClaimingContractBalance(BigNumber(claimingPot).dividedBy(1e18));

    const lowMajorityPot = await web3Context.web3.eth.getBalance(lowMajorityContractAddress);
    setLowMajorityContractBalance(BigNumber(lowMajorityPot).dividedBy(1e18));
  }

  const getDaoPotBalanceChange = async (blocksAgo: number) => {
    const currentBlockNumber = await web3Context.web3.eth.getBlockNumber();
    const currentBalance = await web3Context.web3.eth.getBalance(web3Context.contractsManager.daoContract.options.address);
    
    const pastBlockNumber = currentBlockNumber - blocksAgo;
    const pastBalance = await web3Context.web3.eth.getBalance(web3Context.contractsManager.daoContract.options.address, pastBlockNumber);
    
    const past = BigNumber(pastBalance);
    const balanceChange = BigNumber(currentBalance).minus(past);
    const absoluteChange = balanceChange.dividedBy(1e18).toFixed(4);

    if (balanceChange.isZero()) {
      return { changePercentage: '0.00', absoluteChange, direction: 'neutral', blocks: blocksAgo };
    }

    if (past.isZero()) {
      return { changePercentage: null, absoluteChange, direction: 'neutral', blocks: blocksAgo };
    }

    const percentageChange = balanceChange.dividedBy(past).multipliedBy(100);
    if (!percentageChange.isFinite()) {
      return { changePercentage: null, absoluteChange, direction: 'neutral', blocks: blocksAgo };
    }

    return {
      changePercentage: percentageChange.toFixed(2),
      absoluteChange,
      direction: percentageChange.isGreaterThan(0) ? 'positive' : 'negative',
      blocks: blocksAgo
    };
  }

  const contextValue = {
    // states
    daoPhase,
    proposalFee,
    daoPhaseCount,
    phaseEndTimer,
    daoInitialized,
    activeProposals,
    allDaoProposals,
    governancePotBalance,
    claimingContractBalance,
    lowMajorityContractBalance,
    lowMajorityContractAddress,
    notEnoughGovernanceFunds,
    notEnoughLowMajorityFunds,

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
    getProposalTimeline,
    finalizeProposal,
    getCachedProposals,
    getProposalDetails,
    setProposalsState,
    getHistoricProposalsEvents,
    getMyVote,
    getProposalVotes,
    setActiveProposals,
    executeProposal,
    getDaoPotBalanceChange,
    getProposalThreshold
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
