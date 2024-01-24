import Web3 from "web3";
import { UserWallet } from "../services/blockchain/models/wallet";
import { Context } from "../services/blockchain/models/context";
import { ContractManager } from "../services/blockchain/models/contractManager";
import {
  BlockRewardHbbftCoins,
  KeyGenHistory,
  RandomHbbft,
  StakingHbbft,
  ValidatorSetHbbft,
} from "../services/blockchain/contracts";
import { ReactNode } from "react";

export interface StakingContextState {
  initialized: boolean;
  context: Context;
  handlingNewBlock: boolean;
  contracts: ContractManager;
  vsContract: ValidatorSetHbbft;
  stContract?: StakingHbbft;
  brContract?: BlockRewardHbbftCoins;
  kghContract?: KeyGenHistory;
  rngContract?: RandomHbbft;
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
