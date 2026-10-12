'use client';

import React, { ReactNode, createContext, useContext, useEffect, useState, useCallback } from "react";

import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import { useWeb3Context } from "@/contexts/Web3";
import { UserWallet } from "@/contexts/types/wallet";
import { NonPayableTx } from "@/contexts/types/contracts";
import { getAddressFromPublicKey } from "@/utils/common";
import { formatDmd, formatDmdFromWei } from "@/utils/format";
import { PoolCache, Delegator, Pool, AbandonedPool } from "@/contexts/types/models";
import { buildTxOptions, EstimatableMethod } from "@/utils/txOptions";
import logger from '@/utils/logger';

interface StakingContextProps {
  pools: Pool[];
  deltaPot: string;
  reinsertPot: string;
  keyGenRound: number;
  stakingEpoch: number;
  epochStartTime: number;
  validCandidates: number;
  epochStartBlock: number;
  myTotalStake: BigNumber;
  isSyncingPools: boolean;
  stakesSyncedFor: string;
  myPool: Pool | undefined;
  activeValidators: number;
  minimumGasFee: BigNumber;
  totalDaoStake: BigNumber;
  myCandidateStake: BigNumber;
  stakingInitialized: boolean;
  candidateMinStake: BigNumber;
  delegatorMinStake: BigNumber;
  abandonedPools: Record<string, AbandonedPool>;
  inactivityThreshold: number;
  
  initializeStakingDataAdapter: () => {};
  fetchPoolScoreHistory: (pool: Pool) => {};
  retrieveGlobalValues: () => Promise<number>;
  recoverAbandonedStakes: () => Promise<boolean>;
  claimOrderedUnstake: (pool: Pool) => Promise<boolean>;
  setPools: React.Dispatch<React.SetStateAction<Pool[]>>;
  canUpdatePoolOperatorRewards: (pool: Pool) => Promise<boolean>;
  stake: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  unstake: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  removePool: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  addOrUpdatePool: (stakingAddr: string, blockNumber: number) => {};
  getWithdrawableAmounts: (pool: Pool) => Promise<{maxWithdrawAmount: BigNumber, maxWithdrawOrderAmount: BigNumber}>;
  updatePoolOperatorRewardsShare: (pool: Pool, nodeOperatorAddress: string, nodeOperatorShare: BigNumber) => Promise<boolean>;
  createPool: (publicKey: string, stakeAmount: BigNumber, nodeOperatorAddress: string, nodeOperatorShare: BigNumber) => Promise<boolean>;
}

const StakingContext = createContext<StakingContextProps | undefined>(undefined);

const StakingContextProvider: React.FC<{ children: ReactNode }> = ({children}) => {

  const {
    web3Initialized,
    contractsManager,
    showLoader,
    setUserWallet,
    getUpdatedBalance,
    userWallet,
    web3,
    ensureProviderReady,
    getGasPriceSafe,
  } = useWeb3Context();
  
  const [showAllPools, setShowAllPools] = useState<boolean>(false);
  const [isShowHistoric, setIsShowHistoric] = useState<boolean>(false);
  const [showHistoricBlock, setShowHistoricBlock] = useState<number>(0);
  const [handlingNewBlock, setHandlingNewBlock] = useState<boolean>(false);
  const [stakingInitialized, setStakingInitialized] = useState<boolean>(false);
  const [cachedGasPrice, setCachedGasPrice] = useState<string>('0');

  const [myPool, setMyPool] = useState<Pool | undefined>(undefined);
  const [pools, setPools] = useState<Pool[]>(Array.from({ length: 10 }, () => (new Pool(""))));
  const [stakingEpoch, setStakingEpoch] = useState<number>(0);
  const [keyGenRound, setKeyGenRound] = useState<number>(0);
  const [myTotalStake, setMyTotalStake] = useState<BigNumber>(new BigNumber(0));
  const [myCandidateStake, setMyCandidateStake] = useState<BigNumber>(new BigNumber(0));
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
  const [stakingEpochEndBlock, setStakingEpochEndBlock] = useState<number>(0);
  const [deltaPot, setDeltaPot] = useState<string>('');
  const [daoPot, setDaoPot] = useState<string>('');
  const [reinsertPot, setReinsertPot] = useState<string>('');
  const [canStakeOrWithdrawNow, setCanStakeOrWithdrawNow] = useState<boolean>(false);
  const [stakingAllowedTimeframe, setStakingAllowedTimeframe] = useState<number>(0);
  const [isSyncingPools, setIsSyncingPools] = useState<boolean>(true);
  const [stakesSyncedFor, setStakesSyncedFor] = useState<string>('');
  const [currentValidatorsWithoutPools, setCurrentValidatorsWithoutPools] = useState<string[]>([]);
  const [numbersOfValidators, setNumbersOfValidators] = useState<number>(0);
  const [newBlockPolling, setNewBlockPolling] = useState<NodeJS.Timeout | undefined>(undefined);
  const [abandonedPools, setAbandonedPools] = useState<Record<string, AbandonedPool>>({});
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(0);

  useEffect(() => {
    if (pools.filter(pool => pool.miningAddress).length == pools.length) {
      logger.log("[INFO] Updating stake amounts");
      updateStakeAmounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDaoStake, userWallet.myAddr, isSyncingPools]);

  useEffect(() => {
    if (web3Initialized) {
      retrieveGlobalValues().then((bn: number | bigint) => {
        syncPoolsState(Number(bn), true);
        initializeStakingDataAdapter();
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3Initialized]);

  const handleErrorMsg = (err: any, alternateMsg: string) => {
    let errorMessage = alternateMsg;

    // Check for user rejection
    if (err.code === 4001 || err.message?.includes('User denied') || err.message?.includes('User rejected')) {
      toast.info('User denied transaction signature.');
      return;
    }

    // Try to extract meaningful error from various MetaMask error structures
    if (err.message) {
      // Check for execution reverted errors with reason
      const revertMatch = err.message.match(/execution reverted: (.+?)(?:\n|$)/);
      if (revertMatch) {
        errorMessage = revertMatch[1];
      }

      // Check for internal JSON-RPC error
      else if (err.data?.message) {
        errorMessage = err.data.message;
      }

      // Check for cause chain
      else if (err.cause?.message) {
        errorMessage = err.cause.message;
      }

      // Use the main message if it's user-friendly
      else if (!err.message.includes('Internal JSON-RPC error') && 
               !err.message.includes('EVM') &&
               err.message.length < 200) {
        errorMessage = err.message;
      }
    }

    // Clean up common prefixes/suffixes
    errorMessage = errorMessage
      .replace(/^execution reverted:?\s*/i, '')
      .replace(/^err:\s*/i, '')
      .trim();

    toast.error(errorMessage);
    logger.error('Tx error details:', { message: err.message, cause: err.cause, data: err.data, stack: err.stack });
  }

  const getNodeOperatorData = async (pool: Pool) => {
    const nodeOperatorData = await contractsManager.aggregator?.methods.getNodeOperatorData(pool.stakingAddress).call();
    if (nodeOperatorData) {
      return { nodeOperatorAddress: nodeOperatorData[0], nodeOperatorShare: new BigNumber(nodeOperatorData[1] || 0) };
    }
    return { nodeOperatorAddress: '0x0000000000000000000000000000000000000000', nodeOperatorShare: new BigNumber(0) };
  }

  const updateStakeAmounts = async (poolsInp?: Pool[]) => {
    const poolsStakingAddresses = poolsInp ? poolsInp.map(p => p.stakingAddress) : pools.map(p => p.stakingAddress);
    const myAddr = userWallet.myAddr || '0x0000000000000000000000000000000000000000';

    const myStakeAmounts = await contractsManager.aggregator?.methods.getUserStakes(myAddr, poolsStakingAddresses).call();

    let orderedWithdraws: any;

    if (myAddr != '0x0000000000000000000000000000000000000000') {
      orderedWithdraws = await contractsManager.aggregator?.methods.getUserOrderedWithdraws(myAddr, poolsStakingAddresses).call();
    }

    let daoStake = totalDaoStake;
    if (totalDaoStake.isZero() && contractsManager.stContract) {
      daoStake = BigNumber(await contractsManager.stContract?.methods.totalStakedAmount().call());
    }

    let candidateStake = new BigNumber(0);
    let totalStakedByMe = new BigNumber(0);

    setPools((prevPools: any) => {
      const newPools = prevPools.map((pool: Pool) => ({ ...pool }));
      
      poolsStakingAddresses.forEach((stakingAddress, index) => {
        const pool = newPools.filter((p: Pool) => p.stakingAddress === stakingAddress)[0];

        const myStake = myStakeAmounts ? myStakeAmounts[index] : [null, '0', '0'];
        totalStakedByMe = totalStakedByMe.plus(myStake[1] ?? 0);
        setMyTotalStake(totalStakedByMe);
        pool.myStake = new BigNumber(myStake[1] ?? 0);
        pool.totalStake = new BigNumber(myStake[2] ?? 0);
        pool.votingPower = BigNumber(pool.totalStake).isGreaterThan(0) ? BigNumber(pool.totalStake).dividedBy(daoStake).multipliedBy(100).decimalPlaces(2) : new BigNumber(0);

        if (userWallet.myAddr && pool.stakingAddress != userWallet.myAddr) candidateStake = candidateStake.plus(myStake[1] ?? 0);
        setMyCandidateStake(candidateStake);

        if (orderedWithdraws) {
          const orderedWithdrawAmount = orderedWithdraws[index];
          pool.orderedWithdrawAmount = new BigNumber(orderedWithdrawAmount[1] ?? 0);
          pool.orderedWithdrawUnlockEpoch = new BigNumber(orderedWithdrawAmount[2]).isGreaterThan(0) ? new BigNumber(orderedWithdrawAmount[2]).plus(1) : new BigNumber(0);
        }
      });
      
      const myPool = newPools.find((p: Pool) => p.stakingAddress === userWallet.myAddr && BigNumber(p.ownStake).isGreaterThanOrEqualTo(BigNumber(10000).multipliedBy(10 ** 18)));

      if (myPool) {
        getNodeOperatorData(myPool).then((data) => {
          myPool.poolOperator = data.nodeOperatorAddress;
          myPool.poolOperatorShare = data.nodeOperatorShare;
          setMyPool(myPool);
        });
      } else {
        setMyPool(myPool);
      }
      return newPools;
    });

    setStakesSyncedFor(myAddr);
  }

  const initializeStakingDataAdapter = async () => {
    if (stakingInitialized) return;
    updateEventSubscription();
    setStakingInitialized(true);
  }

  const getLatestBlockNumber = async () => {
    const vsContractBlockNumber = await getLatestVsContractBlockNumber();
    const stContractBlockNumber = await getLatestStContractBlockNumber();

    return Number(Math.max(vsContractBlockNumber, stContractBlockNumber) || await web3.eth.getBlockNumber());
  }

  const getLatestVsContractBlockNumber = async () => {
    const allEvents: any[] = [];
    const eventsBatchSize = 100000;
    const currentBlock = await web3.eth.getBlockNumber();
  
    // Retrieve the last block number from localStorage
    const storedBlockNumber = parseInt(localStorage.getItem('contractLatestBlockN') || '0', 10);
    const startBlock = isNaN(storedBlockNumber) ? 0 : storedBlockNumber;
  
    const promises: Promise<void>[] = [];
  
    for (let i = startBlock; i < currentBlock; i += eventsBatchSize) {
      const start = i;
      const end = Math.min(i + eventsBatchSize - 1, Number(currentBlock));
  
      if (contractsManager.vsContract) {
        const promise = contractsManager.vsContract.getPastEvents(
          'allEvents',
          {
            fromBlock: start,
            toBlock: end
          }).then((events) => {
            events.forEach(e => allEvents.push(e));
          }).catch((error) => {
            logger.error(`Error fetching events from block ${start} to ${end}:`, error);
          });
  
        promises.push(promise);
      }
    }
  
    await Promise.allSettled(promises);
  
    const latestEvent = allEvents.reduce((maxEvent: any, event: any) => 
      event.blockNumber > maxEvent.blockNumber ? event : maxEvent, allEvents[0]);
  
    const latestBlockNumber = latestEvent?.blockNumber ?? Number(currentBlock);
  
    // Store the latest block number in localStorage
    localStorage.setItem('contractLatestBlockN', latestBlockNumber.toString());
  
    return latestBlockNumber;
  }

  const getLatestStContractBlockNumber = async () => {
    const allEvents: any[] = [];
    const eventsBatchSize = 100000;
    const currentBlock = await web3.eth.getBlockNumber();
  
    // Retrieve the last block number from localStorage
    const storedBlockNumber = parseInt(localStorage.getItem('contractLatestBlockN') || '0', 10);
    const startBlock = isNaN(storedBlockNumber) ? 0 : storedBlockNumber;
  
    const promises: Promise<void>[] = [];
  
    for (let i = startBlock; i < currentBlock; i += eventsBatchSize) {
      const start = i;
      const end = Math.min(i + eventsBatchSize - 1, Number(currentBlock));
  
      if (contractsManager.stContract) {
        const promise = contractsManager.stContract.getPastEvents(
          'allEvents',
          {
            fromBlock: start,
            toBlock: end
          }).then((events) => {
            events.forEach(e => allEvents.push(e));
          }).catch((error) => {
            logger.error(`Error fetching events from block ${start} to ${end}:`, error);
          });
  
        promises.push(promise);
      }
    }
  
    await Promise.allSettled(promises);

    const latestEvent = allEvents.reduce((maxEvent: any, event: any) => 
      event.blockNumber > maxEvent.blockNumber ? event : maxEvent, allEvents[0]);

    const latestBlockNumber = latestEvent?.blockNumber ?? currentBlock;
  
    // Store the latest block number in localStorage
    localStorage.setItem('contractLatestBlockN', latestBlockNumber.toString());
  
    return latestBlockNumber;
  }

  /**
   * updates the event subscript based on the fact 
   * if we are browsing historic data or not.
   */
  const updateEventSubscription = () => {
    logger.log('[INFO] Updating event subscription. Is historic?:', isShowHistoric);

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

      const currentBlock = await getLatestBlockNumber();
      setCurrentBlockNumber(
        prevState => {
          if (currentBlock > prevState && !handlingNewBlock) {
            handleNewBlock(currentBlock).then(() => {
              setHandlingNewBlock(false);
            });
          }
          return prevState;
        }
      )
      
    }, 300000)); // 5 minutes
  }

  const handleNewBlock = async (blockNumber: number) : Promise<void> => {
    logger.log('[INFO] Handling new block.');
    const blockHeader = await web3.eth.getBlock(blockNumber);
    logger.log(`[INFO] Current Block Number:`, currentBlockNumber);

    setCurrentBlockNumber(Number(blockHeader.number));
    setCurrentTimestamp(blockHeader.timestamp);

    if (userWallet.myAddr) {
      const myBalance = new BigNumber(await web3.eth.getBalance(userWallet.myAddr));
      if (!userWallet.myBalance?.isEqualTo(myBalance)) {
        setUserWallet(new UserWallet(userWallet.myAddr, myBalance));
      }
    }

    // epoch change
    logger.log(`[Info] Updating stakingEpochEndBlock at block ${blockHeader.number}`);
    const oldEpoch = stakingEpoch;
    await retrieveGlobalValues();

    logger.log("[INFO] Epoch times | Old", oldEpoch, "Latest:", stakingEpoch, oldEpoch !== stakingEpoch);

    const isNewEpoch = oldEpoch !== stakingEpoch;

    await syncPoolsState(Number(blockHeader.number), isNewEpoch);
  }

  const tx = () : NonPayableTx | undefined => {
    return undefined;
  }

  /**
   * Build transaction options with current gas price from RPC.
   */
  const resolveGasPrice = async (): Promise<string> => {
    try {
      const rpcGasPrice = await getGasPriceSafe();
      const minGas = minimumGasFee ? minimumGasFee : new BigNumber(0);
      const finalGasPrice = BigNumber.max(new BigNumber(rpcGasPrice || 0), minGas).toFixed(0);
      setCachedGasPrice(finalGasPrice);
      return finalGasPrice;
    } catch (e) {
      return cachedGasPrice !== '0' ? cachedGasPrice : '1000000000';
    }
  };

  /**
   * Build send options for a staking write.
   */
  const buildTxOpts = async (method: EstimatableMethod, params: { from: string; value?: string }) => {
    return buildTxOptions(method, { from: params.from, gasPrice: await resolveGasPrice(), value: params.value });
  };

  const retrieveGlobalValues = async () => {
    logger.log("[INFO] Retrieving Global Values")
    const oldStakingEpoch = stakingEpoch;

    const latestBlockNumber = await getLatestBlockNumber();
    
    if (web3.eth.defaultBlock === undefined || web3.eth.defaultBlock === 'latest') {
      setCurrentBlockNumber(latestBlockNumber);
      setLatestBlockNumber(latestBlockNumber);
    } else if ( typeof web3.eth.defaultBlock === 'number' ) {
      setLatestBlockNumber(latestBlockNumber);
      setCurrentBlockNumber(web3.eth.defaultBlock);
      web3.defaultBlock = web3.eth.defaultBlock;
    } else {
      logger.warn('Unexpected defaultBlock: ', web3.eth.defaultBlock);
    }

    const globals = await contractsManager.aggregator?.methods.getGlobals().call({}, latestBlockNumber);

    if (globals) {
      setKeyGenRound(parseInt(globals[2]));
      setStakingEpoch(parseInt(globals[3]));
      setMinimumGasFee(new BigNumber(globals[4]));
      setCandidateMinStake(new BigNumber(globals[5]));
      setDelegatorMinStake(new BigNumber(globals[6]));
      setStakeWithdrawDisallowPeriod(parseInt(globals[11]));

      if (parseInt(globals[3]) !== oldStakingEpoch) {
        setEpochStartBlock(parseInt(globals[8]));
        setEpochStartTime(parseInt(globals[7]));
        setDeltaPot(web3.utils.fromWei(globals[0], 'ether'));
        setReinsertPot(web3.utils.fromWei(globals[1], 'ether'));
        setStakingEpochEndTime(parseInt(globals[10]));
        setCanStakeOrWithdrawNow(true);

        import('@/lib/config').then(({ default: config }) => {
          web3.eth.getBalance(config.daoContractAddress).then((daoPotValue) => {
            setDaoPot(web3.utils.fromWei(daoPotValue, 'ether'));
          });
        });

        if (contractsManager.stContract) {
          const totalStaked = await contractsManager.stContract?.methods.totalStakedAmount().call();
          setTotalDaoStake(BigNumber(totalStaked));
        }
      }
    }

    return latestBlockNumber;
  }
  
  const syncAbandonedPools = async (inactivePoolAddrs: Array<string>): Promise<void> => {
    const { vsContract, stContract } = contractsManager;
    if (!vsContract || !stContract) return;

    try {
      if (!inactivityThreshold) {
        const threshold = await vsContract.methods.validatorInactivityThreshold().call();
        setInactivityThreshold(Number(threshold));
      }

      if (!inactivePoolAddrs.length) {
        setAbandonedPools({});
        return;
      }

      const resolved = await Promise.all(inactivePoolAddrs.map(async (stakingAddress): Promise<AbandonedPool | null> => {
        const isAbandoned = await vsContract.methods.isValidatorAbandoned(stakingAddress).call();
        if (!isAbandoned) return null;

        const miningAddress = await vsContract.methods.miningByStakingAddress(stakingAddress).call();
        const [lastActive, recoverableStake] = await Promise.all([
          vsContract.methods.validatorAvailableSinceLastWrite(miningAddress).call(),
          stContract.methods.stakeAmountTotal(stakingAddress).call(),
        ]);

        return {
          stakingAddress,
          lastActive: Number(lastActive),
          recoverableStake: new BigNumber(recoverableStake),
        };
      }));

      const abandoned: Record<string, AbandonedPool> = {};
      resolved.forEach(entry => {
        if (entry) abandoned[entry.stakingAddress.toLowerCase()] = entry;
      });

      setAbandonedPools(abandoned);
    } catch (err) {
      logger.error("Couldn't resolve abandoned pools:", err);
    }
  }

  const syncPoolsState = async (blockNumber: number, isNewEpoch: boolean) => {    
    let activePoolAddrs: Array<string> = [];
    let inactivePoolAddrs: Array<string> = [];
    let toBeElectedPoolAddrs: Array<string> = [];
    let pendingValidatorAddrs: Array<string> = [];

    const poolsData = await contractsManager.aggregator?.methods.getAllPools().call();

    if (poolsData) {
      activePoolAddrs = poolsData[4]; // stakingAddresses
      inactivePoolAddrs = poolsData[1]; // stakingAddresses
      toBeElectedPoolAddrs = poolsData[2]; // stakingAddresses
      pendingValidatorAddrs = poolsData[6]; // stakingAddresses
    }

    logger.log(`[INFO] Syncing Active(${activePoolAddrs.length}) and Inactive(${inactivePoolAddrs.length}) pools...`);
    const allPools = activePoolAddrs.concat(inactivePoolAddrs).concat(toBeElectedPoolAddrs).concat(pendingValidatorAddrs);

    // check if there is a new pool that is not tracked yet within the context.
    setPools(prevPools => {
      let newPools = [...prevPools];
      allPools.forEach(poolAddress => {
        const findResult = newPools.find(x => x.stakingAddress === poolAddress);
        if (!findResult) {
          const pool = new Pool(poolAddress);
          newPools.push(pool);
        }
      });

      // filter empty pools
      newPools = newPools.filter(pool => pool.stakingAddress);

      updatePools(newPools, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);
      return newPools;
    });

    syncAbandonedPools(inactivePoolAddrs);
  }

  const updatePools = async (
    pools: Pool[],
    activePoolAddrs: Array<string>,
    toBeElectedPoolAddrs: Array<string>,
    pendingValidatorAddrs: Array<string>,
    blockNumber: number
  ) => {
    setIsSyncingPools(true);
    const batchSize = 10;
    const updatedPools: Pool[] = [...pools];
    const poolsToUpdate: Pool[] = [];
    const poolIndicesToUpdate: number[] = [];
    
    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      
      const batchPromises = batch.map((p, index) => {  
        const cachedPool: Pool | undefined = getCachedPools(blockNumber).find((cachedPool) => p.stakingAddress === cachedPool.stakingAddress);
  
        if (cachedPool) {
          // refetching isActive and isCurrentValidator as are cached and not updated
          if (activePoolAddrs.filter((v) => v === cachedPool.miningAddress).length > 0) {
            cachedPool.isActive = true;
          } else {
            cachedPool.isActive = false;
          }
          cachedPool.isActive = activePoolAddrs.indexOf(cachedPool.stakingAddress) >= 0;
          // Update the pool in updatedPools array directly
          updatedPools[i + index] = cachedPool;
        } else {
          poolsToUpdate.push(p);
          poolIndicesToUpdate.push(i + index); // Keep track of the index to update later
        }
      });
      
      await Promise.allSettled(batchPromises);
    }
      
    // Fetch the updated pool data in one call
    if (poolsToUpdate.length > 0) {
      const updatedPoolData = await contractsManager.aggregator?.methods.getPoolsData(poolsToUpdate.map(p => p.stakingAddress)).call();
      if (updatedPoolData) {
        // Process each updated pool data
        await Promise.all(updatedPoolData.map(async (updatedData: any, index: number) => {
          const pool = await updatePool(poolsToUpdate[index], updatedData, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);
          updatedPools[poolIndicesToUpdate[index]] = pool;
        }));
      } 
    }
  
    // Set the updated pools
    setPools([...updatedPools]);
    setCachedPools(blockNumber, updatedPools);
    logger.log("[INFO] Cached Data:", JSON.parse(localStorage.getItem('poolsData') || '{}'));
    await updateStakeAmounts(updatedPools);
    setIsSyncingPools(false);
  }

  const updatePool = async (pool: Pool, updatedPoolData: any, activePoolAddrs: Array<string>, toBeElectedPoolAddrs: Array<string>, pendingValidatorAddrs: Array<string>, blockNumber: number) : Promise<Pool>  => {
    const { stakingAddress } = pool;

    pool.miningAddress = updatedPoolData[0];
    pool.availableSince = new BigNumber(updatedPoolData[1]);
    pool.miningPublicKey = updatedPoolData[2];
    pool.delegators = updatedPoolData[3].map((address: string) => new Delegator(address));
    pool.keyGenMode = new BigNumber(updatedPoolData[4]).toNumber();
    pool.totalStake = new BigNumber(updatedPoolData[5]);

    await getDelegatorsData(pool, updatedPoolData[3].map((address: string) => new Delegator(address)), blockNumber).then((result) => {
      pool.ownStake = result.ownStake;
      pool.delegators = result.delegators;
      pool.candidateStake = result.candidateStake;
    });

    pool.isAvailable = !pool.availableSince.isZero();
    pool.isActive = activePoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isToBeElected = toBeElectedPoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isPendingValidator = pendingValidatorAddrs.indexOf(pool.miningAddress) >= 0;
    pool.isMe = userWallet ? userWallet.myAddr === pool.stakingAddress : false;
    pool.isFaultyValidator = updatedPoolData[6];
    pool.score = updatedPoolData[7];
    pool.connectivityReport = updatedPoolData[8];
    return pool;
  }

  const setCachedPools = (blockNumber: number, pools: Pool[]) => {
    let poolsCache: PoolCache = {};

    const cachedPoolsString = localStorage.getItem('poolsData');
    if (cachedPoolsString) {
      poolsCache = JSON.parse(cachedPoolsString);
    }

    const cachedPools = poolsCache[blockNumber] || [];
    const updatedCachedPools = [...cachedPools];

    // Ensure only the 5 most recent block numbers are kept
    const blockNumbers = Object.keys(poolsCache)
        .map(Number) // Convert keys to numbers
        .sort((a, b) => b - a); // Sort in descending order

    if (blockNumbers.length > 5) {
        const excessBlockNumbers = blockNumbers.slice(4);
        excessBlockNumbers.forEach(blockNum => {
            delete poolsCache[blockNum];
        });
    }

    pools.forEach(pool => {
      const cachedPoolIndex = updatedCachedPools.findIndex(p => p.stakingAddress === pool.stakingAddress);

      if (cachedPoolIndex === -1) {
        updatedCachedPools.push(pool);
      } else {
        updatedCachedPools[cachedPoolIndex] = pool;
      }
    });

    localStorage.setItem('poolsData', JSON.stringify({ ...poolsCache, [blockNumber]: updatedCachedPools }));
    setPools(updatedCachedPools);
  }

  const getCachedPools = (blockNumber: number): Pool[] => {
    let cachedPools: PoolCache = {};

    const cachedPoolsString = localStorage.getItem('poolsData');
    if (cachedPoolsString) {
      cachedPools = JSON.parse(cachedPoolsString);
    }

    return cachedPools[blockNumber] || [];
  }

  const getDelegatorsData = async (pool: Pool, delegators: Delegator[], blockNumber: number) => {
    let ownStake = new BigNumber(0);
    let candidateStake = new BigNumber(0);

    try {
      const delegationData = await contractsManager.aggregator?.methods.getDelegationsData(delegators.map(d => d.address), pool.stakingAddress).call();

      if (delegationData) {
        delegationData[0].map((delegation: any, index: number) => {
          delegators[index].address = delegation[0];
          delegators[index].amount = new BigNumber(delegation[1]);
        });

        ownStake = new BigNumber(delegationData[1]);
        candidateStake = new BigNumber(delegationData[2]);
      }
    } catch (error) {
      logger.error("Couldn't fetch delegation data:", error);
    }

    return {delegators, candidateStake, ownStake};
  }

  const areAddressesValidForCreatePool = async (stakingAddr: string, miningAddr: string): Promise<boolean> => {
    return (
      stakingAddr !== miningAddr
      && await contractsManager.vsContract.methods.miningByStakingAddress(stakingAddr).call() === '0x0000000000000000000000000000000000000000'
      && await contractsManager.vsContract.methods.miningByStakingAddress(miningAddr).call() === '0x0000000000000000000000000000000000000000'
      && await contractsManager.vsContract.methods.stakingByMiningAddress(stakingAddr).call() === '0x0000000000000000000000000000000000000000'
      && await contractsManager.vsContract.methods.stakingByMiningAddress(miningAddr).call() === '0x0000000000000000000000000000000000000000'
    );
  }

  const addOrUpdatePool = async (stakingAddr: string, blockNumber: number) => {
    let pool = pools.find(p => p.stakingAddress === stakingAddr);

    if (!pool) {
      pool = new Pool(stakingAddr);
    }

    let activePoolAddrs: Array<string> = [];
    let toBeElectedPoolAddrs: Array<string> = [];
    let pendingValidatorAddrs: Array<string> = [];

    const poolsData = await contractsManager.aggregator?.methods.getAllPools().call();

    if (poolsData) {
      activePoolAddrs = poolsData[4];
      toBeElectedPoolAddrs = poolsData[2];
      pendingValidatorAddrs = poolsData[6];
    }

    const updatedData = await contractsManager.aggregator?.methods.getPoolsData([pool.stakingAddress]).call();

    if (updatedData && updatedData.length > 0) {
      const updatedPoolData = await updatePool(pool, updatedData[0], activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);

      setPools(prevPools => {
        const updatedPools = [...prevPools]
        const poolIndex = updatedPools.findIndex(p => p.stakingAddress === stakingAddr);
        if (poolIndex !== -1) {
          updatedPools[poolIndex] = updatedPoolData;
        } else {
          updatedPools.push(updatedPoolData);
        }
        updateStakeAmounts(updatedPools);
        return updatedPools;
      });
    }
  }

  const createPool = async (publicKey: string, stakeAmount: BigNumber, nodeOperatorAddress: string, nodeOperatorShare: BigNumber): Promise<boolean> => {
    try {
      if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return false;

      // Pre-validate provider readiness
      const ready = await ensureProviderReady();
      if (!ready) {return false;}

      const stakeAmountWei = web3.utils.toWei(stakeAmount.toString());

      const accBalance = await getUpdatedBalance();
      const ipAddress = '0x00000000000000000000000000000000';
      const minningAddress = getAddressFromPublicKey(publicKey);

      if (!web3.utils.isAddress(minningAddress)) {
        toast.warn("Enter valid minning address");
      } else if (userWallet.myAddr === minningAddress) {
        toast.warn("Pool and mining addresses cannot be the same");
      } else if (!areAddressesValidForCreatePool(userWallet.myAddr, minningAddress)) {
        toast.warn("Staking or mining key are or were already in use with a pool");
      } else if (BigNumber(stakeAmountWei).isGreaterThan(accBalance)) {
        toast.warn(`Insufficient balance (${formatDmdFromWei(accBalance)}) for stake amount ${formatDmd(stakeAmount)}`);
      } else if (BigNumber(stakeAmountWei).isLessThan(BigNumber(candidateMinStake.toString()).dividedBy(10**18))) {
        toast.warn("Insufficient candidate (pool owner) stake");
      } else {
        showLoader(true, "Creating pool 💎");
        const addPool = contractsManager.stContract.methods.addPool(minningAddress, nodeOperatorAddress, nodeOperatorShare.toString(), publicKey, ipAddress);
        const receipt = await addPool.send(await buildTxOpts(addPool, { from: userWallet.myAddr, value: stakeAmountWei }));
        if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
        await addOrUpdatePool(userWallet.myAddr, receipt.blockNumber);
        showLoader(false, "");
        toast.success("Pool created successfully 💎");
        return true;
      }
      return false;
    } catch (err: any) {
      logger.log(err);
      showLoader(false, "");
      handleErrorMsg(err, "Error in creating pool");
      return false;
    }
  }

  const removePool = async (pool: Pool, amount: BigNumber): Promise<boolean> => {
    const amountInWei = web3.utils.toWei(amount.toString());

    if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return false;

    // Pre-validate provider readiness
    const ready = await ensureProviderReady();
    if (!ready) {return false;}

    try {
      showLoader(true, `Removing Pool 💎`);
      const withdraw = contractsManager.stContract.methods.withdraw(pool.stakingAddress, amountInWei.toString());
      const receipt = await withdraw.send(await buildTxOpts(withdraw, { from: userWallet.myAddr }));
      setPools(prevPools => {
        const updatedPools = prevPools.filter(p => p.stakingAddress !== pool.stakingAddress);
        updateStakeAmounts(updatedPools);
        return updatedPools;
      });
      if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
      toast.success(`Pool Removed 💎`);
      showLoader(false, "");
      return true;
    } catch(err: any) {
      showLoader(false, "");
      handleErrorMsg(err, "Error in Removing Pool");
      return false;
    }
  }

  const updatePoolOperatorRewardsShare = async (pool: Pool, nodeOperatorAddress: string, nodeOperatorShare: BigNumber)=> {    
    try {
        // Pre-validate provider readiness
        const ready = await ensureProviderReady();
        if (!ready) {return false;}
        if (!contractsManager.stContract) return false;

        showLoader(true, "Updating pool rewards share 💎");
        const setNodeOperator = contractsManager.stContract.methods.setNodeOperator(nodeOperatorAddress, nodeOperatorShare.toString());
        const receipt = await setNodeOperator.send(await buildTxOpts(setNodeOperator, { from: userWallet.myAddr }));
        if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
        pool.poolOperator = nodeOperatorAddress;
        pool.poolOperatorShare = nodeOperatorShare;
        setPools(prevPools => {
          const updatedPools = [...prevPools]
          const poolIndex = updatedPools.findIndex(p => p.stakingAddress === pool.stakingAddress);
          if (poolIndex !== -1) {
            updatedPools[poolIndex] = pool;
          } else {
            updatedPools.push(pool);
          }
          updateStakeAmounts(updatedPools);
          return updatedPools;
        });
        showLoader(false, "");
        toast.success("Pool reward share updated successfully 💎");
        return true;
    } catch(err: any) {
        showLoader(false, "");
        handleErrorMsg(err, "Error in updating pool operator rewards share");
        return false;
    }
  }

  const getWithdrawableAmounts = async (pool: Pool): Promise<{maxWithdrawAmount: BigNumber, maxWithdrawOrderAmount: BigNumber}> => {
    let maxWithdrawAmount = new BigNumber(0);
    let maxWithdrawOrderAmount = new BigNumber(0);

    if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return { maxWithdrawAmount, maxWithdrawOrderAmount };

    try {
      const withdrawableAmounts = await contractsManager.aggregator?.methods.getWithdrawableAmounts(pool.stakingAddress, userWallet.myAddr).call();
      if (withdrawableAmounts) {
        maxWithdrawAmount = new BigNumber(withdrawableAmounts[0]);
        maxWithdrawOrderAmount = new BigNumber(withdrawableAmounts[1]);
      }
    } catch (error) {
      logger.error("Couldn't fetch withdrawable amounts:", error);
    }

    return { maxWithdrawAmount, maxWithdrawOrderAmount };
  }

  const unstake = async (pool: Pool, amount: BigNumber): Promise<boolean> => {
    const amountInWei = web3.utils.toWei(amount.toString());
    if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return false;

    // Pre-validate provider readiness
    const ready = await ensureProviderReady();
    if (!ready) {return false;}

    // determine available withdraw method and allowed amount
    const { maxWithdrawAmount, maxWithdrawOrderAmount } = await getWithdrawableAmounts(pool);

    try {
      let receipt;
      if (!BigNumber(maxWithdrawAmount).isZero()) {
        if (new BigNumber(amountInWei).isGreaterThan(maxWithdrawAmount)) {
          toast.warn(`Requested withdraw amount exceeds max (${formatDmdFromWei(maxWithdrawAmount)} 💎)`);
          return false;
        }
        showLoader(true, `Unstaking ${formatDmd(amount)} 💎`);
        const withdraw = contractsManager.stContract.methods.withdraw(pool.stakingAddress, amountInWei.toString());
        receipt = await withdraw.send(await buildTxOpts(withdraw, { from: userWallet.myAddr }));
        if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
        toast.success(`Unstaked ${formatDmd(amount)} 💎`);
      } else {
        if (new BigNumber(amountInWei).isGreaterThan(maxWithdrawOrderAmount)) {
          toast.warn(`Requested withdraw order amount exceeds max (${formatDmdFromWei(maxWithdrawOrderAmount)} 💎)`);
          return false;
        } else {
          showLoader(true, `Ordering unstake of ${formatDmd(amount)} 💎`);
          const orderWithdraw = contractsManager.stContract.methods.orderWithdraw(pool.stakingAddress, amountInWei.toString());
          receipt = await orderWithdraw.send(await buildTxOpts(orderWithdraw, { from: userWallet.myAddr }));
          if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
          toast.success(`Ordered withdraw of ${formatDmd(amount)} 💎`);
        }
      }
      showLoader(false, "");
      addOrUpdatePool(pool.stakingAddress, receipt?.blockNumber || currentBlockNumber + 1);
      return true;
    } catch(err: any) {
      showLoader(false, "");
      handleErrorMsg(err, "Error in withdrawing stake");
      return false;
    }
  }

  const stake = async (pool: Pool, stakeAmount: BigNumber): Promise<boolean> => {
    const stakeAmountWei = web3.utils.toWei(stakeAmount.toString());

    if (new BigNumber(stakeAmountWei).isGreaterThan(userWallet.myBalance)) {
      toast.warn(`Insufficient balance ${formatDmdFromWei(userWallet.myBalance)} for selected amount ${formatDmd(stakeAmount)}`);
      return false;
    } else if (!canStakeOrWithdrawNow) {
      toast.warn("Outside staking/withdraw time window");
      return false
    } else if (new BigNumber(pool.myStake).plus(new BigNumber(stakeAmountWei)).isLessThan(delegatorMinStake)) {
      toast.warn(`Min. staking amount is ${formatDmdFromWei(delegatorMinStake)}`);
      return false;
    } else {
      try {
        // Pre-validate provider readiness
        const ready = await ensureProviderReady();
        if (!ready) {return false;}
        if (!contractsManager.stContract) return false;
        showLoader(true, `Staking ${formatDmd(stakeAmount)} 💎`);
        const stakeMethod = contractsManager.stContract.methods.stake(pool.stakingAddress);
        const receipt = await stakeMethod.send(await buildTxOpts(stakeMethod, { from: userWallet.myAddr, value: stakeAmountWei }));
        if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
        await addOrUpdatePool(pool.stakingAddress, receipt.blockNumber);
        toast.success(`Staked ${formatDmd(stakeAmount)} 💎`);
        showLoader(false, "");
        return true;
      } catch (err: any) {
        showLoader(false, "");
        handleErrorMsg(err, "Error in staking");
        return false;
      }
    }
  }

  const claimOrderedUnstake = async (pool: Pool): Promise<boolean> => {
    const claimAmount = pool.orderedWithdrawAmount;

    if (!contractsManager.stContract || !userWallet.myAddr) return false;

    if (!canStakeOrWithdrawNow) {
      toast.warn("Outside staking/withdraw time window");
      return false;
    } else {
      try {
        // Pre-validate provider readiness
        const ready = await ensureProviderReady();
        if (!ready) {return false;}
        showLoader(true, `Claiming ${formatDmdFromWei(claimAmount)} 💎`);
        const claimOrderedWithdraw = contractsManager.stContract.methods.claimOrderedWithdraw(pool.stakingAddress);
        const receipt = await claimOrderedWithdraw.send(await buildTxOpts(claimOrderedWithdraw, { from: userWallet.myAddr }));
        if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
        toast.success(`Claimed ${formatDmdFromWei(claimAmount)} 💎`);
        showLoader(false, "");

        setPools(prevPools => prevPools.map(p =>
          p.stakingAddress === pool.stakingAddress
            ? { ...p, orderedWithdrawAmount: new BigNumber(0), orderedWithdrawUnlockEpoch: new BigNumber(0) } as Pool
            : p
        ));
        addOrUpdatePool(pool.stakingAddress, receipt.blockNumber);

        return true;
      } catch (err: any) {
        showLoader(false, "");
        handleErrorMsg(err, "Error in claiming ordered withdraw");
        return false;
      }
    }
  }

  const recoverAbandonedStakes = async (): Promise<boolean> => {
    const total = Object.values(abandonedPools).reduce(
      (sum, abandoned) => sum.plus(abandoned.recoverableStake),
      new BigNumber(0)
    );

    if (total.isZero()) {
      toast.warn("No abandoned stakes to recover");
      return false;
    }

    if (!contractsManager.stContract || !userWallet.myAddr) return false;

    const ready = await ensureProviderReady();
    if (!ready) return false;

    try {
      showLoader(true, `Transferring ${formatDmdFromWei(total)} 💎 to the pots`);
      const recover = contractsManager.stContract.methods.recoverAbandonedStakes();
      const receipt = await recover.send(await buildTxOpts(recover, { from: userWallet.myAddr }));
      if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
      showLoader(false, "");
      toast.success(`Transferred ${formatDmdFromWei(total)} 💎 to the reinsert and governance pots`);

      await syncPoolsState(receipt.blockNumber, false);
      return true;
    } catch (err: any) {
      showLoader(false, "");
      handleErrorMsg(err, "Error in recovering abandoned stakes");
      return false;
    }
  }

  const fetchPoolScoreHistory = async (pool: Pool): Promise<void> => {
    try {
      await contractsManager.bsContract?.getPastEvents('allEvents', {
        // filter: { miningAddress: pool.miningAddress }, // Filter by indexed parameter
        fromBlock: 0,  // You can specify the block range here
        toBlock: 'latest'
      }).then((events) => {
        logger.log(events);
      }).catch((error) => {
        logger.error(`Error fetching events`, error);
      });
    } catch (error) {
      logger.error('Error fetching events:', error);
    }
  };

  const canUpdatePoolOperatorRewards = async (pool: Pool): Promise<boolean> => {
    const lastUpdateEpoch = await contractsManager.stContract?.methods.poolNodeOperatorLastChangeEpoch(pool.stakingAddress).call();
    return lastUpdateEpoch && Number(lastUpdateEpoch) < stakingEpoch ? true : false;
  }

  const contextValue = {
    // state
    pools,
    myPool,
    deltaPot,
    keyGenRound,
    reinsertPot,
    stakingEpoch,
    myTotalStake,
    totalDaoStake,
    minimumGasFee,
    epochStartTime,
    isSyncingPools,
    stakesSyncedFor,
    epochStartBlock,
    myCandidateStake,
    candidateMinStake,
    delegatorMinStake,
    stakingInitialized,
    abandonedPools,
    inactivityThreshold,
    validCandidates: pools.filter(pool => pool.isAvailable).length,
    activeValidators: pools.filter(pool => pool.isActive).length,

    // methods
    stake,
    unstake,
    setPools,
    createPool,
    removePool,
    addOrUpdatePool,
    claimOrderedUnstake,
    retrieveGlobalValues,
    recoverAbandonedStakes,
    fetchPoolScoreHistory,
    getWithdrawableAmounts,
    canUpdatePoolOperatorRewards,
    initializeStakingDataAdapter,
    updatePoolOperatorRewardsShare
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
