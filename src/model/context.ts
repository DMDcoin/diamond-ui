
import { observable } from 'mobx';
import { Pool } from './model';


export default class Context {


  @observable public currentBlockNumber!: number;

  @observable public currentTimestamp!: any;

  @observable public myAddr!: string;

  // in Ether (not wei!)
  // TODO: initializing to 0 is a lazy shortcut
  @observable public myBalance: string = '0';

  public coinSymbol = 'DMD';

  public epochDuration!: number; // currently not changeable

  public candidateMinStake!: string;

  public delegatorMinStake!: string;

  public hasWeb3BrowserSupport = false;



  @observable public epochStartBlock!: number;

  @observable public epochStartTime!: number;

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

 }
