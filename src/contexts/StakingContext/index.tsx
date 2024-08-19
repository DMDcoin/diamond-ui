import React, { ErrorInfo, createContext, useContext, useEffect, useState } from "react";

import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import { PoolCache } from "./types/cache";
import { useWeb3Context } from "../Web3Context";
import { Delegator, Pool } from "./models/model";
import { BlockType, NonPayableTx } from "./types/contracts";
import { ContextProviderProps } from "../Web3Context/types";
import { getAddressFromPublicKey, isValidAddress } from "../../utils/common";
import { useDaoContext } from "../DaoContext";


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
  myPool: Pool | undefined;
  activeValidators: number;
  minimumGasFee: BigNumber;
  totalDaoStake: BigNumber;
  myCandidateStake: BigNumber;
  stakingInitialized: boolean;
  candidateMinStake: BigNumber;
  delegatorMinStake: BigNumber;
  
  initializeStakingDataAdapter: () => {}
  claimOrderedUnstake: (pool: Pool) => Promise<boolean>;
  setPools: React.Dispatch<React.SetStateAction<Pool[]>>;
  stake: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  unstake: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  removePool: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  addOrUpdatePool: (stakingAddr: string, blockNumber: number) => {}
  createPool: (publicKey: string, stakeAmount: BigNumber) => Promise<boolean>;
  getWithdrawableAmounts: (pool: Pool) => Promise<{maxWithdrawAmount: BigNumber, maxWithdrawOrderAmount: BigNumber}>;
}

const StakingContext = createContext<StakingContextProps | undefined>(undefined);

const StakingContextProvider: React.FC<ContextProviderProps> = ({children}) => {

  const {
    web3Initialized,
    contractsManager,
    showLoader,
    setUserWallet,
    getUpdatedBalance,
    userWallet,
    web3,
  } = useWeb3Context();
  
  const [showAllPools, setShowAllPools] = useState<boolean>(false);
  const [isShowHistoric, setIsShowHistoric] = useState<boolean>(false);
  const [showHistoricBlock, setShowHistoricBlock] = useState<number>(0);
  const [handlingNewBlock, setHandlingNewBlock] = useState<boolean>(false);
  const [stakingInitialized, setStakingInitialized] = useState<boolean>(false);
  const [defaultTxOpts, setDefaultTxOpts] = useState<{from: string; gasPrice: string; gasLimit: string; value: string;}>({
    from: '',
    gasPrice: '1000000000',
    gasLimit: '8000000',
    value: '0'
  });

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
  const [currentValidators, setCurrentValidators] = useState<string[]>([]);
  const [currentValidatorsWithoutPools, setCurrentValidatorsWithoutPools] = useState<string[]>([]);
  const [numbersOfValidators, setNumbersOfValidators] = useState<number>(0);
  const [newBlockPolling, setNewBlockPolling] = useState<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (pools.filter(pool => pool.miningAddress).length == pools.length) {
      console.log("[INFO] Updating stake amounts");
      updateStakeAmounts();
    }
  }, [totalDaoStake, userWallet.myAddr]);

  useEffect(() => {
    if (web3Initialized) {
      // localStorage.clear();
      retrieveGlobalValues().then((bn: number) => {
        syncPoolsState(bn, true);
        initializeStakingDataAdapter();
      })
    }
  }, [web3Initialized]);

  const handleErrorMsg = (err: Error, alternateMsg: string) => {
    if (err.message && !err.message.includes("EVM") && (err.message.includes("MetaMask") || err.message.includes("Transaction") || err.message.includes("Invalid"))) {
      toast.error(err.message);
    } else {
      toast.error(alternateMsg);
    }
  }

  const updateStakeAmounts = async (poolsInp?: Pool[]) => {
    const poolsStakingAddresses = poolsInp ? poolsInp.map(p => p.stakingAddress) : pools.map(p => p.stakingAddress);
    const myAddr = userWallet.myAddr || '0x0000000000000000000000000000000000000000';

    let myStakeAmounts: any;
    let orderedWithdraws: any;

    myStakeAmounts = await contractsManager.aggregator?.methods.getUserStakes(myAddr, poolsStakingAddresses).call();

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
        let pool = newPools.filter((p: Pool) => p.stakingAddress === stakingAddress)[0];

        let myStake = myStakeAmounts[index];
        totalStakedByMe = totalStakedByMe.plus(myStake[1] ?? 0);
        setMyTotalStake(totalStakedByMe);
        pool.myStake = new BigNumber(myStake[1] ?? 0);
        pool.totalStake = new BigNumber(myStake[2] ?? 0);
        pool.votingPower = BigNumber(myStake[2] ?? 0).dividedBy(daoStake).multipliedBy(100).decimalPlaces(2);

        if (userWallet.myAddr && pool.stakingAddress != userWallet.myAddr) candidateStake = candidateStake.plus(myStake[1] ?? 0);
        setMyCandidateStake(candidateStake);

        if (orderedWithdraws) {
          let orderedWithdrawAmount = orderedWithdraws[index];
          pool.orderedWithdrawAmount = new BigNumber(orderedWithdrawAmount[1] ?? 0);
          pool.orderedWithdrawUnlockEpoch = new BigNumber(orderedWithdrawAmount[2]).isGreaterThan(0) ? new BigNumber(orderedWithdrawAmount[2]).plus(1) : new BigNumber(0);
        }
      });
      setMyPool(newPools.find((p: Pool) => p.stakingAddress === userWallet.myAddr));
      return newPools;
    });
  }
 
  const initializeStakingDataAdapter = async () => {
    if (stakingInitialized) return;
    updateEventSubscription();
    setStakingInitialized(true);
  }

  const getLatestStakingBlockNumber = async () => {
    let allEvents: any[] = [];
    const eventsBatchSize = 100000;
    const currentBlock = await web3.eth.getBlockNumber();
  
    // Retrieve the last block number from localStorage
    const storedBlockNumber = parseInt(localStorage.getItem('stakingLatestBlockN') || '0', 10);
    const startBlock = isNaN(storedBlockNumber) ? 0 : storedBlockNumber;
  
    const promises: Promise<void>[] = [];
  
    for (let i = startBlock; i < currentBlock; i += eventsBatchSize) {
      const start = i;
      const end = Math.min(i + eventsBatchSize - 1, currentBlock);
  
      if (contractsManager.stContract) {
        const promise = contractsManager.stContract.getPastEvents(
          'allEvents',
          {
            fromBlock: start,
            toBlock: end
          }).then((events) => {
            events.forEach(e => allEvents.push(e));
          }).catch((error) => {
            console.error(`Error fetching events from block ${start} to ${end}:`, error);
          });
  
        promises.push(promise);
      }
    }
  
    await Promise.allSettled(promises);
  
    const latestEvent = allEvents.reduce((maxEvent: any, event: any) => 
      event.blockNumber > maxEvent.blockNumber ? event : maxEvent, allEvents[0]);
  
    const latestBlockNumber = latestEvent?.blockNumber ?? currentBlock;
  
    // Store the latest block number in localStorage
    localStorage.setItem('stakingLatestBlockN', latestBlockNumber.toString());
  
    return latestBlockNumber;
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

      const currentBlock = await getLatestStakingBlockNumber() || await web3.eth.getBlockNumber();
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
    console.log('[INFO] Handling new block.');
    const blockHeader = await web3.eth.getBlock(blockNumber);
    console.log(`[INFO] Current Block Number:`, currentBlockNumber);

    setCurrentBlockNumber(blockHeader.number);
    setCurrentTimestamp(blockHeader.timestamp);

    if (userWallet.myAddr) {
      const myBalance = new BigNumber(await web3.eth.getBalance(userWallet.myAddr));
      userWallet.myBalance = myBalance;
      setUserWallet(userWallet);
    }

    // epoch change
    console.log(`[Info] Updating stakingEpochEndBlock at block ${blockHeader.number}`);
    const oldEpoch = stakingEpoch;
    await retrieveGlobalValues();

    console.log("[INFO] Epoch times | Old", oldEpoch, "Latest:", stakingEpoch, oldEpoch !== stakingEpoch);

    const isNewEpoch = oldEpoch !== stakingEpoch;

    await syncPoolsState(blockHeader.number, isNewEpoch);
  }

  const tx = () : NonPayableTx | undefined => {
    return undefined;
  }

  const retrieveGlobalValues = async () => {
    console.log("[INFO] Retrieving Global Values")
    const oldStakingEpoch = stakingEpoch;

    const latestBlockNumber = await getLatestStakingBlockNumber() || await web3.eth.getBlockNumber();

    if (web3.eth.defaultBlock === undefined || web3.eth.defaultBlock === 'latest') {
      setCurrentBlockNumber(latestBlockNumber);
      setLatestBlockNumber(latestBlockNumber);
    } else if ( typeof web3.eth.defaultBlock === 'number' ) {
      setLatestBlockNumber(latestBlockNumber);
      setCurrentBlockNumber(web3.eth.defaultBlock);
      web3.defaultBlock = web3.eth.defaultBlock;
    } else {
      console.warn('Unexpected defaultBlock: ', web3.eth.defaultBlock);
    }

    const globals = await contractsManager.aggregator?.methods.getGlobals().call({}, latestBlockNumber);

    if (globals) {
      setKeyGenRound(parseInt(globals[2]));
      setStakingEpoch(parseInt(globals[3]));
      setMinimumGasFee(new BigNumber(globals[4]));
      setCandidateMinStake(new BigNumber(globals[5]));
      setDelegatorMinStake(new BigNumber(globals[6]));
      setStakeWithdrawDisallowPeriod(parseInt(globals[12]));

      if (parseInt(globals[3]) !== oldStakingEpoch) {
        setEpochStartBlock(parseInt(globals[8]));
        setEpochStartTime(parseInt(globals[7]));
        setDeltaPot(web3.utils.fromWei(globals[0], 'ether'));
        setReinsertPot(web3.utils.fromWei(globals[1], 'ether'));
        setStakingEpochEndTime(parseInt(globals[10]));
        setCanStakeOrWithdrawNow(globals[9]);

        web3.eth.getBalance(process.env.REACT_APP_DAO_CONTRACT_ADDRESS || '0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0').then((daoPotValue) => {
          setDaoPot(web3.utils.fromWei(daoPotValue, 'ether'));
        })

        contractsManager.stContract && setTotalDaoStake(BigNumber(await contractsManager.stContract?.methods.totalStakedAmount().call()));
      }
    }

    return latestBlockNumber;
  }
  
  const syncPoolsState = async (blockNumber: number, isNewEpoch: boolean) => {    
    let activePoolAddrs: Array<string> = [];
    let inactivePoolAddrs: Array<string> = [];
    let newCurrentValidators: Array<string> = [];
    let toBeElectedPoolAddrs: Array<string> = [];
    let pendingValidatorAddrs: Array<string> = [];

    const poolsData = await contractsManager.aggregator?.methods.getAllPools().call({}, blockNumber);

    if (poolsData) {
      activePoolAddrs = poolsData[0];
      newCurrentValidators = poolsData[1];
      inactivePoolAddrs = poolsData[2];
      toBeElectedPoolAddrs = poolsData[3];
      pendingValidatorAddrs = poolsData[4];
    }

    const validatorWithoutPool: Array<string> = [...newCurrentValidators];

    if (currentValidators.toString() !== newCurrentValidators.toString()) {
      setCurrentValidators(newCurrentValidators);
    }

    console.log(`[INFO] Syncing Active(${activePoolAddrs.length}) and Inactive(${inactivePoolAddrs.length}) pools...`);
    const allPools = activePoolAddrs.concat(inactivePoolAddrs);

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

      updatePools(newPools, validatorWithoutPool, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);
      return newPools;
    });
  }

  const updatePools = async (
    pools: Pool[],
    validatorWithoutPool: Array<string>,
    activePoolAddrs: Array<string>,
    toBeElectedPoolAddrs: Array<string>,
    pendingValidatorAddrs: Array<string>,
    blockNumber: number
  ) => {
    setIsSyncingPools(true);
    const batchSize = 10;
    let updatedPools: Pool[] = [...pools];
    let poolsToUpdate: Pool[] = [];
    let poolIndicesToUpdate: number[] = [];
    
    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      
      const batchPromises = batch.map((p, index) => {
        const ixValidatorWithoutPool = validatorWithoutPool.indexOf(p.miningAddress);
        if (ixValidatorWithoutPool !== -1) {
          validatorWithoutPool.splice(ixValidatorWithoutPool, 1);
        }
  
        const cachedPool: Pool | undefined = getCachedPools(blockNumber).find((cachedPool) => p.stakingAddress === cachedPool.stakingAddress);
  
        if (cachedPool) {
          // refetching isActive and isCurrentValidator as are cached and not updated
          if (validatorWithoutPool.filter((v) => v === cachedPool.miningAddress).length > 0) {
            cachedPool.isCurrentValidator = true;
          } else {
            cachedPool.isCurrentValidator = false;
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
          let pool = await updatePool(poolsToUpdate[index], updatedData, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);
          updatedPools[poolIndicesToUpdate[index]] = pool;
        }));
      } 
    }
  
    // Set the updated pools
    setPools([...updatedPools]);
    updateStakeAmounts(updatedPools);
    setCachedPools(blockNumber, updatedPools);
    console.log("[INFO] Cached Data:", JSON.parse(localStorage.getItem('poolsData') || '{}'));
    setIsSyncingPools(false);
  }

  const updatePool = async (pool: Pool, updatedPoolData: any, activePoolAddrs: Array<string>, toBeElectedPoolAddrs: Array<string>, pendingValidatorAddrs: Array<string>, blockNumber: number) : Promise<Pool>  => {
    const { stakingAddress } = pool;

    pool.miningAddress = updatedPoolData[0];
    pool.banCount = parseInt(updatedPoolData[1]);
    pool.bannedUntil = new BigNumber(updatedPoolData[2]);
    pool.availableSince = new BigNumber(updatedPoolData[3]);
    pool.miningPublicKey = updatedPoolData[4];
    pool.delegators = updatedPoolData[5].map((address: string) => new Delegator(address));
    pool.keyGenMode = new BigNumber(updatedPoolData[6]).toNumber();
    pool.totalStake = new BigNumber(updatedPoolData[7]);

    await getDelegatorsData(pool, updatedPoolData[5].map((address: string) => new Delegator(address)), blockNumber).then((result) => {
      pool.ownStake = result.ownStake;
      pool.delegators = result.delegators;
      pool.candidateStake = result.candidateStake;
    });
    
    pool.isAvailable = !pool.availableSince.isZero();
    pool.isActive = activePoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isToBeElected = toBeElectedPoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isPendingValidator = pendingValidatorAddrs.indexOf(pool.miningAddress) >= 0;
    pool.isMe = userWallet ? userWallet.myAddr === pool.stakingAddress : false;

    setCurrentValidators(
      prevState => {
        pool.isCurrentValidator = prevState.indexOf(pool.miningAddress) >= 0;    
        return prevState;
      }
    );

    if (!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && BigNumber(pool.myStake).isGreaterThan(0)) {
      pool.score = 0;
    } else {
      pool.score = 1000;
    }

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
      const delegationData = await contractsManager.aggregator?.methods.getDelegationsData(delegators.map(d => d.address), pool.stakingAddress).call(tx(), blockNumber);

      if (delegationData) {
        delegationData[0].map((delegation: any, index: number) => {
          delegators[index].address = delegation[0];
          delegators[index].amount = new BigNumber(delegation[1]);
        });

        ownStake = new BigNumber(delegationData[1]);
        candidateStake = new BigNumber(delegationData[2]);
      }
    } catch (error) {
      console.error("Couldn't fetch delegation data:", error);
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

    const poolsData = await contractsManager.aggregator?.methods.getAllPools().call({}, blockNumber);

    if (poolsData) {
      activePoolAddrs = poolsData[0];
      toBeElectedPoolAddrs = poolsData[3];
      pendingValidatorAddrs = poolsData[4];
    }

    const updatedData = await contractsManager.aggregator?.methods.getPoolsData([pool.stakingAddress]).call(tx(), blockNumber);

    if (updatedData && updatedData.length > 0) {
      const updatedPoolData = await updatePool(pool, updatedData[0], activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);

      setPools(prevPools => {
        let updatedPools = [...prevPools]
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

  const createPool = async (publicKey: string, stakeAmount: BigNumber): Promise<boolean> => {
    try {
      if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return false;

      let txOpts = { ...defaultTxOpts, from: userWallet.myAddr, value: web3.utils.toWei(stakeAmount.toString()) };

      const accBalance = await getUpdatedBalance();
      const ipAddress = '0x00000000000000000000000000000000';
      const minningAddress = getAddressFromPublicKey(publicKey);
      const canStakeOrWithdrawNow = await contractsManager.stContract?.methods.areStakeAndWithdrawAllowed().call();

      if (!web3.utils.isAddress(minningAddress)) {
        toast.warn("Enter valid minning address");
      } else if (userWallet.myAddr === minningAddress) {
        toast.warn("Pool and mining addresses cannot be the same");
      } else if (!areAddressesValidForCreatePool(userWallet.myAddr, minningAddress)) {
        toast.warn("Staking or mining key are or were already in use with a pool");
      } else if (BigNumber(txOpts.value).isGreaterThan(accBalance)) {
        toast.warn(`Insufficient balance (${BigNumber(accBalance).dividedBy(10**18).toFixed(2)} DMD) for stake amount ${stakeAmount} DMD`);
      } else if (!canStakeOrWithdrawNow) {
        toast.warn("Outside staking window");
      } else if (BigNumber(txOpts.value).isLessThan(BigNumber(candidateMinStake.toString()).dividedBy(10**18))) {
        toast.warn("Insufficient candidate (pool owner) stake");
      } else {
        showLoader(true, "Creating pool 💎");
        const receipt = await contractsManager.stContract.methods.addPool(minningAddress, publicKey, ipAddress).send(txOpts);
        if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
        await addOrUpdatePool(userWallet.myAddr, receipt.blockNumber);
        showLoader(false, "");
        toast.success("Pool created successfully 💎");
        return true;
      }
      return false;
    } catch (err: any) {
      showLoader(false, "");
      handleErrorMsg(err, "Error in creating pool");
      return false;
    }
  }

  const removePool = async (pool: Pool, amount: BigNumber): Promise<boolean> => {
    const amountInWei = web3.utils.toWei(amount.toString());
    let txOpts = { ...defaultTxOpts, from: userWallet.myAddr };
    const canStakeOrWithdrawNow = await contractsManager.stContract?.methods.areStakeAndWithdrawAllowed().call();

    if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return false;

    if (!canStakeOrWithdrawNow) {
      toast.warning('Outside staking/withdraw window');
      return false;
    } else {
      try {
        let receipt;
        showLoader(true, `Removing Pool 💎`);
        receipt = await contractsManager.stContract.methods.withdraw(pool.stakingAddress, amountInWei.toString()).send(txOpts);
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
  }

  const getWithdrawableAmounts = async (pool: Pool): Promise<{maxWithdrawAmount: BigNumber, maxWithdrawOrderAmount: BigNumber}> => {
    let maxWithdrawAmount = new BigNumber(0);
    let maxWithdrawOrderAmount = new BigNumber(0);

    if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return { maxWithdrawAmount, maxWithdrawOrderAmount };

    try {
      maxWithdrawAmount = new BigNumber(await contractsManager.stContract.methods.maxWithdrawAllowed(pool.stakingAddress, userWallet.myAddr).call());
      maxWithdrawOrderAmount = new BigNumber(await contractsManager.stContract.methods.maxWithdrawOrderAllowed(pool.stakingAddress, userWallet.myAddr).call());
    } catch (error) {
      console.error("Couldn't fetch withdrawable amounts:", error);
    }

    return { maxWithdrawAmount, maxWithdrawOrderAmount };
  }

  const unstake = async (pool: Pool, amount: BigNumber): Promise<boolean> => {
    const amountInWei = web3.utils.toWei(amount.toString());
    let txOpts = { ...defaultTxOpts, from: userWallet.myAddr };
    const canStakeOrWithdrawNow = await contractsManager.stContract?.methods.areStakeAndWithdrawAllowed().call();

    if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return false;

    // determine available withdraw method and allowed amount
    const newStakeAmount = BigNumber(pool.myStake).minus(amountInWei);
    const { maxWithdrawAmount, maxWithdrawOrderAmount } = await getWithdrawableAmounts(pool);

    if (!canStakeOrWithdrawNow) {
      toast.warning('Outside staking/withdraw window');
      return false;
    } else {
      try {
        let receipt;
        if (!BigNumber(maxWithdrawAmount).isZero()) {
          if (new BigNumber(amountInWei).isGreaterThan(maxWithdrawAmount)) {
            toast.warn(`Requested withdraw amount exceeds max (${BigNumber(maxWithdrawAmount).dividedBy(10**18).toFixed(0)} DMD 💎)`);
            return false;
          }
          showLoader(true, `Unstaking ${amount} DMD 💎`);
          receipt = await contractsManager.stContract.methods.withdraw(pool.stakingAddress, amountInWei.toString()).send(txOpts);
          if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
          toast.success(`Unstaked ${amount} DMD 💎`);
        } else {
          if (new BigNumber(amountInWei).isGreaterThan(maxWithdrawOrderAmount)) {
            toast.warn(`Requested withdraw order amount exceeds max (${BigNumber(maxWithdrawOrderAmount).dividedBy(10**18).toFixed(0)} DMD 💎)`);
            return false;
          } else if (newStakeAmount.isLessThan(delegatorMinStake)) {
            toast.warn(`New stake amount must be greater than the min. stake ${delegatorMinStake.dividedBy(10**18)} DMD 💎`);
            return false;
          } else {
            showLoader(true, `Ordering unstake of ${amount} DMD 💎`);
            receipt = await contractsManager.stContract.methods.orderWithdraw(pool.stakingAddress, amountInWei.toString()).send(txOpts);
            if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
            toast.success(`Ordered withdraw of ${amount} DMD 💎`);
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
  }

  const stake = async (pool: Pool, stakeAmount: BigNumber): Promise<boolean> => {
    const stakeAmountWei = web3.utils.toWei(stakeAmount.toString());
    let txOpts = { ...defaultTxOpts, from: userWallet.myAddr, value: stakeAmountWei };

    if (new BigNumber(stakeAmountWei).isGreaterThan(userWallet.myBalance)) {
      toast.warn(`Insufficient balance ${BigNumber(userWallet.myBalance).dividedBy(10**18)} for selected amount ${BigNumber(stakeAmount).dividedBy(10**18).toFixed(2)}`);
      return false;
    } else if (!canStakeOrWithdrawNow) {
      toast.warn("Outside staking/withdraw time window");
      return false
    } else if (new BigNumber(pool.myStake).plus(new BigNumber(stakeAmountWei)).isLessThan(delegatorMinStake)) {
      toast.warn(`Min. staking amount is ${delegatorMinStake.dividedBy(10**18)}`);
      return false;
    } else if (BigNumber(pool.bannedUntil).isGreaterThan(BigNumber(new Date().getTime() / 1000))) {
      toast.warn("Cannot stake on a pool which is currently banned");
      return false;
    } else {
      try {
        showLoader(true, `Staking ${stakeAmount} DMD 💎`);
        const receipt = await contractsManager.stContract?.methods.stake(pool.stakingAddress).send(txOpts);
        if (!showHistoricBlock && receipt) setCurrentBlockNumber(receipt.blockNumber);
        toast.success(`Staked ${stakeAmount} DMD 💎`);
        showLoader(false, "");
        addOrUpdatePool(pool.stakingAddress, receipt?.blockNumber || currentBlockNumber + 1);
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
    let txOpts = { ...defaultTxOpts, from: userWallet.myAddr };

    if (!contractsManager.stContract || !userWallet.myAddr) return false;

    if (!canStakeOrWithdrawNow) {
      toast.warn("Outside staking/withdraw time window");
      return false;
    } else {
      try {
        showLoader(true, `Claiming ${claimAmount.dividedBy(10**18)} DMD 💎`);
        const receipt = await contractsManager.stContract.methods.claimOrderedWithdraw(pool.stakingAddress).send(txOpts);
        if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
        toast.success(`Claimed ${claimAmount.dividedBy(10**18)} DMD 💎`);
        showLoader(false, "");

        setPools(prevPools => {
          prevPools.forEach(p => {
            if (p.stakingAddress === pool.stakingAddress) {
              p.orderedWithdrawAmount = new BigNumber(0);
              p.orderedWithdrawUnlockEpoch = new BigNumber(0);
            }
          });
          return prevPools;
        })

        return true;
      } catch (err: any) {
        showLoader(false, "");
        handleErrorMsg(err, "Error in claiming ordered withdraw");
        return false;
      }
    }
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
    epochStartBlock,
    myCandidateStake,
    candidateMinStake,
    delegatorMinStake,
    stakingInitialized,
    validCandidates: pools.filter(pool => pool.isAvailable).length,
    activeValidators: pools.filter(pool => pool.isCurrentValidator).length,

    // methods
    stake,
    unstake,
    setPools,
    createPool,
    removePool,
    addOrUpdatePool,
    claimOrderedUnstake,
    getWithdrawableAmounts,
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
