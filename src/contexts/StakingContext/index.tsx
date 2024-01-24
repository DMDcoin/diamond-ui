import React, { createContext, useContext, useState } from "react";

import { BN } from "bn.js";
import { useWeb3Context } from "../Web3Context";
import { Context } from "./models/context";
import { BlockType, NonPayableTx } from "./types/contracts";
import { Delegator, Pool } from "./models/model";
import { ContextProviderProps, StakingContextState } from "../Web3Context/types";


interface StakingContextProps {
  stakingDataAdapter: StakingContextState | null,
  initializeStakingDataAdapter: () => {}
}

const StakingContext = createContext<StakingContextProps | undefined>(undefined);

const StakingContextProvider: React.FC<ContextProviderProps> = ({children}) => {
  const web3Context = useWeb3Context();
  const web3 = web3Context.web3;
  const userWallet = web3Context.userWallet;
  const contractsManager = web3Context.contractsManager;

  // const contracts = new ContractManager(web3);
  const initialStakingContextState: StakingContextState = {
    initialized: false,
    context: new Context(),
    handlingNewBlock: false,
    // contracts: contracts,
    // vsContract: contracts.getValidatorSetHbbft(),
    showAllPools: false,
    isShowHistoric: false,
    isReadingData: false,
    showHistoricBlock: 0,
    defaultTxOpts: {
      from: '',
      gasPrice: '1000000000',
      gasLimit: '8000000',
      value: '0'
    },
  };
  const [stakingDataAdapter, setStakingDataAdapter] = useState<StakingContextState>(initialStakingContextState);

  const initializeStakingDataAdapter = async () => {
    if (stakingDataAdapter.initialized) return;

    stakingDataAdapter.initialized = true
    contractsManager.stContract = await contractsManager.contracts.getStakingHbbft();
    contractsManager.brContract = await contractsManager.contracts.getRewardHbbft();
    contractsManager.kghContract = await contractsManager.contracts.getKeyGenHistory();
    contractsManager.rngContract = await contractsManager.contracts.getRandomHbbft();

    await refresh();
    updateEventSubscription();
  }

  /**
   * updates the event subscript based on the fact 
   * if we are browsing historic data or not.
   */
  const updateEventSubscription = () => {
    console.log('[INFO] Updating event subscription. Is historic?:', stakingDataAdapter.isShowHistoric);

    if (stakingDataAdapter.isShowHistoric) {
      // if we browse historic, we can safely unsusbscribe from events.
      unsubscribeToEvents();
    }
    else {
      // if we are tracking the latest block,
      // we only subscript to event if we have not done already.
      if (!stakingDataAdapter.newBlockPolling) {
        subscribeToEvents();
      }
    }
  }

  const unsubscribeToEvents = () => {
    if (stakingDataAdapter.newBlockPolling) {
      clearInterval(stakingDataAdapter.newBlockPolling);
      stakingDataAdapter.newBlockPolling = undefined;
    }
  }

  const subscribeToEvents = async (): Promise<void> => {
    unsubscribeToEvents();

    stakingDataAdapter.newBlockPolling = setInterval(async () =>  {
      // we make a double check, if we really
      // should not browse historic.
      if (stakingDataAdapter.isShowHistoric) {
        return;
      }

      const currentBlock = await web3.eth.getBlockNumber();
      if (currentBlock > stakingDataAdapter.context.currentBlockNumber && !stakingDataAdapter.handlingNewBlock) {
        stakingDataAdapter.handlingNewBlock = true;
        await handleNewBlock();
        stakingDataAdapter.handlingNewBlock = false;
      }
    }, 300000);
  }

  const handleNewBlock = async () : Promise<void> => {
    const currWallet = userWallet;
    const currContext = stakingDataAdapter.context;

    console.log('[INFO] Handling new block.');
    const blockHeader = await web3.eth.getBlock('latest');
    console.log(`[INFO] Current Block Number:`, currContext.currentBlockNumber);

    currContext.currentBlockNumber = blockHeader.number;
    currContext.currentTimestamp = new BN(blockHeader.timestamp);

    if (currWallet) {
      const myBalance = new BN(await web3.eth.getBalance(currWallet.myAddr));
      currWallet.myBalance = myBalance;
    }

    // epoch change
    console.log(`[Info] Updating stakingEpochEndBlock at block ${currContext.currentBlockNumber}`);
    const oldEpoch = currContext.stakingEpoch;
    await retrieveValuesFromContract();

    console.log("[INFO] Epoch times | Old", oldEpoch, "Latest:", currContext.stakingEpoch, oldEpoch !== currContext.stakingEpoch);

    const isNewEpoch = oldEpoch !== currContext.stakingEpoch;

    setStakingDataAdapter((prevDataAdapter) => ({
      ...prevDataAdapter, 
      context: currContext
    }));
    web3Context.setUserWallet(currWallet);
    await syncPoolsState(isNewEpoch);
  }

  const refresh = async () => {
    try {
      const history_info = getBlockHistoryInfoAsString();
      console.log('[INFO] Starting data refresh', history_info);
      stakingDataAdapter.isReadingData = true;
      await retrieveGlobalValues();
      await retrieveValuesFromContract();
      await syncPoolsState(true);
      stakingDataAdapter.isReadingData = false;
      stakingDataAdapter.lastError = undefined;
      console.log('[INFO] Finished data refresh', history_info);
    } catch(e: unknown) {
      stakingDataAdapter.lastError = e;
      stakingDataAdapter.isReadingData = false;
    }
  }

  const getBlockHistoryInfoAsString = () => {
    return stakingDataAdapter.isShowHistoric ? `historic block #${stakingDataAdapter.showHistoricBlock}` : 'latest';
  }

  const tx = () : NonPayableTx | undefined => {
    return undefined;
  }

  const block = () : BlockType => {
    if ( stakingDataAdapter.isShowHistoric ) {
      return stakingDataAdapter.showHistoricBlock;
    }

    return stakingDataAdapter.context.currentBlockNumber;
  }

  const getMyStake = async (stakingAddress: string): Promise<string> => {
    if (!web3 || !userWallet || !contractsManager.stContract) {
      return '0';
    }
    
    const stakeAmount = contractsManager.stContract.methods.stakeAmount(stakingAddress, userWallet.myAddr).call(tx(), block());
    return stakeAmount;
  }

  const getBannedUntil = async (miningAddress: string): Promise<any> => {
    return new BN((await contractsManager.vsContract.methods.bannedUntil(miningAddress).call(tx(), block())));
  }

  const getBanCount = async (miningAddress: string): Promise<number> => {
    return parseInt(await contractsManager.vsContract.methods.banCounter(miningAddress).call(tx(), block()));
  }

  const getAvailableSince = async (miningAddress: string): Promise<any> => {
    const rawResult = await contractsManager.vsContract.methods.validatorAvailableSince(miningAddress).call(tx(), block());
    return new BN(rawResult);
  }

  const retrieveGlobalValues = async () => {
    console.log("[INFO] Retrieving Global Values")
    const currWeb3 = web3;
    const currContext = stakingDataAdapter.context;
    if (currWeb3.eth.defaultBlock === undefined || currWeb3.eth.defaultBlock === 'latest') {
      currContext.currentBlockNumber = await currWeb3.eth.getBlockNumber();
      currContext.latestBlockNumber  = currContext.currentBlockNumber;
    } else if ( typeof currWeb3.eth.defaultBlock === 'number' ) {
        currContext.currentBlockNumber = currWeb3.eth.defaultBlock;
        currContext.latestBlockNumber  = await currWeb3.eth.getBlockNumber();
        currWeb3.defaultBlock = currWeb3.eth.defaultBlock;
    } else {
      console.warn('Unexpected defaultBlock: ', currWeb3.eth.defaultBlock);
    }

    if (contractsManager.stContract) {
      currContext.candidateMinStake = new BN(await contractsManager.stContract.methods.candidateMinStake().call(tx(), block()));
      currContext.delegatorMinStake = new BN(await contractsManager.stContract.methods.delegatorMinStake().call(tx(), block()));
    }
    
    currContext.minimumGasFee = new BN(await contractsManager.contracts.getContractPermission().methods.minimumGasPrice().call(tx(), block()));

    // those values are asumed to be not changeable.
    currContext.epochDuration = parseInt(await (await contractsManager.contracts.getStakingHbbft()).methods.stakingFixedEpochDuration().call(tx(), block()));
    currContext.stakeWithdrawDisallowPeriod = parseInt(await (await contractsManager.contracts.getStakingHbbft()).methods.stakingWithdrawDisallowPeriod().call(tx(), block()));

    setStakingDataAdapter((prevDataAdapter) => ({
      ...prevDataAdapter, 
      context: currContext,
      web3: currWeb3
    }));
  }

  const retrieveValuesFromContract = async () => {
    console.log("[INFO] Retrieving Values From Contract");
    const currContext = stakingDataAdapter.context;
    const oldStakingEpoch = stakingDataAdapter.context.stakingEpoch;

    const promises: Promise<any>[] = [];
    
    if (contractsManager.stContract) {
      currContext.stakingEpoch = parseInt(await contractsManager.stContract.methods.stakingEpoch().call(tx(), block()));
    }

    promises.push(
      contractsManager.contracts.getCurrentKeyGenRound(block()).then((result) => {
        currContext.keyGenRound = result;
      })
    );
    
    if (currContext.stakingEpoch !== oldStakingEpoch && contractsManager.stContract && contractsManager.brContract) {
      promises.push(
        contractsManager.stContract.methods.stakingEpochStartBlock().call(tx(), block()).then((result) => {
          currContext.epochStartBlock = parseInt(result);
        }),
        contractsManager.stContract.methods.stakingEpochStartTime().call(tx(), block()).then((result) => {
          currContext.epochStartTime = parseInt(result);
        }),
        contractsManager.brContract.methods.deltaPot().call(tx(), block()).then((result) => {
          currContext.deltaPot = web3.utils.fromWei(result, 'ether');
        }),
        contractsManager.brContract.methods.reinsertPot().call(tx(), block()).then((result) => {
          currContext.reinsertPot = web3.utils.fromWei(result, 'ether');
        }),
        contractsManager.stContract.methods.stakingFixedEpochEndTime().call(tx(), block()).then((result) => {
          currContext.stakingEpochEndTime = parseInt(result);
        }),
        contractsManager.stContract.methods.areStakeAndWithdrawAllowed().call(tx(), block()).then((result) => {
          currContext.canStakeOrWithdrawNow = result;
        })
      );
  
      promises.push(
        web3.eth.getBalance('0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0').then((daoPotValue) => {
          currContext.daoPot = web3.utils.fromWei(daoPotValue, 'ether');
        })
      );
    }

    await Promise.allSettled(promises).then(() => {
      setStakingDataAdapter((prevDataAdapter) => ({
        ...prevDataAdapter, 
        context: currContext
      }));
    });
  }
  
  const syncPoolsState = async (isNewEpoch: boolean) => {
    const currContext = stakingDataAdapter.context;

    const newCurrentValidators = await contractsManager.vsContract.methods.getValidators().call(tx(), block());
    const validatorWithoutPool: Array<string> = [...newCurrentValidators];
    
    let activePoolAddrs: Array<string> = [];
    let inactivePoolAddrs: Array<string> = [];
    let toBeElectedPoolAddrs: Array<string> = [];
    let pendingValidatorAddrs: Array<string> = [];

    if (contractsManager.stContract) {
      await Promise.allSettled([
        contractsManager.stContract.methods.getPools().call(tx(), block()).then((result) => {
          activePoolAddrs = result;
        }),
        contractsManager.stContract.methods.getPoolsInactive().call(tx(), block()).then((result) => {
          inactivePoolAddrs = result;
        }),
        contractsManager.stContract.methods.getPoolsToBeElected().call(tx(), block()).then((result) => {
          toBeElectedPoolAddrs = result;
        }),
        contractsManager.vsContract.methods.getPendingValidators().call(tx(), block()).then((result) => {
          pendingValidatorAddrs = result;
        }),
      ])
    }

    console.log(`[INFO] Syncing Active(${activePoolAddrs.length}) and Inactive(${inactivePoolAddrs.length}) pools...`);
    const allPools = activePoolAddrs.concat(inactivePoolAddrs);

    if (currContext.currentValidators.toString() !== newCurrentValidators.toString()) {
      console.log(`[INFO] Validator set changed in block ${currContext.currentBlockNumber} to:\n\n${newCurrentValidators}`);
      currContext.currentValidators = newCurrentValidators;
    }

    // check if there is a new pool that is not tracked yet within the context.
    allPools.forEach((poolAddress) => {
      const findResult = currContext.pools.find((x) => x.stakingAddress === poolAddress);
      if (!findResult) {
        const pool = new Pool(poolAddress);
        currContext.pools = [...currContext.pools, pool];
      }
    });

    // update pools in batches of 10 for less rpc calls at once
    const batchSize = 10;
    let updatedPools: Pool[] = [];
    let currPoolsCopy = currContext.pools;

    for (let i = 0; i < currPoolsCopy.length; i += batchSize) {
      const batch = currPoolsCopy.slice(i, i + batchSize);
      
      const batchPromises = batch.map((p) => {
        const ixValidatorWithoutPool = validatorWithoutPool.indexOf(p.miningAddress);
        if (ixValidatorWithoutPool !== -1) {
          validatorWithoutPool.splice(ixValidatorWithoutPool, 1);
        }
        return updatePool(p, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, isNewEpoch);
      });

      await Promise.allSettled(batchPromises).then((batchResults) => {
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            updatedPools.push(result.value);
          }
        });

        currContext.pools = updatedPools;
        setStakingDataAdapter((prevDataAdapter) => ({
          ...prevDataAdapter,
          context: currContext
        }));
      });
    }
  }

  const updatePool = async (pool: Pool, activePoolAddrs: Array<string>, toBeElectedPoolAddrs: Array<string>, pendingValidatorAddrs: Array<string>, isNewEpoch: boolean) : Promise<Pool>  => {
    const { stakingAddress } = pool;

    pool.miningAddress = await contractsManager.vsContract.methods.miningByStakingAddress(stakingAddress).call(tx(), block());
    await Promise.allSettled([
      contractsManager.vsContract.methods.getPublicKey(pool.miningAddress).call(tx(), block()).then((result) => {
        pool.miningPublicKey = result;
      }),
      getAvailableSince(pool.miningAddress).then((result) => {
        pool.availableSince = result;
      }),
      getMyStake(stakingAddress).then((result) => {
        pool.myStake = new BN(result);
      }),
    ]);

    if (contractsManager.stContract) {
      await Promise.allSettled([
        contractsManager.stContract.methods.poolDelegators(stakingAddress).call(tx(), block()).then((result) => {
          pool.delegators = result.map((delegator: any) => new Delegator(delegator));
        }),
        contractsManager.stContract.methods.stakeAmount(stakingAddress, stakingAddress).call(tx(), block()).then((result) => {
          pool.candidateStake = new BN(result);
        }),
        contractsManager.stContract.methods.stakeAmountTotal(stakingAddress).call(tx(), block()).then((result) => {
          pool.totalStake = new BN(result);
        }),
        userWallet ? contractsManager.stContract.methods.orderedWithdrawAmount(stakingAddress, userWallet.myAddr).call(tx(), block()).then((result) => {
          pool.orderedWithdrawAmount = new BN(result);
        }) : new BN(0),
        // stakingDataAdapter.getClaimableReward(stakingAddress).then((result) => {
        //   pool.claimableReward = result;
        // })
        getBanCount(pool.miningAddress).then((result) => {
          pool.banCount = result;
        }),
        getBannedUntil(pool.miningAddress).then((result) => {
          pool.bannedUntil = new BN(result);
        }),
        contractsManager.contracts.getPendingValidatorState(pool.miningAddress, block()).then((result) => {
          pool.keyGenMode = result;
        }),
      ])
    }
    
    pool.isAvailable = !pool.availableSince.isZero();
    pool.isActive = activePoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isToBeElected = toBeElectedPoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isPendingValidator = pendingValidatorAddrs.indexOf(pool.miningAddress) >= 0;
    pool.isMe = userWallet ? userWallet.myAddr === pool.stakingAddress : false;
    pool.isCurrentValidator = stakingDataAdapter.context.currentValidators.indexOf(pool.miningAddress) >= 0;    

    // remove pool if required
    if (!stakingDataAdapter.showAllPools) {
      if(!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && !pool.myStake.gt(new BN('0'))) {
        for (let i = 0; i < stakingDataAdapter.context.pools.length; i++) {
          if (stakingDataAdapter.context.pools[i].stakingAddress === pool.stakingAddress) {
            stakingDataAdapter.context.pools.splice(i, 1);
            break;
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

    if (pool.isPendingValidator && contractsManager.kghContract) {
      pool.parts = await contractsManager.kghContract.methods.parts(pool.miningAddress).call(tx(), block());
      const acksLengthBN = new BN(await contractsManager.kghContract.methods.getAcksLength(pool.miningAddress).call(tx(), block()));
      pool.numberOfAcks = acksLengthBN.toNumber();
    } else {
      pool.parts = '';
      pool.numberOfAcks = 0;
    }
    return pool;
  }
  
  const contextValue = {
    // states
    stakingDataAdapter,
    
    // methods
    initializeStakingDataAdapter
  };

  return (
    <StakingContext.Provider value={contextValue}>
      {children}
    </StakingContext.Provider>
  );
};

const useStakingContext = (): StakingContextProps => {
  const context = useContext(StakingContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export { StakingContextProvider, useStakingContext };
