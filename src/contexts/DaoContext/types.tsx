export interface Proposal {
  proposer: string;
  votingDaoEpoch: string;
  state: string;
  targets: string[];
  values: string[];
  calldatas: string[];
  description: string;
  votes: string;
  id: string;
}
