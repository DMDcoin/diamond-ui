export interface Validator {
  id: string;
  status: 'active' | 'valid' | 'invalid';
  walletAddress: string;
  minerAddress: string;
  publicKey: string;
  totalStake: string;
  votingPower: string;
  score: number;
  cr: number;
  myStake: string;
  canStake: boolean;
  canUnstake: boolean;
}

export interface ValidatorMetrics {
  totalValidators: number;
  activeValidators: number;
  validValidators: number;
  invalidValidators: number;
}

export interface VisibleColumns {
  status: boolean;
  wallet: boolean;
  miner: boolean;
  publickey: boolean;
  stake: boolean;
  voting: boolean;
  score: boolean;
  cr: boolean;
  mystake: boolean;
  actions: boolean;
}
