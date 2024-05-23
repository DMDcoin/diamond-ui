import Web3 from "web3";


import { ReactNode } from "react";

export interface StakingContextState {
  initialized: boolean;
  handlingNewBlock: boolean;
  // contracts: ContractManager;
  // vsContract: ValidatorSetHbbft;
  // stContract?: StakingHbbft;
  // brContract?: BlockRewardHbbftCoins;
  // kghContract?: KeyGenHistory;
  // rngContract?: RandomHbbft;
  showAllPools: boolean;
  isShowHistoric: boolean;
  isReadingData: boolean;
  lastError?: unknown;
  showHistoricBlock: number;
  defaultTxOpts: any;
  newBlockPolling?: NodeJS.Timeout;
}

export interface ContextProviderProps {
  children: ReactNode;
}

export interface Delegator {
  address: string;
  amount: string;
}