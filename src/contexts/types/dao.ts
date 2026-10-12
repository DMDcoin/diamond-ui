import BigNumber from "bignumber.js";

export interface Proposal {
  title: string;
  proposer: string;
  state: string;
  targets: string[];
  values: string[] | undefined;
  calldatas: string[];
  description: string;
  votes: string | undefined;
  id: string;
  timestamp: string;
  daoPhaseCount: string;
  rawProposalType: string;
  proposalType: string;
  participation: string;
  exceedingYes: string;
  totalStakeSnapshot: string;
  createdAt?: string;
  creationBlock?: string;
  votingStartAt?: string;
  votingEndAt?: string;
  finalizedAt?: string;
  finalizedResult?: 'Accepted' | 'Declined' | 'Pending' | string;
  executedAt?: string;
}

export interface TotalVotingStats {
  positive: BigNumber;
  negative: BigNumber;
  total: BigNumber;
}

export interface Vote {
  timestamp: string;
  vote: string;
  reason: string;
}

export interface DaoPhase {
  daoEpoch: string;
  end: string;
  phase: string;
  start: string;
}

export interface ProposalVote {
  voter: string;
  vote: string;
  reason: string;
  timestamp: string;
  stake: string;
}

export interface ProposalVotesResult {
  votes: ProposalVote[];
  stakeSource: 'snapshot' | 'live';
}
