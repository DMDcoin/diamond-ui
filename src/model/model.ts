import BN from 'bn.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { makeAutoObservable, observable } from 'mobx';
import { Context } from './context';
import { KeyGenMode } from './contracts/contractManager';

export class ClaimableStake {

  public amount: BN = new BN(0);
  public unlockEpoch: number = 0;

  public constructor(public pool: Pool) {
  }

  public canClaimNow(): boolean {
    return this.amount.gt(new BN(0))  && this.unlockEpoch <= this.pool.context.stakingEpoch;
  }
}


export class Pool {

  public constructor(context: Context) {
    this.context = context;
    makeAutoObservable(this);
  }

  @observable public context: Context;
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
  public score = 0;

  @observable public candidateStake: BN = new BN(0);
  @observable public totalStake: BN = new BN(0);
  @observable public myStake: BN = new BN(0);
  @observable public orderedWithdrawAmount: BN = new BN(0);

  public claimableStake: ClaimableStake = new ClaimableStake(this);
  @observable public delegators: Array<Delegator> = []; // TODO: how to cast to Array<IDelegator> ?
  public isMe: boolean = false;
  public validatorStakeShare: number = 0; // percent
  public validatorRewardShare: number = 0; // percent
  public claimableReward: string = '0';

  public keyGenMode: KeyGenMode = KeyGenMode.NotAPendingValidator;
  
  public isBanned(): boolean {
    console.log(this.context.currentTimestamp)
    return this.bannedUntil.gt(this.context.currentTimestamp);
  }

  private _uiElementsToUpdate = new Array<React.Component>();

  public registerUIElement(element: React.Component) {
    this._uiElementsToUpdate.push(element);
  }
  
  public bannedUntil: BN = new BN('0');

  public banCount: number = 0;

  public parts: string = ''; // if part of the treshhold key, or pending validator, this holds the PARTS
  public numberOfAcks: number = 0; // if part of the treshhold key, or pending validator, this holds the number of ACKS

  public get isWrittenParts(): boolean | undefined {
    // if (!this.isPendingValidator) {
    //   return undefined;
    // }
    
    if (this.parts === null) {
      return false;
    }

    return this.parts.length > 0;
  }

  public set isWrittenParts(_value: boolean | undefined) {
    //do nothing, has only be added to make tabulator happy
  }

  public get isWrittenAcks(): boolean | undefined {
    // if (!this.isPendingValidator) {
    //   return undefined;
    // }

    return this.numberOfAcks > 0;
  }

  public set isWrittenAcks(_value: boolean | undefined) {
    //do nothing, has only be added to make tabulator happy
  }

  // availability
  public availableSince: BN = new BN(0);

  
  public availableSinceAsText() {
    return new Date(this.availableSince.toNumber() * 1000).toLocaleString();
  }

}



export class Delegator {
  public constructor(delegator: string) {
    this.address = delegator;
  }

  address: string = '';
}