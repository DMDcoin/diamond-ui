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
