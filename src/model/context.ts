// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { observable, makeAutoObservable } from 'mobx';
import { Pool } from './model';
import BN from 'bn.js';


export class Context {

  constructor() {
    makeAutoObservable(this);
  }

  //public web3!: Web3;

  public stakingEpoch: number = 0;

  public keyGenRound: number = 0;

  public currentBlockNumber: number = 0;

  public latestBlockNumber: number = 0;

  public currentTimestamp: any;

  public myAddr!: string;

  // in Ether (not wei!)
  // TODO: initializing to 0 is a lazy shortcut
  public myBalance: BN  = new BN(0);

  public coinSymbol = 'DMD';

  public epochDuration: number = 0; // currently not changeable

  public stakeWithdrawDisallowPeriod!: number;

  public candidateMinStake: BN = new BN(0);

  public delegatorMinStake: BN = new BN(0);

  public minimumGasFee: BN = new BN(0);

  // public hasWeb3BrowserSupport = false;

  public epochStartBlock!: number;

  public epochStartTime!: number;

  public stakingEpochEndTime!: number;
  

  public deltaPot!: string;

  public reinsertPot!: string;

  // TODO: find better name
  public canStakeOrWithdrawNow = false;

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
  public currentValidatorsWithoutPools: string[] = [];

  public numbersOfValidators: number = 0;

  get myPool(): Pool | undefined {
    return this.pools.filter((p) => p.stakingAddress === this.myAddr)[0];
  }

  get epochStartTimeFormatted() : string {
    return new Date(this.epochStartTime * 1000).toLocaleString();
  }

  get minimumGasFeeFormatted() : string {
    return this.minimumGasFee.toNumber().toString();
  }

    public get iHaveAPool(): boolean {
    return this.myPool !== undefined;
  }
 }
