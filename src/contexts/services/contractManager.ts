import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import config from '@/lib/config';
import { formatTxError, logDebugError, logDebugStart, getDebugLevel } from '@/utils/web3Errors';

// Contract ABIs
import {
  ValidatorSetHbbft as JsonValidatorSetHbbft,
  StakingHbbft as JsonStakingHbbft,
  KeyGenHistory as JsonKeyGenHistory,
  BlockRewardHbbft as JsonBlockRewardHbbft,
  Registry as JsonRegistry,
  TxPermissionHbbft as JsonTxPermissionHbbft,
  RandomHbbft as JsonRandomHbbft,
  BonusScoreSystem as JsonBonusScoreSystem,
  DiamondDao as JsonDiamonDao,
  CertifierHbbft as JsonCertifierHbbft,
  ConnectivityTrackerHbbft as JsonConnectivityTrackerHbbft,
  DMDAggregator as JsonHbbtAggregator,
  DMDRegistrarController as JsonDMDRegistrarController,
  DMDNames as JsonDMDNames,
} from '@/contracts/abis';

// Contract Types
import { 
  CertifierHbbft, 
  ConnectivityTrackerHbbft, 
  DiamondDao, 
  DMDAggregator, 
  BonusScoreSystem, 
  TxPermissionHbbft, 
  BlockRewardHbbft, 
  ValidatorSetHbbft, 
  StakingHbbft, 
  KeyGenHistory, 
  Registry, 
  RandomHbbft,
  DMDRegistrarController,
  DMDNames,
} from '@/contracts/types';

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
  private cachedRewardContract?: BlockRewardHbbft;
  private cachedPermission?: TxPermissionHbbft;
  private cachedDiamondRegistry?: DMDRegistrarController;
  private cachedDiamondNames?: DMDNames;

  public constructor(public web3: Web3) {}

  /**
   * Wrap a web3 Contract to log method calls and decode revert reasons.
   * Returns a Proxy that leaves normal behavior intact but adds helpful debugging.
   */
  private wrapContract<T extends any>(name: string, abi: any[], contract: T): T {
    const level = getDebugLevel();
    if (level <= 0) return contract;

    const methodsProxy = new Proxy((contract as any).methods, {
      get: (target: any, prop: PropertyKey) => {
        const orig = (target as any)[prop as any];
        if (typeof orig !== 'function') return orig;
        return (...args: any[]) => {
          const meta = { contract: name, method: String(prop), args };
          try {
            const callObj = orig.apply(target, args);
            // Wrap call()
            const call = (...callArgs: any[]) => {
              // Log at level 2
              logDebugStart(meta);
              return callObj.call(...callArgs).catch((err: any) => {
                logDebugError(this.web3, abi, meta, err);
                // Re-throw with formatted message for upstream handlers
                const msg = formatTxError(this.web3, abi, err, 'Call failed');
                throw new Error(msg);
              });
            };
            // Wrap send()
            const send = (opts: any) => {
              // Log at level 2
              logDebugStart(meta);
              const promi = callObj.send(opts);
              promi.on('error', (err: any) => {
                logDebugError(this.web3, abi, meta, err);
              });
              return promi;
            };
            // Return a lightweight wrapper preserving original object's shape
            return {
              ...callObj,
              call,
              send,
            };
          } catch (err) {
            throw err;
          }
        };
      }
    });

    return new Proxy(contract as any, {
      get: (target, prop, receiver) => {
        if (prop === 'methods') return methodsProxy;
        return Reflect.get(target, prop, receiver);
      }
    }) as any as T;
  }

  public static getContractAddresses() : ContractAddresses {
    return { validatorSetAddress: '0x1000000000000000000000000000000000000001' }
  }

  public getValidatorSetHbbft() : ValidatorSetHbbft {

    if (this.cachedValidatorSetHbbft) {
      return this.cachedValidatorSetHbbft;
    }

    const contractAddresses = ContractManager.getContractAddresses();

    const abi = JsonValidatorSetHbbft.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddresses.validatorSetAddress) as unknown as ValidatorSetHbbft;
    const wrapped = this.wrapContract<ValidatorSetHbbft>('ValidatorSetHbbft', abi, raw);
    this.cachedValidatorSetHbbft = wrapped;
    return wrapped;
  }

  public getRegistry() : Registry {
    const abi = JsonRegistry.abi as any;
    const raw = new this.web3.eth.Contract(abi, '0x6000000000000000000000000000000000000000') as unknown as Registry;
    return this.wrapContract<Registry>('Registry', abi, raw);
  }

  public getDiamondRegistry(): DMDRegistrarController {
    if (this.cachedDiamondRegistry) {
      return this.cachedDiamondRegistry;
    }

    const contractAddress = config.diamondRegistryContractAddress;
    const abi = JsonDMDRegistrarController as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as DMDRegistrarController;
    const wrapped = this.wrapContract<DMDRegistrarController>('DMDRegistrarController', abi, raw);
    this.cachedDiamondRegistry = wrapped;
    return wrapped;
  }

  public async getDiamondNames(): Promise<DMDNames> {
    if (this.cachedDiamondNames) {
      return this.cachedDiamondNames;
    }

    const contractAddress = await this.getDiamondRegistry().methods.diamondNames().call();

    const abi = JsonDMDNames as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as DMDNames;
    const wrapped = this.wrapContract<DMDNames>('DMDNames', abi, raw);
    this.cachedDiamondNames = wrapped;
    return wrapped;
  }

  public async getRewardHbbft() : Promise<BlockRewardHbbft> {
    if (this.cachedRewardContract) {
      return this.cachedRewardContract;
    }

    const contractAddress = await this.getValidatorSetHbbft().methods.blockRewardContract().call();

    const abi = JsonBlockRewardHbbft.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as BlockRewardHbbft;
    const wrapped = this.wrapContract<BlockRewardHbbft>('BlockRewardHbbft', abi, raw);
    this.cachedRewardContract = wrapped;
    return this.cachedRewardContract!;
  }

  public async getEpoch() : Promise<number> {
    return h2n(await (await this.getStakingHbbft()).methods.stakingEpoch().call());
  }

  public async getEpochStartBlock() {
    return h2n(await (await this.getStakingHbbft()).methods.stakingEpochStartBlock().call());
  }

  public async getStakingHbbft() : Promise<StakingHbbft> {
    if (this.cachedStakingHbbft) {
      return this.cachedStakingHbbft;
    }

    const contractAddress = await this.getValidatorSetHbbft().methods.stakingContract().call();
    const abi = JsonStakingHbbft.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as StakingHbbft;
    const wrapped = this.wrapContract<StakingHbbft>('StakingHbbft', abi, raw);
    this.cachedStakingHbbft = wrapped;
    return wrapped;
  }

  public getContractPermission() : TxPermissionHbbft {        
    if (this.cachedPermission ) {
      return this.cachedPermission;
    }

    // address from chain spec.
    const configuredAddress = '0x4000000000000000000000000000000000000001';

    const abi = JsonTxPermissionHbbft.abi as any;
    const raw = new this.web3.eth.Contract(abi, configuredAddress) as unknown as TxPermissionHbbft;
    const wrapped = this.wrapContract<TxPermissionHbbft>('TxPermissionHbbft', abi, raw);
    this.cachedPermission = wrapped;
    return wrapped;
  }

  public async getKeyGenHistory() : Promise<KeyGenHistory> {
    if (this.cachedKeyGenHistory) {
      return this.cachedKeyGenHistory;
    }

    const contractAddress = await this.getValidatorSetHbbft().methods.keyGenHistoryContract().call();
    const abi = JsonKeyGenHistory.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as KeyGenHistory;
    const wrapped = this.wrapContract<KeyGenHistory>('KeyGenHistory', abi, raw);
    this.cachedKeyGenHistory = wrapped;
    return wrapped;
  }

  public async isValidatorAvailable(miningAddress: string) {
     const validatorAvailableSince = new BigNumber(await (await this.getValidatorSetHbbft()).methods.validatorAvailableSince(miningAddress).call());
     return !validatorAvailableSince.isZero();
  }

  public async getValidators() {
    return await this.getValidatorSetHbbft().methods.getValidators().call();
  }

  public async getPendingValidators() {
    return await this.getValidatorSetHbbft().methods.getPendingValidators().call();
  }


  public async getPendingValidatorState(validator: string) : Promise<KeyGenMode> {
    return h2n(await this.getValidatorSetHbbft().methods
      .getPendingValidatorKeyGenerationMode(validator).call());
  }

  public async getKeyPARTBytesLength(validator: string) {
    const part = await this.getKeyPART(validator);
    return (part.length - 2) / 2;
  }

  public async getKeyPART(validator: string) : Promise<string> {
    return await (await this.getKeyGenHistory()).methods.getPart(validator).call();
  }

  public async getKeyACKSNumber(validator: string) : Promise<number> {
    return h2n(await (await this.getKeyGenHistory()).methods.getAcksLength(validator).call());
  }

  public async getCurrentKeyGenRound() : Promise<number> {
    return h2n(await (await this.getKeyGenHistory()).methods.getCurrentKeyGenRound().call());
  }

  public async getRandomHbbft(): Promise<RandomHbbft> {
    const contractAddress = await this.getValidatorSetHbbft().methods.randomContract().call();

    const abi = JsonRandomHbbft.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as RandomHbbft;
    return this.wrapContract<RandomHbbft>('RandomHbbft', abi, raw);
  }

  public getDaoContract(): DiamondDao {
    const contractAddress = config.daoContractAddress;

    const abi = JsonDiamonDao.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as DiamondDao;
    return this.wrapContract<DiamondDao>('DiamondDao', abi, raw);
  }

  public async getCertifierHbbft(): Promise<CertifierHbbft> {
    const contractAddress = '0x65219102B1AFBC624C56CDbf02186B8341703456';

    const abi = JsonCertifierHbbft.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as CertifierHbbft;
    return this.wrapContract<CertifierHbbft>('CertifierHbbft', abi, raw);
  }

  public async getConnectivityTracker(): Promise<ConnectivityTrackerHbbft> {
    const bsContract = await this.getBonusScoreSystem();
    const contractAddress = await bsContract.methods.connectivityTracker().call();
    const abi = JsonConnectivityTrackerHbbft.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as ConnectivityTrackerHbbft;
    return this.wrapContract<ConnectivityTrackerHbbft>('ConnectivityTrackerHbbft', abi, raw);
  }

  public async getDMDAggregator(): Promise<DMDAggregator> {
    const config = await import('@/lib/config').then(m => m.default);
    const contractAddress = config.aggregatorContractAddress;

    const abi = JsonHbbtAggregator.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as DMDAggregator;
    return this.wrapContract<DMDAggregator>('DMDAggregator', abi, raw);
  }

  public async getBonusScoreSystem(): Promise<BonusScoreSystem> {
    const contractAddress = await this.getValidatorSetHbbft().methods.bonusScoreSystem().call();
    const abi = JsonBonusScoreSystem.abi as any;
    const raw = new this.web3.eth.Contract(abi, contractAddress) as unknown as BonusScoreSystem;
    return this.wrapContract<BonusScoreSystem>('BonusScoreSystem', abi, raw);
  }
}
