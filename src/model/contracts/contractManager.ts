import Web3 from 'web3';

import { ValidatorSetHbbft } from '../../contracts/ValidatorSetHbbft';
import JsonValidatorSetHbbft from '../../contract-abis/ValidatorSetHbbft.json';

import { StakingHbbft } from '../../contracts/StakingHbbft';
import JsonStakingHbbft from '../../contract-abis/StakingHbbft.json';

import { KeyGenHistory } from '../../contracts/KeyGenHistory';
import JsonKeyGenHistory from '../../contract-abis/KeyGenHistory.json';

import { BlockRewardHbbftCoins } from '../../contracts/BlockRewardHbbftCoins';
import JsonBlockRewardHbbftCoins from '../../contract-abis/BlockRewardHbbftCoins.json';

import { Registry } from '../../contracts/Registry';
import JsonRegistry from '../../contract-abis/Registry.json';

import { TxPermissionHbbft } from '../../contracts/TxPermissionHbbft';
import JsonTxPermissionHbbft from '../../contract-abis/TxPermissionHbbft.json';

import { AdminUpgradeabilityProxy } from '../../contracts/AdminUpgradeabilityProxy';
import JsonAdminUpgradeabilityProxy from '../../contract-abis/AdminUpgradeabilityProxy.json';

import { RandomHbbft } from '../../contracts/RandomHbbft';
import JsonRandomHbbft  from '../../contract-abis/RandomHbbft.json';

import BigNumber from 'bignumber.js';
import { BlockType } from '../../contracts/types';


export enum KeyGenMode {
  NotAPendingValidator = 0,
  WritePart, 
  WaitForOtherParts,
  WriteAck,
  WaitForOtherAcks,
  AllKeysDone
}

export interface ContractAddresses {
  validatorSetAddress: string
}

// Hex string to number
function h2n(hexString: string) : number {
  return new BigNumber(hexString).toNumber();
}
export class ContractManager {

  private cachedValidatorSetHbbft?: ValidatorSetHbbft;
  private cachedStakingHbbft?: StakingHbbft;
  private cachedKeyGenHistory?: KeyGenHistory;
  private cachedRewardContract?: BlockRewardHbbftCoins;
  private cachedPermission?: TxPermissionHbbft;

  public constructor(public web3: Web3) {

  }

  public static getContractAddresses() : ContractAddresses {
    //todo: query other addresses ?!
    // more intelligent contract manager that queries lazy ?
    return { validatorSetAddress: '0x1000000000000000000000000000000000000001' }
  }

  public getValidatorSetHbbft() : ValidatorSetHbbft {

    if (this.cachedValidatorSetHbbft) {
      return this.cachedValidatorSetHbbft;
    }

    const contractAddresses = ContractManager.getContractAddresses();

    const abi : any = JsonValidatorSetHbbft.abi;
    const validatorSetContract : any = new this.web3.eth.Contract(abi, contractAddresses.validatorSetAddress);
    this.cachedValidatorSetHbbft = validatorSetContract;
    //const validatorSet : ValidatorSetHbbft = validatorSetContract;
    return validatorSetContract;
  }

  public getRegistry() : Registry {
    
    const abi : any = JsonRegistry.abi;
    let result : any = new this.web3.eth.Contract(abi, '0x6000000000000000000000000000000000000000');
    return result;
  }

  public getUpgradabilityProxy(address: string) : AdminUpgradeabilityProxy {

    const abi : any = JsonAdminUpgradeabilityProxy.abi;
    let result : any = new this.web3.eth.Contract(abi, address);
    return result;
  }

  public async getRewardHbbft() : Promise<BlockRewardHbbftCoins> {
    if (this.cachedRewardContract) {
      return this.cachedRewardContract;
    }

    const contractAddress = await this.getValidatorSetHbbft().methods.blockRewardContract().call();

    const abi : any = JsonBlockRewardHbbftCoins.abi;
    const result : any = new this.web3.eth.Contract(abi, contractAddress);
    this.cachedRewardContract = result;
    //const validatorSet : ValidatorSetHbbft = validatorSetContract;
    return this.cachedRewardContract!;
  }

  public async getEpoch(blockNumber: number | undefined) : Promise<number> {
    return h2n(await (await this.getStakingHbbft()).methods.stakingEpoch().call({}, blockNumber));
  }

  public async getEpochStartBlock(blockNumber: BlockType = 'latest') {
    return h2n(await (await this.getStakingHbbft()).methods.stakingEpochStartBlock().call({}, blockNumber));
  }

  public async getStakingHbbft() : Promise<StakingHbbft> {
    
    if (this.cachedStakingHbbft) {
      return this.cachedStakingHbbft;
    }

    const contractAddress = await this.getValidatorSetHbbft().methods.stakingContract().call();
    
    const abi : any = JsonStakingHbbft.abi;
    const stakingContract : any = new this.web3.eth.Contract(abi, contractAddress);
    this.cachedStakingHbbft = stakingContract;
    return stakingContract;
  }
  public getContractPermission() : TxPermissionHbbft {
    
        
    if (this.cachedPermission ) {
      return this.cachedPermission;
    }

    // address from chain spec.
    const configuredAddress = '0x4000000000000000000000000000000000000001';

    const abi : any = JsonTxPermissionHbbft.abi;
    const permissionContract : any = new this.web3.eth.Contract(abi, configuredAddress);
    this.cachedPermission = permissionContract;
    return permissionContract;

    //minimumGasPrice
  }

  public async getKeyGenHistory(blockNumber: BlockType = 'latest') : Promise<KeyGenHistory> {
    
    if (this.cachedKeyGenHistory) {
      return this.cachedKeyGenHistory;
    }

    const contractAddress = await this.getValidatorSetHbbft().methods.keyGenHistoryContract().call({}, blockNumber);
    console.log('KeyGenHistory address: ', contractAddress);

    const abi : any = JsonKeyGenHistory.abi;
    const contract : any = new this.web3.eth.Contract(abi, contractAddress);
    this.cachedKeyGenHistory = contract;
    return contract;
  }

  public getAdminUpgradeabilityProxy(contractAddress: string) : AdminUpgradeabilityProxy {
    
    const abi : any = JsonAdminUpgradeabilityProxy.abi;
    const contract : any = new this.web3.eth.Contract(abi, contractAddress);
    return contract;
  }

  public async isValidatorAvailable(miningAddress: string, blockNumber: BlockType = 'latest') {
     const validatorAvailableSince = new BigNumber(await (await this.getValidatorSetHbbft()).methods.validatorAvailableSince(miningAddress).call({}, blockNumber));
     return !validatorAvailableSince.isZero();
  }

  public async getValidators(blockNumber: BlockType = 'latest') {

    return await this.getValidatorSetHbbft().methods.getValidators().call({}, blockNumber);
  }

  public async getPendingValidators(blockNumber: BlockType = 'latest') {
    return await this.getValidatorSetHbbft().methods.getPendingValidators().call({}, blockNumber);
  }


  public async getPendingValidatorState(validator: string, blockNumber: BlockType = 'latest') : Promise<KeyGenMode> {

    return h2n(await this.getValidatorSetHbbft().methods
      .getPendingValidatorKeyGenerationMode(validator).call({}, blockNumber));
  }

  public async getKeyPARTBytesLength(validator: string, blockNumber: BlockType = 'latest') {
    const part = await this.getKeyPART(validator, blockNumber);
    return (part.length - 2) / 2;
  }

  public async getKeyPART(validator: string, blockNumber: BlockType = 'latest') : Promise<string> {
    return await (await this.getKeyGenHistory()).methods.getPart(validator).call({}, blockNumber);
  }

  // retrieves only the number of written Acks (so not that much data has to get transferted.
  public async getKeyACKSNumber(validator: string, blockNumber: BlockType = 'latest') : Promise<number> {
    return h2n(await (await this.getKeyGenHistory()).methods.getAcksLength(validator).call({}, blockNumber));
  }

  public async getCurrentKeyGenRound(blockNumber: BlockType = 'latest') : Promise<number> {

    return h2n(await (await this.getKeyGenHistory()).methods.getCurrentKeyGenRound().call({}, blockNumber));
  }


  public async getRandomHbbft(): Promise<RandomHbbft> {

    let contractAddress = await this.getValidatorSetHbbft().methods.randomContract().call();

    const abi: any = JsonRandomHbbft.abi;
    const contract: any = new this.web3.eth.Contract(abi, contractAddress);
    return contract;
  }
}
