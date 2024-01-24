// eslint-disable-next-line @typescript-eslint/no-unused-vars
import BN from 'bn.js';
import Web3 from "web3";

import { Context } from './models/context';


import { Delegator, Pool } from "./models/model";
import { ContractManager } from "./models/contractManager";

import { BlockType, NonPayableTx } from './types/contracts';
import { UserWallet } from './models/wallet';
import { BlockRewardHbbftCoins, KeyGenHistory, RandomHbbft, StakingHbbft, ValidatorSetHbbft } from '../contracts';

// needed for querying injected web3 (e.g. from Metamask)
// declare global {
//   interface Window {
//     ethereum: Web3;
//     web3: Web3;
//   }
// }

export class DataAdapter {
  public static instance: DataAdapter | null;

  public url!: URL;

  public web3!: Web3;

  public wallet: UserWallet = new UserWallet("", new BN(0));

  public context: Context = new Context();  

  public handlingNewBlock: boolean = false;

  private contracts! : ContractManager;

  private vsContract!: ValidatorSetHbbft;

  private stContract!: StakingHbbft;

  private brContract!: BlockRewardHbbftCoins;

  private kghContract!: KeyGenHistory;

  private rngContract!: RandomHbbft;

  public showAllPools: boolean = false;

  public isShowHistoric: boolean = false;

  public isReadingData: boolean = false;

  public lastError?: unknown = undefined;
  
  public showHistoricBlock: number = 0;

  public defaultTxOpts = {
    from: '', gasPrice: '1000000000', gasLimit: '8000000', value: '0',
  };

  public static async initialize(url: URL): Promise<DataAdapter> {
    console.log('[INFO] Initializing data adapter with:', url.toString());
    const adapter = new DataAdapter();

    adapter.url = url;
    adapter.web3 = new Web3(url.toString());
    adapter.contracts = new ContractManager(adapter.web3);
    
    adapter.vsContract = adapter.contracts.getValidatorSetHbbft();
    adapter.stContract = await adapter.contracts.getStakingHbbft();
    adapter.brContract = await adapter.contracts.getRewardHbbft();
    adapter.kghContract = await adapter.contracts.getKeyGenHistory();
    adapter.rngContract = await adapter.contracts.getRandomHbbft();
    
    adapter.refresh();
    adapter.updateEventSubscription();

    return adapter; 
  }

  public async reinitializeContracts(provider: Web3) {
    const result = new DataAdapter();
    result.contracts = new ContractManager(provider);
    this.stContract = await result.contracts.getStakingHbbft();
    this.vsContract = result.contracts.getValidatorSetHbbft();

    
    this.context.pools.map(async (pool: Pool) => {
      // console.log(new BN(await this.getMyStake(pool.stakingAddress)), pool.stakingAddress)
      pool.myStake = new BN(await this.getMyStake(pool.stakingAddress));
    })
    // this.rngContract = await result.contracts.getRandomHbbft();
    // this.brContract = await result.contracts.getRewardHbbft();
    // this.kghContract = await result.contracts.getKeyGenHistory();
    return true;
  }

  public async reUpdatePool(pool: Pool) {
    const activePoolAddrs: Array<string> = await this.stContract.methods.getPools().call(this.tx(), this.block());
    const toBeElectedPoolAddrs = await this.stContract.methods.getPoolsToBeElected().call(this.tx(), this.block());
    const pendingValidatorAddrs = await this.vsContract.methods.getPendingValidators().call(this.tx(), this.block());

    await this.updatePool(pool, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, true);
  }

  public async addNewPool(stakingAddress: string): Promise<Pool> {
    const pool: Pool = this.createEmptyPool(stakingAddress);
    await this.reUpdatePool(pool);
    return pool;
  }

  public async showHistoric(blockNumber: number) {
    console.log("THESESESE", this.isShowHistoric, this.showHistoricBlock, blockNumber)
    if (!this.isShowHistoric || this.showHistoricBlock !== blockNumber) {
      this.isShowHistoric = true;
      this.showHistoricBlock = blockNumber;
      this.web3.eth.defaultBlock = blockNumber;
      //async call.
      this.refresh();
    }
  }

  public async showLatest() {

    if (this.isShowHistoric) {

      // console.error('show latest.');
      this.isShowHistoric = false;
      this.web3.eth.defaultBlock = 'latest';
      //async call.
      this.refresh();
    }
  }

  public async setProvider(web3Provider: any) {
    console.log("SET PROVIDER")
    this.wallet.myAddr = web3Provider.currentProvider.selectedAddress;

    this.web3 = web3Provider;
    
    // await this.reinitializeContracts(web3Provider);
    
    await this.handleNewBlock();

    // await this.refresh();

    return true;
  }


  private getBlockHistoryInfoAsString() {
    return this.isShowHistoric ? `historic block #${this.showHistoricBlock}` : 'latest';
  }

  public async refresh() {

    try {
      const history_info = this.getBlockHistoryInfoAsString();
      console.log('starting data refresh', history_info);
      this.isReadingData = true;
      // this._uiElementsToUpdate.forEach(x => x.forceUpdate());
      await this.retrieveGlobalValues();
      await this.retrieveValuesFromContract();
      await this.syncPoolsState(true);
      this.isReadingData = false;
      this.lastError = undefined;
      console.log('finished data refresh - updating UI.', history_info);
    } catch(e: unknown) {
      this.lastError = e;
      this.isReadingData = false;
    }
    
    // this._uiElementsToUpdate.forEach(x => x.forceUpdate());
  }

  /**
   * get values that are independend 
   */
  private async retrieveGlobalValues() {

    if (this.web3.eth.defaultBlock === undefined || this.web3.eth.defaultBlock === 'latest') {
      console.warn('getting from eth', this.web3.eth.defaultBlock);
      this.context.currentBlockNumber = await this.web3.eth.getBlockNumber();
      this.context.latestBlockNumber  = this.context.currentBlockNumber;
    } else if ( typeof this.web3.eth.defaultBlock === 'number' ) {
      console.warn('getting from number', this.web3.eth.defaultBlock);
        this.context.currentBlockNumber = this.web3.eth.defaultBlock;
        this.context.latestBlockNumber  = await this.web3.eth.getBlockNumber();
        this.web3.defaultBlock = this.web3.eth.defaultBlock;
    } else {
      console.warn('unexpected defaultBlock: ', this.web3.eth.defaultBlock);
    }

    this.context.candidateMinStake = new BN(await this.stContract.methods.candidateMinStake().call(this.tx(), this.block()));
    this.context.delegatorMinStake = new BN(await this.stContract.methods.delegatorMinStake().call(this.tx(), this.block()));
    
    this.context.minimumGasFee = new BN(await this.contracts.getContractPermission().methods.minimumGasPrice().call(this.tx(), this.block()));

    // those values are asumed to be not changeable.
    this.context.epochDuration = parseInt(await (await this.contracts.getStakingHbbft()).methods.stakingFixedEpochDuration().call(this.tx(), this.block()));
    this.context.stakeWithdrawDisallowPeriod = parseInt(await (await this.contracts.getStakingHbbft()).methods.stakingWithdrawDisallowPeriod().call(this.tx(), this.block()));
  }

  private tx() : NonPayableTx | undefined {
    return undefined;
  }

  private block() : BlockType {
    if ( this.isShowHistoric ) {
      return this.showHistoricBlock;
    }

    return this.context.currentBlockNumber;
  }

  private async retrieveValuesFromContract(): Promise<void> {
    const oldStakingEpoch = this.context.stakingEpoch;
    this.context.stakingEpoch = parseInt(await this.stContract.methods.stakingEpoch().call(this.tx(), this.block()));
    this.context.keyGenRound = await this.contracts.getCurrentKeyGenRound(this.block());

    if (this.context.stakingEpoch !== oldStakingEpoch) {
      this.context.epochStartBlock = parseInt(await this.stContract.methods.stakingEpochStartBlock().call(this.tx(), this.block()));
      this.context.epochStartTime = parseInt(await this.stContract.methods.stakingEpochStartTime().call(this.tx(), this.block()));

      const deltaPotValue = await this.brContract.methods.deltaPot().call(this.tx(), this.block());
      console.log('got delta pot value: ', deltaPotValue);
      this.context.deltaPot = this.web3.utils.fromWei(deltaPotValue, 'ether');
      const daoPotValue = await this.web3.eth.getBalance('0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0');
      this.context.daoPot = this.web3.utils.fromWei(daoPotValue, 'ether');
      console.log('got dao pot value', this.context.daoPot)

      const reinsertPotValue = await this.brContract.methods.reinsertPot().call(this.tx(), this.block());
      console.log('got reinsert pot value: ', reinsertPotValue);
      this.context.reinsertPot = this.web3.utils.fromWei(reinsertPotValue, 'ether');

      // could be calculated instead of called from smart contract?!
      this.context.stakingEpochEndTime = parseInt(await this.stContract.methods.stakingFixedEpochEndTime().call(this.tx(), this.block()));
    }

    if (this.wallet.myAddr) {
      console.log("Balance:", await this.web3.eth.getBalance(this.wallet.myAddr));
      console.log("Address:", this.wallet.myAddr);
      this.wallet.myBalance = new BN(await this.web3.eth.getBalance(this.wallet.myAddr));
    }

    this.context.canStakeOrWithdrawNow = await this.stContract.methods.areStakeAndWithdrawAllowed().call(this.tx(), this.block());
  }

  private createEmptyPool(stakingAddress: string): Pool {
    // const result = new Pool(this.context);
    const result = new Pool(stakingAddress);
    
    result.stakingAddress = stakingAddress;
    return result;
  }


  private async syncPoolsState(isNewEpoch: boolean): Promise<void> {
    // const blockNumberAtBegin = this.context.currentBlockNumber;
    const newCurrentValidatorsUnsorted = (await this.vsContract.methods.getValidators().call(this.tx(), this.block()));
    const newCurrentValidators = [...newCurrentValidatorsUnsorted].sort();

    const validatorWithoutPool: Array<string> = [...newCurrentValidators];

    // if (blockNumberAtBegin !== this.context.currentBlockNumber) { console.warn('detected slow pool sync'); return; }
    const activePoolAddrs: Array<string> = await this.stContract.methods.getPools().call(this.tx(), this.block());
    // console.log('active Pools:', activePoolAddrs);
    // if (blockNumberAtBegin !== this.context.currentBlockNumber) { console.warn('detected slow pool sync'); return; }
    const inactivePoolAddrs: Array<string> = await this.stContract.methods.getPoolsInactive().call(this.tx(), this.block());
    // console.log('inactive Pools:', inactivePoolAddrs);
    // if (blockNumberAtBegin !== this.context.currentBlockNumber) { console.warn('detected slow pool sync'); return; }
    const toBeElectedPoolAddrs = await this.stContract.methods.getPoolsToBeElected().call(this.tx(), this.block());
    // console.log('to be elected Pools:', toBeElectedPoolAddrs);
    // if (blockNumberAtBegin !== this.context.currentBlockNumber) { console.warn('detected slow pool sync'); return; }
    const pendingValidatorAddrs = await this.vsContract.methods.getPendingValidators().call(this.tx(), this.block());
    // console.log('pendingMiningPools:', pendingValidatorAddrs);
    // if (blockNumberAtBegin !== this.context.currentBlockNumber) { console.warn('detected slow pool sync'); return; }
    console.log(`Syncing ${activePoolAddrs.length} active and ${inactivePoolAddrs.length} inactive pools...`);
    const poolAddrs = activePoolAddrs.concat(inactivePoolAddrs);
    // if (blockNumberAtBegin !== this.context.currentBlockNumber) { console.warn('detected slow pool sync'); return; }
    // make sure both arrays were sorted beforehand
    if (this.context.currentValidators.toString() !== newCurrentValidators.toString()) {
      console.log(`Validator set changed in block ${this.context.currentBlockNumber} to: ${newCurrentValidators}`);
      this.context.currentValidators = newCurrentValidators;
    }
    // if (blockNumberAtBegin !== this.context.currentBlockNumber) { console.warn('detected slow pool sync'); return; }

    // check if there is a new pool that is not tracked yet within the context.
    poolAddrs.forEach((poolAddress) => {
      const findResult = this.context.pools.find((x) => x.stakingAddress === poolAddress);
      if (!findResult) {
        // let newPool = this.createEmptyPool(poolAddress);
        // runInAction(() => {
        //   this.context.pools = [...this.context.pools, newPool]
        // })
      }
    });

    console.log("this.context.pools", this.context.pools.length)

    const poolsToUpdate = this.context.pools.map((p) => {
      const ixValidatorWithoutPool = validatorWithoutPool.indexOf(p.miningAddress);
      if (ixValidatorWithoutPool !== -1) {validatorWithoutPool.splice(ixValidatorWithoutPool, 1)}
      return this.updatePool(p, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, isNewEpoch);
    });

    await Promise.allSettled(poolsToUpdate);

    // runInAction(() => {
    //   this.context.numbersOfValidators = this.context.pools.filter(x=>x.isCurrentValidator).length;
    //   this.context.currentValidatorsWithoutPools = validatorWithoutPool;
    //   // this.context.pools = this.context.pools.sort((a, b) => a.stakingAddress.localeCompare(b.stakingAddress));
    // })

    // this.cache.store(this.context);
    //storeData(this.context);
  }

  private async getClaimableReward(stakingAddr: string): Promise<string> {
    if (!this.web3 || !this.wallet.myAddr) {
      return '0';
    }
    // getRewardAmount() fails if invoked for a staker without stake in the pool, thus we check that beforehand
    const hasStake: boolean = stakingAddr.toLowerCase() === this.wallet.myAddr ? true : (await this.stContract.methods.stakeFirstEpoch(stakingAddr, this.wallet.myAddr).call(this.tx(), this.block())) !== '0';

    return hasStake ? this.stContract.methods.getRewardAmount([], stakingAddr, this.wallet.myAddr).call(this.tx(), this.block()) : '0';
  }

  private async getMyStake(stakingAddress: string): Promise<string> {
    if (!this.web3 || !this.wallet.myAddr) {
      return '0';
    }
    
    const stakeAmount = this.stContract.methods.stakeAmount(stakingAddress, this.wallet.myAddr).call(this.tx(), this.block())
    return stakeAmount;
  }

  private async getBannedUntil(miningAddress: string): Promise<BN> {
    return new BN((await this.vsContract.methods.bannedUntil(miningAddress).call(this.tx(), this.block())));
  }

  private async getBanCount(miningAddress: string): Promise<number> {
    return parseInt(await this.vsContract.methods.banCounter(miningAddress).call(this.tx(), this.block()));
  }

  private async getAvailableSince(miningAddress: string): Promise<BN> {
    const rawResult = await this.vsContract.methods.validatorAvailableSince(miningAddress).call(this.tx(), this.block());
    return new BN(rawResult);
  }

  private async updatePool(
    pool: Pool,
    activePoolAddrs: Array<string>,
    toBeElectedPoolAddrs: Array<string>,
    pendingValidatorAddrs: Array<string>,
    isNewEpoch: boolean) : Promise<void> {

    const { stakingAddress } = pool;

    pool.miningAddress = await this.vsContract.methods.miningByStakingAddress(stakingAddress).call(this.tx(), this.block());
    pool.miningPublicKey = await this.vsContract.methods.getPublicKey(pool.miningAddress).call(this.tx(), this.block());

    pool.delegators = (await this.stContract.methods.poolDelegators(stakingAddress).call()).map((delegator: any) => new Delegator(delegator));
    pool.isActive = activePoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isToBeElected = toBeElectedPoolAddrs.indexOf(stakingAddress) >= 0;

    pool.isPendingValidator = pendingValidatorAddrs.indexOf(pool.miningAddress) >= 0;
    pool.isCurrentValidator = this.context.currentValidators.indexOf(pool.miningAddress) >= 0;

    pool.availableSince = await this.getAvailableSince(pool.miningAddress);
    pool.isAvailable = !pool.availableSince.isZero();
    pool.isMe = this.wallet.myAddr === pool.stakingAddress;
    pool.myStake = new BN(await this.getMyStake(stakingAddress));

    // remove pool
    if (!this.showAllPools) {
      if(!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && !pool.myStake.gt(new BN('0'))) {
        for (let i = 0; i < this.context.pools.length; i++) {
          if (this.context.pools[i].stakingAddress === pool.stakingAddress) {
            // runInAction(() => {
            //   this.context.pools.splice(i, 1);
            // })
            return;
          }
        }
      } else {
        if (!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && pool.myStake.gt(new BN('0'))) {
          pool.score = 0;
        } else {
          pool.score = 1000;
        }
      }
    }

    // runInAction( async() => {
    //   pool.candidateStake = new BN(await this.stContract.methods.stakeAmount(stakingAddress, stakingAddress).call(this.tx(), this.block()));
    //   pool.totalStake = new BN(await this.stContract.methods.stakeAmountTotal(stakingAddress).call(this.tx(), this.block()));
    //   pool.myStake = new BN(await this.getMyStake(stakingAddress));
    //   // pool.claimableReward = await this.getClaimableReward(stakingAddress);
    //   // pool.orderedWithdrawAmount = new BN(await this.stContract.methods.orderedWithdrawAmount(stakingAddress, this.wallet.myAddr).call(this.tx(), this.block()));
    // })

    pool.candidateStake = new BN(await this.stContract.methods.stakeAmount(stakingAddress, stakingAddress).call(this.tx(), this.block()));
    pool.totalStake = new BN(await this.stContract.methods.stakeAmountTotal(stakingAddress).call(this.tx(), this.block()));
    // pool.claimableReward = await this.getClaimableReward(stakingAddress);
    pool.orderedWithdrawAmount = this.wallet.myAddr ? new BN(await this.stContract.methods.orderedWithdrawAmount(stakingAddress, this.wallet.myAddr).call()) : new BN(0);

    pool.bannedUntil = new BN(await this.getBannedUntil(pool.miningAddress));
    pool.banCount = await this.getBanCount(pool.miningAddress);

    pool.keyGenMode = await this.contracts.getPendingValidatorState(pool.miningAddress, this.block());

    if (pool.isPendingValidator) {
      pool.parts = await this.kghContract.methods.parts(pool.miningAddress).call(this.tx(), this.block());
      const acksLengthBN = new BN(await this.kghContract.methods.getAcksLength(pool.miningAddress).call(this.tx(), this.block()));
      pool.numberOfAcks = acksLengthBN.toNumber();
    } else {
      pool.parts = '';
      pool.numberOfAcks = 0;
    }    
  }

  private newBlockPolling?: NodeJS.Timeout = undefined;

  /**
   * updates the event subscript based on the fact 
   * if we are browsing historic data or not.
   */
  private updateEventSubscription() {
    console.log('Updating event subscription. is historic:', this.isShowHistoric);

    if (this.isShowHistoric) {
      // if we browse historic, we can safely unsusbscribe from events.
      this.unsubscribeToEvents();
    }
    else {
      // if we are tracking the latest block,
      // we only subscript to event if we have not done already.
      if (!this.newBlockPolling) {
        this.subscribeToEvents();
      }
    }
  }

  private unsubscribeToEvents() {
    if (this.newBlockPolling) {
      clearInterval(this.newBlockPolling);
      this.newBlockPolling = undefined;
    }
  }

  private async subscribeToEvents(): Promise<void> {

    // since web3 websockets never made it to be a full supported standard,
    // like MetaMask do not support them,
    // there seems not to be a better way currently other then 
    // polling like stupid.

    this.unsubscribeToEvents();

    this.newBlockPolling = setInterval(async () =>  {
      // we make a double check, if we really
      // should not browse historic.
      if (this.isShowHistoric) {
        return;
      }

      const currentBlock = await this.web3.eth.getBlockNumber();
      if (currentBlock > this.context.currentBlockNumber && !this.handlingNewBlock) {
        this.handlingNewBlock = true;
        await this.handleNewBlock();
        this.handlingNewBlock = false;
      }
      // todo: what if the RPCC internet connection is slower than the interval ?
    }, 300000);
  }


  // does relevant state updates and checks if the epoch changed
  private async handleNewBlock() : Promise<void> {
    console.log('Handling new block.');
    // const blockHeader = await this.web3.eth.getBlock('latest');
    
    console.log(`Current Block Number:`, this.context.currentBlockNumber);

    // runInAction(() => {
    //   this.context.currentBlockNumber = blockHeader.number;
    //   this.context.currentTimestamp = new BN(blockHeader.timestamp);
    // })

    if (this.wallet.myAddr) {
      // const myBalance = new BN(await this.web3.eth.getBalance(this.wallet.myAddr));
      // runInAction(() => {
      //   this.wallet.myBalance = myBalance;
      // })
    }

    // epoch change
    console.log(`updating stakingEpochEndBlock at block ${this.context.currentBlockNumber}`);
    const oldEpoch = this.context.stakingEpoch;
    await this.retrieveValuesFromContract();

    console.log("Epoch times:", {oldEpoch}, "Latest:", this.context.stakingEpoch, oldEpoch !== this.context.stakingEpoch);

    const isNewEpoch = oldEpoch !== this.context.stakingEpoch;

    // TODO FIX: blocks left in Epoch can't get told.
    // const blocksLeftInEpoch = this.stakingEpochEndBlock - this.currentBlockNumber;
    // if (blocksLeftInEpoch < 0) {
    //   // TODO: we should have a contract instance connected via websocket in order to avoid this delay
    //   console.log('stakingEpochEndBlock in the past :-/');
    // } else if (blocksLeftInEpoch > this.stakeWithdrawDisallowPeriod) {
    //   this.stakingAllowedTimeframe = blocksLeftInEpoch - this.stakeWithdrawDisallowPeriod;
    // } else {
    //   this.stakingAllowedTimeframe = -blocksLeftInEpoch;
    // }

    // TODO: due to the use of 2 different web3 instances, this bool may not always match stakingAllowedTimeframe
    // const canStakeOrWithdrawNow = await this.stContract.methods.areStakeAndWithdrawAllowed().call(this.tx(), this.block());
    // runInAction(() => {
    //   this.context.canStakeOrWithdrawNow = canStakeOrWithdrawNow;
    // });

    await this.syncPoolsState(isNewEpoch);
    // this._uiElementsToUpdate.forEach(x => x.forceUpdate());
  }

  public async stake(poolAddr: string, amount: string): Promise<boolean> {
    console.log(`${this.wallet.myAddr} wants to stake ${amount} DMD on pool ${poolAddr}`);

    const txOpts = { ...this.defaultTxOpts };
    txOpts.from = this.wallet.myAddr;
    // txOpts.value = this.web3.utils.toWei(amount.toString());
    txOpts.value = amount;

    try {
      const receipt = await this.stContract.methods.stake(poolAddr).send(txOpts);
      console.log(`Receipt: ${JSON.stringify(receipt, null, 2)}`);
      console.log(`Tx: ${receipt.transactionHash} for stake(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  public async areAddressesValidForCreatePool(stakingAddr: string, miningAddr: string): Promise<boolean> {
    return (
      stakingAddr !== miningAddr
      && await this.vsContract.methods.miningByStakingAddress(stakingAddr).call() === '0x0000000000000000000000000000000000000000'
      && await this.vsContract.methods.miningByStakingAddress(miningAddr).call() === '0x0000000000000000000000000000000000000000'
      && await this.vsContract.methods.stakingByMiningAddress(stakingAddr).call() === '0x0000000000000000000000000000000000000000'
      && await this.vsContract.methods.stakingByMiningAddress(miningAddr).call() === '0x0000000000000000000000000000000000000000'
    );
  }

  public async canStakeOrWithdrawNow(): Promise<boolean> {
    return await this.stContract.methods.areStakeAndWithdrawAllowed().call();
  }

  public async createPool(miningAddr: string, publicKey: string, stakeAmount: number, ipAddress: string): Promise<boolean | string> {
    const txOpts = { ...this.defaultTxOpts };
    txOpts.from = this.wallet.myAddr;
    txOpts.value = this.web3.utils.toWei(stakeAmount.toString());

    try {
      console.log(`adding Pool : ${miningAddr} publicKeyHex: ${publicKey}`);
      // <amount> argument is ignored by the contract (exists for chains with token based staking)
      const receipt = await this.stContract.methods.addPool(miningAddr, publicKey, ipAddress).send(txOpts);
      console.log(`receipt: ${JSON.stringify(receipt, null, 2)}`);
      return true;
    } catch (e:any) {
      const errMsg = e.message;
      console.log("[ERROR] Add pool tx failed with: ", errMsg)
      if (errMsg.includes('failed with invalid arrayify value') || errMsg.includes('invalid arrayify value')) {
        return "Invalid Public Key";
      } else if (errMsg.includes('Transaction has been reverted by the EVM')) {
        return "Transaction Failed";
      } else {
        return false;
      }
    }
  }

  public async getLatestRN(start: number, end: number): Promise<Array<any>> {  
    // const latestBlockNumber = await this.web3.eth.getBlockNumber();
    // let numberOfBlocksToLog = 10;
  
    // if ( numberOfBlocksToLog > latestBlockNumber ){
    //   numberOfBlocksToLog = latestBlockNumber;
    // }
  
    // let randomNumber = "";

    // for(let blockNumber = latestBlockNumber - numberOfBlocksToLog; blockNumber <= latestBlockNumber; blockNumber++) {
    //   // const block = await this.web3.eth.getBlock(blockNumber);
      
    //   // let extraData = block.extraData;
    //   console.log({blockNumber})
    //   randomNumber = await this.rngContract.methods.currentSeed().call({}, blockNumber);    
    // }
    let data = [];

    for (let blockNumber=start; blockNumber <= end; blockNumber++) {
      const randomNumber = await this.rngContract.methods.currentSeed().call({}, blockNumber);    
      data.push({'block': blockNumber, 'rn': randomNumber});
    }
  
    return data;
  }
  
  public async withdrawStake(address: string, amount: string): Promise<any> {
    const txOpts = { ...this.defaultTxOpts };
    txOpts.from = this.wallet.myAddr;

    const amountWeiBN = new BN(this.web3.utils.toWei(amount.toString()));

    // determine available withdraw method and allowed amount
    const maxWithdrawAmount = await this.stContract.methods.maxWithdrawAllowed(address, this.wallet.myAddr).call();
    const maxWithdrawOrderAmount = await this.stContract.methods.maxWithdrawOrderAllowed(address, this.wallet.myAddr).call();  
    console.assert(maxWithdrawAmount === '0' || maxWithdrawOrderAmount === '0', 'max withdraw amount assumption violated');

    let success = false;
    let reason;

    try {
      console.log(maxWithdrawAmount.toString(), maxWithdrawOrderAmount.toString(), amountWeiBN.toString())
      if (maxWithdrawAmount !== '0') {
        if (new BN(maxWithdrawAmount).gte(amountWeiBN)) {
          reason = 'requested withdraw amount exceeds max';
          return {success, reason};
        } 
        const receipt = await this.stContract.methods.withdraw(address, amountWeiBN.toString()).send(txOpts);
        console.log(`tx ${receipt.transactionHash} for withdraw(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
        success = true;
      } else {
        if (new BN(maxWithdrawOrderAmount).gte(amountWeiBN)) {
          reason = 'requested withdraw order amount exceeds max';
          return {success, reason};
        }
        const receipt = await this.stContract.methods.orderWithdraw(address, amountWeiBN.toString()).send(txOpts);
        console.log(`tx ${receipt.transactionHash} for orderWithdraw(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
        success = true;
        return {success, reason}
      }
    } catch (e) {
      console.log(`failed with ${e}`);
    }
    return {success, reason}
  }

  public async claimStake(poolAddress: string) {
    console.log(`${this.wallet.myAddr} wants to claim the available stake from pool ${poolAddress}`);
    console.assert(this.canStakeOrWithdrawNow, 'withdraw currently not allowed');
    const txOpts = { ...this.defaultTxOpts };
    txOpts.from = this.wallet.myAddr;

    try {
      const receipt = await this.stContract.methods.claimOrderedWithdraw(poolAddress).send(txOpts);
      console.log(`tx ${receipt.transactionHash} for claimOrderedWithdraw(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
    } catch (e) {
      console.log(`failed with ${e}`);
    }
  }

  public async claimReward(poolAddr: string): Promise<boolean | string> {
    console.log(`${this.wallet.myAddr} wants to claim the available reward from pool ${poolAddr}`);
    const txOpts = { ...this.defaultTxOpts };
    txOpts.gasLimit = '300000000';
    txOpts.from = this.wallet.myAddr;

    const epochList = await this.brContract.methods.epochsToClaimRewardFrom(poolAddr, this.wallet.myAddr).call();
    const txEpochList = epochList.slice(0, 5000);

    console.log(`ClaimReward: claiming for ${txEpochList.length} of ${epochList.length} epochs...`);

    try {
      const receipt = await this.stContract.methods.claimReward(txEpochList, poolAddr).send(txOpts);
      console.log(`tx ${receipt.transactionHash} for claimReward(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
    } catch (e: any) {
      console.log(`[ERROR] ClaimReward: Failed with ${e.message}`);
      return 'error'
    }

    return epochList.length > txEpochList.length;
  }
}