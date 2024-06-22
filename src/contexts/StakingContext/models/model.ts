import BigNumber from 'bignumber.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { makeAutoObservable, observable } from 'mobx';
import { KeyGenMode } from './contractManager';

export class Pool {
  public isUpdating: boolean = false;
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
  public candidateStake: BigNumber = new BigNumber(0);
  public totalStake: BigNumber = new BigNumber(0);
  public myStake: BigNumber = new BigNumber(0);
  public delegators: Array<Delegator> = []; // TODO: how to cast to Array<IDelegator> ?
  public isMe: boolean = false;
  public validatorStakeShare: number = 0; // percent
  public validatorRewardShare: number = 0; // percent
  public claimableReward: string = '0';
  public keyGenMode: KeyGenMode = KeyGenMode.NotAPendingValidator;
  public bannedUntil: BigNumber = new BigNumber('0');
  public banCount: number = 0;
  public parts: string = ''; // if part of the treshhold key, or pending validator, this holds the PARTS
  public numberOfAcks: number = 0; // if part of the treshhold key, or pending validator, this holds the number of ACKS
  public availableSince: BigNumber = new BigNumber(0); // availability
  public votingPower: BigNumber = new BigNumber(0);
  public orderedWithdrawAmount: BigNumber = new BigNumber(0);
  public orderedWithdrawUnlockEpoch: BigNumber = new BigNumber(0);
  public ownStake: BigNumber = new BigNumber(0);

  constructor(stakingAddress: string) {
    this.stakingAddress = stakingAddress;
  }

  public isBanned(currentTimestamp?: BigNumber): boolean {
    if (!currentTimestamp) {
      currentTimestamp = new BigNumber(Math.floor(Date.now() / 1000));
    }
    return this.bannedUntil.isGreaterThan(currentTimestamp);
  }

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

  public availableSinceAsText() {
    return new Date(this.availableSince.toNumber() * 1000).toLocaleString();
  }
}

export class Delegator {
  public constructor(delegatorAddress: string) {
    this.address = delegatorAddress;
    this.amount = new BigNumber(0);
  }

  public address: string;
  public amount: BigNumber;
}