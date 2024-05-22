import React, { createContext, useContext, useEffect, useState } from "react";

import BigNumber from "bignumber.js";
import { useWeb3Context } from "../Web3Context";
import { BlockType, NonPayableTx } from "./types/contracts";
import { Delegator, Pool } from "./models/model";
import { ContextProviderProps, StakingContextState } from "../Web3Context/types";


interface StakingContextProps {
  pools: Pool[];
  initializeStakingDataAdapter: () => {}
}

const StakingContext = createContext<StakingContextProps | undefined>(undefined);

const StakingContextProvider: React.FC<ContextProviderProps> = ({children}) => {
  const {
    contractsManager,
    setUserWallet,
    userWallet,
    web3,
  } = useWeb3Context();

  const [initialized, setInitialized] = useState<boolean>(false);
  const [handlingNewBlock, setHandlingNewBlock] = useState<boolean>(false);
  const [showAllPools, setShowAllPools] = useState<boolean>(false);
  const [isShowHistoric, setIsShowHistoric] = useState<boolean>(false);
  const [isReadingData, setIsReadingData] = useState<boolean>(false);
  const [showHistoricBlock, setShowHistoricBlock] = useState<number>(0);
  const [defaultTxOpts, setDefaultTxOpts] = useState<{from: string; gasPrice: string; gasLimit: string; value: string;}>({
    from: '',
    gasPrice: '1000000000',
    gasLimit: '8000000',
    value: '0'
  });

  const [pools, setPools] = useState<Pool[]>([]);
  const [stakingEpoch, setStakingEpoch] = useState<number>(0);
  const [keyGenRound, setKeyGenRound] = useState<number>(0);
  const [totalDaoStake, setTotalDaoStake] = useState<BigNumber>(new BigNumber(0));
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number>(0);
  const [latestBlockNumber, setLatestBlockNumber] = useState<number>(0);
  const [currentTimestamp, setCurrentTimestamp] = useState<any>(null);
  const [coinSymbol, setCoinSymbol] = useState<string>('DMD');
  const [epochDuration, setEpochDuration] = useState<number>(0);
  const [stakeWithdrawDisallowPeriod, setStakeWithdrawDisallowPeriod] = useState<number>(0);
  const [candidateMinStake, setCandidateMinStake] = useState<BigNumber>(new BigNumber(0));
  const [delegatorMinStake, setDelegatorMinStake] = useState<BigNumber>(new BigNumber(0));
  const [minimumGasFee, setMinimumGasFee] = useState<BigNumber>(new BigNumber(0));
  const [epochStartBlock, setEpochStartBlock] = useState<number>(0);
  const [epochStartTime, setEpochStartTime] = useState<number>(0);
  const [stakingEpochEndTime, setStakingEpochEndTime] = useState<number>(0);
  const [deltaPot, setDeltaPot] = useState<string>('');
  const [daoPot, setDaoPot] = useState<string>('');
  const [reinsertPot, setReinsertPot] = useState<string>('');
  const [canStakeOrWithdrawNow, setCanStakeOrWithdrawNow] = useState<boolean>(false);
  const [stakingAllowedTimeframe, setStakingAllowedTimeframe] = useState<number>(0);
  const [isSyncingPools, setIsSyncingPools] = useState<boolean>(true);
  const [currentValidators, setCurrentValidators] = useState<string[]>([]);
  const [currentValidatorsWithoutPools, setCurrentValidatorsWithoutPools] = useState<string[]>([]);
  const [numbersOfValidators, setNumbersOfValidators] = useState<number>(0);
  const [newBlockPolling, setNewBlockPolling] = useState<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    console.log("[INFO] User Wallet Changed")
    setPools(prevPools => {
      prevPools.forEach(pool => {
      getMyStake(pool.stakingAddress).then((result) => {
          pool.myStake = new BigNumber(result);
        });
      });
      return prevPools;
    })
  }, [userWallet, pools]);

  useEffect(() => {
    console.log("[INFO] totalDaoStake Changed")
    updatePoolsVotingPower(totalDaoStake);
  }, [totalDaoStake, pools]);

  useEffect(() => {
    console.log("[INFO] currentBlockNumber Changed")
    retrieveValuesFromContract().then(() => {
      syncPoolsState(true);
    });
  }, [currentBlockNumber]);

  const updatePoolsVotingPower = async (totalDaoStake: BigNumber) => {
    if (contractsManager.stContract) {
      setPools(prevPools => {
        prevPools.forEach(pool => {
          pool.votingPower = pool.totalStake.dividedBy(totalDaoStake).multipliedBy(100).decimalPlaces(2);
        });
        return prevPools;
      });
    }
  }

  const initializeStakingDataAdapter = async () => {
    if (initialized) return;

    contractsManager.stContract = await contractsManager.contracts.getStakingHbbft();
    contractsManager.brContract = await contractsManager.contracts.getRewardHbbft();
    contractsManager.kghContract = await contractsManager.contracts.getKeyGenHistory();
    contractsManager.rngContract = await contractsManager.contracts.getRandomHbbft();

    await refresh();
    updateEventSubscription();
    setInitialized(true);
  }

  /**
   * updates the event subscript based on the fact 
   * if we are browsing historic data or not.
   */
  const updateEventSubscription = () => {
    console.log('[INFO] Updating event subscription. Is historic?:', isShowHistoric);

    if (isShowHistoric) {
      // if we browse historic, we can safely unsusbscribe from events.
      unsubscribeToEvents();
    }
    else {
      // if we are tracking the latest block,
      // we only subscript to event if we have not done already.
      if (!newBlockPolling) {
        subscribeToEvents();
      }
    }
  }

  const unsubscribeToEvents = () => {
    if (newBlockPolling) {
      clearInterval(newBlockPolling);
      setNewBlockPolling(undefined);
    }
  }

  const subscribeToEvents = async (): Promise<void> => {
    unsubscribeToEvents();

    setNewBlockPolling(setInterval(async () =>  {
      // we make a double check, if we really
      // should not browse historic.
      if (isShowHistoric) {
        return;
      }

      const currentBlock = await web3.eth.getBlockNumber();
      if (currentBlock > currentBlockNumber && !handlingNewBlock) {
        await handleNewBlock();
        setHandlingNewBlock(false);
      }
    }, 300000));
  }

  const handleNewBlock = async () : Promise<void> => {
    const currWallet = userWallet;

    console.log('[INFO] Handling new block.');
    const blockHeader = await web3.eth.getBlock('latest');
    console.log(`[INFO] Current Block Number:`, currentBlockNumber);

    setCurrentBlockNumber(blockHeader.number);
    setCurrentTimestamp(blockHeader.timestamp);

    if (currWallet.myAddr) {
      const myBalance = new BigNumber(await web3.eth.getBalance(currWallet.myAddr));
      currWallet.myBalance = myBalance;
    }

    // epoch change
    console.log(`[Info] Updating stakingEpochEndBlock at block ${currentBlockNumber}`);
    const oldEpoch = stakingEpoch;
    await retrieveValuesFromContract();

    console.log("[INFO] Epoch times | Old", oldEpoch, "Latest:", stakingEpoch, oldEpoch !== stakingEpoch);

    const isNewEpoch = oldEpoch !== stakingEpoch;

    setUserWallet(currWallet);
    await syncPoolsState(isNewEpoch);
  }

  const refresh = async () => {
    try {
      setIsReadingData(true);
      await retrieveGlobalValues();
    } catch(e: unknown) {}
    setIsReadingData(false);
  }

  const getBlockHistoryInfoAsString = () => {
    return isShowHistoric ? `historic block #${showHistoricBlock}` : 'latest';
  }

  const tx = () : NonPayableTx | undefined => {
    return undefined;
  }

  const block = () : BlockType => {
    if ( isShowHistoric ) {
      return showHistoricBlock;
    }

    return currentBlockNumber;
  }

  const getMyStake = async (stakingAddress: string): Promise<string> => {
    if (!web3 || !userWallet || !contractsManager.stContract || !userWallet.myAddr) {
      return '0';
    }
    
    const stakeAmount = contractsManager.stContract.methods.stakeAmount(stakingAddress, userWallet.myAddr).call(tx(), block());
    return stakeAmount;
  }

  const getBannedUntil = async (miningAddress: string): Promise<any> => {
    return new BigNumber((await contractsManager.vsContract.methods.bannedUntil(miningAddress).call(tx(), block())));
  }

  const getBanCount = async (miningAddress: string): Promise<number> => {
    return parseInt(await contractsManager.vsContract.methods.banCounter(miningAddress).call(tx(), block()));
  }

  const getAvailableSince = async (miningAddress: string): Promise<any> => {
    const rawResult = await contractsManager.vsContract.methods.validatorAvailableSince(miningAddress).call(tx(), block());
    return new BigNumber(rawResult);
  }

  const retrieveGlobalValues = async () => {
    console.log("[INFO] Retrieving Global Values")
    const currWeb3 = web3;

    if (currWeb3.eth.defaultBlock === undefined || currWeb3.eth.defaultBlock === 'latest') {
      const cBlockN = await currWeb3.eth.getBlockNumber();
      setCurrentBlockNumber(cBlockN);
      setLatestBlockNumber(cBlockN);
    } else if ( typeof currWeb3.eth.defaultBlock === 'number' ) {
        setLatestBlockNumber(await currWeb3.eth.getBlockNumber());
        setCurrentBlockNumber(currWeb3.eth.defaultBlock);
        currWeb3.defaultBlock = currWeb3.eth.defaultBlock;
    } else {
      console.warn('Unexpected defaultBlock: ', currWeb3.eth.defaultBlock);
    }

    if (contractsManager.stContract) {
      setCandidateMinStake(new BigNumber(await contractsManager.stContract.methods.candidateMinStake().call(tx(), block())));
      setDelegatorMinStake(new BigNumber(await contractsManager.stContract.methods.delegatorMinStake().call(tx(), block())));
    }
    setMinimumGasFee(new BigNumber(await contractsManager.contracts.getContractPermission().methods.minimumGasPrice().call(tx(), block())));

    // those values are asumed to be not changeable.
    setEpochDuration(parseInt(await (await contractsManager.contracts.getStakingHbbft()).methods.stakingFixedEpochDuration().call(tx(), block())));
    setStakeWithdrawDisallowPeriod(parseInt(await (await contractsManager.contracts.getStakingHbbft()).methods.stakingWithdrawDisallowPeriod().call(tx(), block())));
  }

  const retrieveValuesFromContract = async () => {
    console.log("[INFO] Retrieving Values From Contract");
    const oldStakingEpoch = stakingEpoch;

    const promises: Promise<any>[] = [];
    
    if (contractsManager.stContract) {
      setStakingEpoch(parseInt(await contractsManager.stContract.methods.stakingEpoch().call(tx(), block())));
      setTotalDaoStake(new BigNumber(await web3.eth.getBalance(contractsManager.stContract.options.address)));
    }

    promises.push(
      contractsManager.contracts.getCurrentKeyGenRound(block()).then((result) => {
        setKeyGenRound(result);
      })
    );
    
    if (stakingEpoch !== oldStakingEpoch && contractsManager.stContract && contractsManager.brContract) {
      promises.push(
        contractsManager.stContract.methods.stakingEpochStartBlock().call(tx(), block()).then((result) => {
          setEpochStartBlock(parseInt(result));
        }),
        contractsManager.stContract.methods.stakingEpochStartTime().call(tx(), block()).then((result) => {
          setEpochStartTime(parseInt(result));
        }),
        contractsManager.brContract.methods.deltaPot().call(tx(), block()).then((result) => {
          setDeltaPot(web3.utils.fromWei(result, 'ether'));
        }),
        contractsManager.brContract.methods.reinsertPot().call(tx(), block()).then((result) => {
          setReinsertPot(web3.utils.fromWei(result, 'ether'));
        }),
        contractsManager.stContract.methods.stakingFixedEpochEndTime().call(tx(), block()).then((result) => {
          setStakingEpochEndTime(parseInt(result));
        }),
        contractsManager.stContract.methods.areStakeAndWithdrawAllowed().call(tx(), block()).then((result) => {
          setCanStakeOrWithdrawNow(result);
        })
      );
  
      promises.push(
        web3.eth.getBalance('0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0').then((daoPotValue) => {
          setDaoPot(web3.utils.fromWei(daoPotValue, 'ether'));
        })
      );
    }
  }
  
  const syncPoolsState = async (isNewEpoch: boolean) => {
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

    if (currentValidators.toString() !== newCurrentValidators.toString()) {
      console.log(`[INFO] Validator set changed in block ${currentBlockNumber} to:\n\n${newCurrentValidators}`);
      setCurrentValidators(newCurrentValidators);
    }

    // check if there is a new pool that is not tracked yet within the context.
    setPools(prevPools => {
      const newPools = [...prevPools];
      allPools.forEach(poolAddress => {
        const findResult = newPools.find(x => x.stakingAddress === poolAddress);
        if (!findResult) {
          const pool = new Pool(poolAddress);
          newPools.push(pool);
        }
      });

      updatePools(newPools, validatorWithoutPool, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, isNewEpoch);
      return newPools;
    });
  }
  
  const updatePools = async (
    pools: Pool[],
    validatorWithoutPool: Array<string>,
    activePoolAddrs: Array<string>,
    toBeElectedPoolAddrs: Array<string>,
    pendingValidatorAddrs: Array<string>,
    isNewEpoch: boolean
  ) => {
    // update pools in batches of 10 for less rpc calls at once
    const batchSize = 10;
    let updatedPools: Pool[] = [];

    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      
      const batchPromises = batch.map((p) => {
        const ixValidatorWithoutPool = validatorWithoutPool.indexOf(p.miningAddress);
        if (ixValidatorWithoutPool !== -1) {
          validatorWithoutPool.splice(ixValidatorWithoutPool, 1);
        }
        p.votingPower = p.totalStake.dividedBy(totalDaoStake).multipliedBy(100);
        return updatePool(p, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, isNewEpoch);
      });

      await Promise.allSettled(batchPromises).then((batchResults) => {
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            updatedPools.push(result.value);
          }
        });

        setPools([...updatedPools]);
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
        pool.myStake = new BigNumber(result);
      }),
    ]);

    if (contractsManager.stContract) {
      await Promise.allSettled([
        contractsManager.stContract.methods.poolDelegators(stakingAddress).call(tx(), block()).then((result) => {
          pool.delegators = result.map((delegator: any) => new Delegator(delegator));
        }),
        contractsManager.stContract.methods.stakeAmount(stakingAddress, stakingAddress).call(tx(), block()).then((result) => {
          pool.candidateStake = new BigNumber(result);
        }),
        contractsManager.stContract.methods.stakeAmountTotal(stakingAddress).call(tx(), block()).then((result) => {
          pool.totalStake = new BigNumber(result);
        }),
        userWallet.myAddr ? contractsManager.stContract.methods.orderedWithdrawAmount(stakingAddress, userWallet.myAddr).call(tx(), block()).then((result) => {
          pool.orderedWithdrawAmount = new BigNumber(result);
        }) : new BigNumber(0),
        // getClaimableReward(stakingAddress).then((result) => {
        //   pool.claimableReward = result;
        // })
        getBanCount(pool.miningAddress).then((result) => {
          pool.banCount = result;
        }),
        getBannedUntil(pool.miningAddress).then((result) => {
          pool.bannedUntil = new BigNumber(result);
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
    pool.isCurrentValidator = currentValidators.indexOf(pool.miningAddress) >= 0;    

    // remove pool if required
    if (!showAllPools) {
      if(!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && !pool.myStake.gt(new BigNumber('0'))) {
        for (let i = 0; i < pools.length; i++) {
          if (pools[i].stakingAddress === pool.stakingAddress) {
            pools.splice(i, 1);
            break;
          }
        }
      } else {
        if (!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && pool.myStake.gt(new BigNumber('0'))) {
          pool.score = 0;
        } else {
          pool.score = 1000;
        }
      }
    }

    if (pool.isPendingValidator && contractsManager.kghContract) {
      pool.parts = await contractsManager.kghContract.methods.parts(pool.miningAddress).call(tx(), block());
      const acksLengthBN = new BigNumber(await contractsManager.kghContract.methods.getAcksLength(pool.miningAddress).call(tx(), block()));
      pool.numberOfAcks = acksLengthBN.toNumber();
    } else {
      pool.parts = '';
      pool.numberOfAcks = 0;
    }
    return pool;
  }
  
  const contextValue = {
    // state
    pools,

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
    throw new Error("Couldn't fetch StakingContext!");
  }

  return context;
};

export { StakingContextProvider, useStakingContext };
