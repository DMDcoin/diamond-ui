
import BN from 'bn.js';
import { observable } from 'mobx';
import { Context } from './context';

export class ClaimableStake {

  public amount: BN = new BN(0);
  public unlockEpoch: number = 0;

  public constructor(public pool: Pool) {
  }
  
  public canClaimNow(): boolean {
    return this.amount.gt(new BN(0))  && this.unlockEpoch <= this.pool.context.stakingEpoch;
  }
}


// @observable
export class Pool {

  public constructor(context: Context) {
    this.context = context;
  }

  public context: Context;



  // public isUpdating: boolean = false;

  public isActive: boolean = false; // currently "active" pool
  public isToBeElected: boolean = false; // is to be elected.
  public isPendingValidator: boolean = false; // pending validator for the next staking epoch.
  public isAvailable: boolean = false;

  public stakingAddress: string = '';
  public ensName: string = '';
  public miningAddress: string = '';
  public miningPublicKey: string = '';
  public addedInEpoch: number = 0;
  public isCurrentValidator: boolean = false;

  public candidateStake: BN = new BN(0);
  public totalStake: BN = new BN(0);
  public myStake: BN = new BN(0);

  public claimableStake: ClaimableStake = new ClaimableStake(this);
  public delegators: Array<Delegator> = []; // TODO: how to cast to Array<IDelegator> ?
  public isMe: boolean = false;
  public validatorStakeShare: number = 0; // percent
  public validatorRewardShare: number = 0; // percent
  public claimableReward: string = '0';
  
  public isBanned(): boolean {
    return this.bannedUntil.gt(this.context.currentTimestamp);
  }
  
  public bannedUntil: BN = new BN('0');

  public banCount: number = 0;

  public parts: string = ''; // if part of the treshhold key, or pending validator, this holds the PARTS
  public numberOfAcks: number = 0; // if part of the treshhold key, or pending validator, this holds the number of ACKS

  // availability
  public availableSince: BN = new BN(0);

  
  public availableSinceAsText() {
    return new Date(this.availableSince.toNumber() * 1000).toLocaleString();
  }

}



export class Delegator {
  address: string = '';
}

