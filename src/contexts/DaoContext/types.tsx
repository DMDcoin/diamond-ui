export interface Proposal {
  proposer: string;
  votingDaoEpoch: string;
  state: string;
  targets: string[];
  values: string[] | undefined;
  calldatas: string[];
  description: string;
  votes: string | undefined;
  id: string;
  timestamp: string;
  type: string;
}

export interface TotalVotingStats {
  positive: number;
  negative: number;
}
