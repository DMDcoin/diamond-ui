import { observable, computed } from 'mobx';
import { Pool } from './model';
import BN from 'bn.js';


export class Context {

  //public web3!: Web3;

  @observable public stakingEpoch: number = 0;

  @observable public keyGenRound: number = 0;

  @observable public currentBlockNumber: number = 0;

  @observable public latestBlockNumber: number = 0;

  @observable public currentTimestamp: any;

  @observable public myAddr!: string;

  // in Ether (not wei!)
  // TODO: initializing to 0 is a lazy shortcut
  @observable public myBalance: BN  = new BN(0);

  public coinSymbol = 'DMD';

  @observable public epochDuration: number = 0; // currently not changeable

  public stakeWithdrawDisallowPeriod!: number;

  public candidateMinStake: BN = new BN(0);

  public delegatorMinStake: BN = new BN(0);

  // public hasWeb3BrowserSupport = false;

  @observable public epochStartBlock!: number;

  @observable public epochStartTime!: number;

  @observable public stakingEpochEndTime!: number;
  

  @observable public deltaPot!: string;

  @observable public reinsertPot!: string;

  // TODO: find better name
  @observable public canStakeOrWithdrawNow = false;

  // positive value: allowed for n more blocks
  // negative value: allowed in n blocks
  @observable public stakingAllowedTimeframe = 0;

  @observable public isSyncingPools = true;

  @observable public pools: Pool[] = [];

  @observable public currentValidators: string[] = [];

  // list of validators, where no pool is available.
  // this can happen, in situations,
  // where the first node(s) should take over ownership of the
  // network, but they can't.
  @observable public currentValidatorsWithoutPools: string[] = [];

  @observable public numbersOfValidators: number = 0;

  @computed get myPool(): Pool | undefined {
    return this.pools.filter((p) => p.stakingAddress === this.myAddr)[0];
  }

  @computed get epochStartTimeFormatted() : string {
    return new Date(this.epochStartTime * 1000).toLocaleString();
  }

  @computed
  public get iHaveAPool(): boolean {
    return this.myPool !== undefined;
  }

 }
