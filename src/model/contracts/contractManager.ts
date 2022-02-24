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


import BigNumber from 'bn.js';


export interface ContractAddresses {
  validatorSetAddress: string
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

  public async getKeyGenHistory() : Promise<KeyGenHistory> {
    
    if (this.cachedKeyGenHistory) {
      return this.cachedKeyGenHistory;
    }

    const contractAddress = await this.getValidatorSetHbbft().methods.keyGenHistoryContract().call();
    console.log('KeyGenHistory address: ', contractAddress);

    const abi : any = JsonKeyGenHistory.abi;
    const contract : any = new this.web3.eth.Contract(abi, contractAddress);
    this.cachedKeyGenHistory = contract;
    return contract;
  }

  public async isValidatorAvailable(miningAddress: string) {
     const validatorAvailableSince = new BigNumber(await (await this.getValidatorSetHbbft()).methods.validatorAvailableSince(miningAddress).call());
     return !validatorAvailableSince.isZero();
  }

 }
