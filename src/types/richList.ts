export interface RichListRow {
  address: string;
  wallet: string;
  ownStake: string;
  delegatedOut: string;
  total: string;
  isPool: boolean;
}

export interface RichListSnapshot {
  blockNumber: string;
  blockTimestamp: number;
  generatedAt: number;
  totalSupply: string;
  holders: number;
  rows: RichListRow[];
}

export interface RichListEntry {
  rank: number;
  address: string;
  wallet: bigint;
  ownStake: bigint;
  delegatedOut: bigint;
  total: bigint;
  isPool: boolean;
}
