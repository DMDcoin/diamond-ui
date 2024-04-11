import BigNumber from "bignumber.js";

export interface Proposal {
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
  proposalType: string;
}

export interface TotalVotingStats {
  positive: BigNumber;
  negative: BigNumber;
  total: BigNumber;
}

export interface Vote {
  timestamp: Number;
  vote: Number;
  reason: string;
}