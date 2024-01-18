// eslint-disable-next-line @typescript-eslint/no-unused-vars
import BN from 'bn.js';
import { Pool } from './model';

export class Context {
  public pools: Pool[] = [];

  public stakingEpoch: number = 0;

  public keyGenRound: number = 0;

  public currentBlockNumber: number = 0;

  public latestBlockNumber: number = 0;

  public currentTimestamp: any;

  public coinSymbol = 'DMD';

  public epochDuration: number = 0;

  public stakeWithdrawDisallowPeriod!: number;

  public candidateMinStake: BN = new BN(0);

  public delegatorMinStake: BN = new BN(0);

  public minimumGasFee: BN = new BN(0);

  public epochStartBlock!: number;

  public epochStartTime!: number;

  public stakingEpochEndTime!: number;

  public deltaPot!: string;

  public daoPot!: string;

  public reinsertPot!: string;

  // TODO: find better name
  public canStakeOrWithdrawNow = false;

  // positive value: allowed for n more blocks
  // negative value: allowed in n blocks
  public stakingAllowedTimeframe = 0;

  public isSyncingPools = true;

  public currentValidators: string[] = [];

  // list of validators, where no pool is available.
  // this can happen, in situations,
  // where the first node(s) should take over ownership of the
  // network, but they can't.
  public currentValidatorsWithoutPools: string[] = [];

  public numbersOfValidators: number = 0;

  get epochStartTimeFormatted(): string {
    return new Date(this.epochStartTime * 1000).toLocaleString();
  }

  get minimumGasFeeFormatted(): string {
    return this.minimumGasFee.toNumber().toString();
  }
}
