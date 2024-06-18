import React, { ErrorInfo, createContext, useContext, useEffect, useState } from "react";

import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import { PoolCache } from "./types/cache";
import { useWeb3Context } from "../Web3Context";
import { Delegator, Pool } from "./models/model";
import { BlockType, NonPayableTx } from "./types/contracts";
import { ContextProviderProps } from "../Web3Context/types";
import { getAddressFromPublicKey } from "../../utils/common";
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
  activeValidators: number;
  minimumGasFee: BigNumber;
  stakingInitialized: boolean;
  candidateMinStake: BigNumber;
  delegatorMinStake: BigNumber;
  
  initializeStakingDataAdapter: () => {}
  claimOrderedUnstake: (pool: Pool) => Promise<boolean>;
  setPools: React.Dispatch<React.SetStateAction<Pool[]>>;
  stake: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  unstake: (pool: Pool, amount: BigNumber) => Promise<boolean>;
  addOrUpdatePool: (stakingAddr: string, blockNumber: number) => {}
  createPool: (publicKey: string, stakeAmount: BigNumber) => Promise<boolean>;
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

  const [pools, setPools] = useState<Pool[]>(Array.from({ length: 10 }, () => (new Pool(""))));
  const [stakingEpoch, setStakingEpoch] = useState<number>(0);
  const [keyGenRound, setKeyGenRound] = useState<number>(0);
  const [myTotalStake, setMyTotalStake] = useState<BigNumber>(new BigNumber(0));
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
    console.log("[INFO] Updating stake amounts");

    setPools(prevPools => {
      let totalStake = BigNumber(0);

      prevPools.forEach(pool => {
        pool.stakingAddress && getMyStakeAndOrderedWithdraw(pool.stakingAddress).then((result) => {
          totalStake = totalStake.plus(result.myStake);
          setMyTotalStake(totalStake);
          pool.myStake = result.myStake;
          pool.orderedWithdrawAmount = result.claimableAmount;
          pool.orderedWithdrawUnlockEpoch = result.unlockEpoch;
        });
      });
      
      return prevPools;
    });

    updatePoolsVotingPower(totalDaoStake);
  }, [totalDaoStake, userWallet, pools]);

  useEffect(() => {
    if (web3Initialized) {
      showLoader(true, "");
      retrieveGlobalValues().then((bn: number) => {
        syncPoolsState(bn, true);
        initializeStakingDataAdapter();
        showLoader(false, "");
      })
    }
  }, [web3Initialized]);

  const updatePoolsVotingPower = async (totalDaoStake: BigNumber) => {
    if (contractsManager.stContract) {
      setPools(prevPools => {
        prevPools.forEach(pool => {
          pool.votingPower = BigNumber(pool.totalStake).dividedBy(totalDaoStake).multipliedBy(100).decimalPlaces(2);
        });
        return prevPools;
      });
    }
  }
 
  const initializeStakingDataAdapter = async () => {
    if (stakingInitialized) return;
    updateEventSubscription();
    setStakingInitialized(true);
  }

  const getLatestStakingBlockNumber = async () => {
    if (contractsManager.stContract) {
      const events = await contractsManager.stContract.getPastEvents(
        'allEvents',
        {
          fromBlock: 0,
          toBlock: 'latest'
        });
      const latestEvent = events[events.length - 1];
      return latestEvent.blockNumber;
    }
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
      
    }, 300000)); // 10 seconds
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

  const getMyStakeAndOrderedWithdraw = async (stakingAddress: string, blockNumber?: number): Promise<{myStake: BigNumber, claimableAmount: BigNumber, unlockEpoch: BigNumber}> => {
    if (!web3 || !userWallet || !contractsManager.stContract || !userWallet.myAddr) return { myStake: new BigNumber('0'), unlockEpoch: new BigNumber(0), claimableAmount: new BigNumber(0) };
    
    let unlockEpoch = new BigNumber(0);
    const stakeAmount = await contractsManager.stContract.methods.stakeAmount(stakingAddress, userWallet.myAddr).call(tx(), blockNumber || block());
    const claimableAmount = new BigNumber(await contractsManager.stContract.methods.orderedWithdrawAmount(stakingAddress, userWallet.myAddr).call());

    if (claimableAmount.isGreaterThan(0)) {
      unlockEpoch = BigNumber(await contractsManager.stContract.methods.orderWithdrawEpoch(stakingAddress, userWallet.myAddr).call()).plus(1);
    }
    
    return { myStake: new BigNumber(stakeAmount), unlockEpoch, claimableAmount: claimableAmount };
  }

  const getBannedUntil = async (miningAddress: string): Promise<any> => {
    return new BigNumber((await contractsManager.vsContract.methods.bannedUntil(miningAddress).call(tx(), block())));
  }

  const getBanCount = async (miningAddress: string): Promise<number> => {
    return parseInt(await contractsManager.vsContract.methods.banCounter(miningAddress).call(tx(), block()));
  }

  const getAvailableSince = async (miningAddress: string, blockNumber: number): Promise<any> => {
    const rawResult = await contractsManager.vsContract.methods.validatorAvailableSince(miningAddress).call(tx(), blockNumber);
    return new BigNumber(rawResult);
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

    let updatedStakingEpoch;
    const promises: Promise<any>[] = [];

    if (contractsManager.stContract) {
      setCandidateMinStake(new BigNumber(await contractsManager.stContract.methods.candidateMinStake().call(tx(), latestBlockNumber)));
      setDelegatorMinStake(new BigNumber(await contractsManager.stContract.methods.delegatorMinStake().call(tx(), latestBlockNumber)));
      updatedStakingEpoch = parseInt(await contractsManager.stContract.methods.stakingEpoch().call(tx(), latestBlockNumber));
      setStakingEpoch(updatedStakingEpoch);
      setTotalDaoStake(new BigNumber(await web3.eth.getBalance(contractsManager.stContract.options.address)));
    }
    setMinimumGasFee(new BigNumber(await contractsManager.contracts.getContractPermission().methods.minimumGasPrice().call(tx(), latestBlockNumber)));

    // those values are asumed to be not changeable.
    setEpochDuration(parseInt(await (await contractsManager.contracts.getStakingHbbft()).methods.stakingFixedEpochDuration().call(tx(), latestBlockNumber)));
    setStakeWithdrawDisallowPeriod(parseInt(await (await contractsManager.contracts.getStakingHbbft()).methods.stakingWithdrawDisallowPeriod().call(tx(), latestBlockNumber)));

    promises.push(
      contractsManager.contracts.getCurrentKeyGenRound(latestBlockNumber).then((result) => {
        setKeyGenRound(result);
      }),
    );

    if (updatedStakingEpoch !== oldStakingEpoch && contractsManager.stContract && contractsManager.brContract) {
      promises.push(
        contractsManager.stContract.methods.stakingEpochStartBlock().call(tx(), latestBlockNumber).then((result) => {
          setEpochStartBlock(parseInt(result));
        }),
        contractsManager.stContract.methods.stakingEpochStartTime().call(tx(), latestBlockNumber).then((result) => {
          setEpochStartTime(parseInt(result));
        }),
        contractsManager.brContract.methods.deltaPot().call(tx(), latestBlockNumber).then((result) => {
          setDeltaPot(web3.utils.fromWei(result, 'ether'));
        }),
        contractsManager.brContract.methods.reinsertPot().call(tx(), latestBlockNumber).then((result) => {
          setReinsertPot(web3.utils.fromWei(result, 'ether'));
        }),
        contractsManager.stContract.methods.stakingFixedEpochEndTime().call(tx(), latestBlockNumber).then((result) => {
          setStakingEpochEndTime(parseInt(result));
        }),
        contractsManager.stContract.methods.areStakeAndWithdrawAllowed().call(tx(), latestBlockNumber).then((result) => {
          setCanStakeOrWithdrawNow(result);
        }),  
        web3.eth.getBalance(process.env.REACT_APP_DAO_CONTRACT_ADDRESS || '0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0').then((daoPotValue) => {
          setDaoPot(web3.utils.fromWei(daoPotValue, 'ether'));
        })
      );
    }

    return latestBlockNumber;
  }
  
  const syncPoolsState = async (blockNumber: number, isNewEpoch: boolean) => {
    const newCurrentValidators = await contractsManager.vsContract.methods.getValidators().call(tx(), blockNumber);
    const validatorWithoutPool: Array<string> = [...newCurrentValidators];

    if (currentValidators.toString() !== newCurrentValidators.toString()) {
      setCurrentValidators(newCurrentValidators);
    }
    
    let activePoolAddrs: Array<string> = [];
    let inactivePoolAddrs: Array<string> = [];
    let toBeElectedPoolAddrs: Array<string> = [];
    let pendingValidatorAddrs: Array<string> = [];

    if (contractsManager.stContract) {
      await Promise.allSettled([
        contractsManager.stContract.methods.getPools().call(tx(), blockNumber).then((result) => {
          activePoolAddrs = result;
        }),
        contractsManager.stContract.methods.getPoolsInactive().call(tx(), blockNumber).then((result) => {
          inactivePoolAddrs = result;
        }),
        contractsManager.stContract.methods.getPoolsToBeElected().call(tx(), blockNumber).then((result) => {
          toBeElectedPoolAddrs = result;
        }),
        contractsManager.vsContract.methods.getPendingValidators().call(tx(), blockNumber).then((result) => {
          pendingValidatorAddrs = result;
        }),
      ])
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
    // update pools in batches of 10 for less rpc calls at once
    const batchSize = 10;
    let updatedPools: Pool[] = [...pools];

    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      
      const batchPromises = batch.map((p) => {
        const ixValidatorWithoutPool = validatorWithoutPool.indexOf(p.miningAddress);
        if (ixValidatorWithoutPool !== -1) {
          validatorWithoutPool.splice(ixValidatorWithoutPool, 1);
        }
        p.votingPower = BigNumber(p.totalStake).dividedBy(totalDaoStake).multipliedBy(100);

        const cachedPool: Pool | undefined = getCachedPools(blockNumber).find((cachedPool) =>  p.stakingAddress == cachedPool.stakingAddress );

        return cachedPool || updatePool(p, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);
      });

      await Promise.allSettled(batchPromises).then((batchResults) => {
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const pIndex = updatedPools.findIndex(p => p.stakingAddress === result.value.stakingAddress);
            if (pIndex !== -1) {
              updatedPools[pIndex] = result.value;
            } else {  
              updatedPools.push(result.value);
            }
          }
        });

        setPools([...updatedPools]);
      });
    }
    
    setCachedPools(blockNumber, updatedPools);
    console.log("[INFO] Cached Data:", JSON.parse(localStorage.getItem('poolsData') || '{}'));
  }

  const updatePool = async (pool: Pool, activePoolAddrs: Array<string>, toBeElectedPoolAddrs: Array<string>, pendingValidatorAddrs: Array<string>, blockNumber: number) : Promise<Pool>  => {
    const { stakingAddress } = pool;

    pool.miningAddress = await contractsManager.vsContract.methods.miningByStakingAddress(stakingAddress).call(tx(), blockNumber);
    await Promise.allSettled([
      contractsManager.vsContract.methods.getPublicKey(pool.miningAddress).call(tx(), blockNumber).then((result) => {
        pool.miningPublicKey = result;
      }),
      getAvailableSince(pool.miningAddress, blockNumber).then((result) => {
        pool.availableSince = result;
      })
    ]);

    if (contractsManager.stContract) {
      await Promise.allSettled([
        contractsManager.stContract.methods.poolDelegators(stakingAddress).call(tx(), blockNumber).then((result) => {
          getDelegatorsData(stakingAddress, result.map(address => new Delegator(address)), blockNumber).then((result) => {
            pool.delegators = result.delegators;
            pool.candidateStake = result.candidateStake;
          });
        }),
        contractsManager.stContract.methods.stakeAmountTotal(stakingAddress).call(tx(), blockNumber).then((result) => {
          pool.totalStake = new BigNumber(result);
        }),
        getBanCount(pool.miningAddress).then((result) => {
          pool.banCount = result;
        }),
        getBannedUntil(pool.miningAddress).then((result) => {
          pool.bannedUntil = new BigNumber(result);
        }),
        contractsManager.contracts.getPendingValidatorState(pool.miningAddress, blockNumber).then((result) => {
          pool.keyGenMode = result;
        }),
      ])
    }
    
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

    // remove pool if required
    if (!showAllPools) {
      if(!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && !BigNumber(pool.myStake).isGreaterThan(0)) {
        for (let i = 0; i < pools.length; i++) {
          if (pools[i].stakingAddress === pool.stakingAddress) {
            pools.splice(i, 1);
            break;
          }
        }
      } else {
        if (!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && BigNumber(pool.myStake).isGreaterThan(0)) {
          pool.score = 0;
        } else {
          pool.score = 1000;
        }
      }
    }

    if (pool.isPendingValidator && contractsManager.kghContract) {
      pool.parts = await contractsManager.kghContract.methods.parts(pool.miningAddress).call(tx(), blockNumber);
      const acksLengthBN = new BigNumber(await contractsManager.kghContract.methods.getAcksLength(pool.miningAddress).call(tx(), blockNumber));
      pool.numberOfAcks = acksLengthBN.toNumber();
    } else {
      pool.parts = '';
      pool.numberOfAcks = 0;
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

  const getDelegatorsData = async (poolAddress: string, delegators: Delegator[], blockNumber: number) => {
    let candidateStake = new BigNumber(0);

    await Promise.allSettled(
      delegators.map(async (delegator: Delegator) => {
        try {
          const delegatedAmount = await contractsManager.stContract?.methods.stakeAmount(poolAddress, delegator.address).call(tx(), blockNumber);
          if (delegatedAmount && poolAddress != delegator.address) {
            delegator.amount = new BigNumber(delegatedAmount);
            candidateStake = candidateStake.plus(delegatedAmount);
          }
        } catch (error) {
          console.error(`Failed to fetch data for delegator ${delegator.address}:`, error);
        }
      })
    );

    return {delegators, candidateStake};
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

    if (contractsManager.stContract) {
      await Promise.allSettled([
        contractsManager.stContract.methods.getPools().call(tx(), blockNumber).then((result) => {
          activePoolAddrs = result;
        }),
        contractsManager.stContract.methods.getPoolsToBeElected().call(tx(), blockNumber).then((result) => {
          toBeElectedPoolAddrs = result;
        }),
        contractsManager.vsContract.methods.getPendingValidators().call(tx(), blockNumber).then((result) => {
          pendingValidatorAddrs = result;
        }),
      ])
    }

    const updatedPoolData = await updatePool(pool, activePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs, blockNumber);

    setPools(prevPools => {
      let exists = false;
      let updatedPools = prevPools.map(p => {
        if (p.stakingAddress === stakingAddr) {
          exists = true;
          return updatedPoolData;
        }
        return p;
      });
      if (!exists) updatedPools.push(updatedPoolData);
      return updatedPools as Pool[];
    });
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
    } catch (error: any) {
      showLoader(false, "");
      toast.error(error.message || "Error in creating pool");
      return false;
    }
  }

  const unstake = async (pool: Pool, amount: BigNumber): Promise<boolean> => {
    const amountInWei = web3.utils.toWei(amount.toString());
    let txOpts = { ...defaultTxOpts, from: userWallet.myAddr };
    const canStakeOrWithdrawNow = await contractsManager.stContract?.methods.areStakeAndWithdrawAllowed().call();

    if (!contractsManager.stContract || !userWallet || !userWallet.myAddr) return false;

    // determine available withdraw method and allowed amount
    const newStakeAmount = BigNumber(pool.myStake).minus(amountInWei);
    const maxWithdrawAmount = await contractsManager.stContract?.methods.maxWithdrawAllowed(pool.stakingAddress, userWallet.myAddr).call();
    const maxWithdrawOrderAmount = await contractsManager.stContract?.methods.maxWithdrawOrderAllowed(pool.stakingAddress, userWallet.myAddr).call();  

    if (!canStakeOrWithdrawNow) {
      toast.warning('Outside staking/withdraw window');
      return false;
    } else {
      try {
        let receipt;
        if (maxWithdrawAmount !== '0') {
          if (new BigNumber(amountInWei).isGreaterThan(maxWithdrawAmount)) {
            toast.warn('Requested withdraw amount exceeds max');
            return false;
          }
          showLoader(true, `Unstaking ${amount} DMD 💎`);
          receipt = await contractsManager.stContract.methods.withdraw(pool.stakingAddress, amountInWei.toString()).send(txOpts);
          if (!showHistoricBlock) setCurrentBlockNumber(receipt.blockNumber);
          toast.success(`Unstaked ${amount} DMD 💎`);
        } else {
          if (new BigNumber(amountInWei).isGreaterThan(maxWithdrawOrderAmount)) {
            toast.warn('Requested withdraw order amount exceeds max');
            return false;
          } else if (newStakeAmount.isLessThanOrEqualTo(delegatorMinStake)) {
            toast.warn('New stake amount must be greater than the min stake');
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
        toast.error(err.shortMsg || err.message || "Error in withdrawing stake");
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
      toast.warn(`Min. staking amount is ${delegatorMinStake}`);
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
        toast.error(err.shortMsg || err.message || "Error in Staking");
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
        toast.error(err.shortMsg || err.message || "Error in claiming ordered withdraw");
        return false;
      }
    }
  }

  const contextValue = {
    // state
    pools,
    deltaPot,
    keyGenRound,
    reinsertPot,
    stakingEpoch,
    myTotalStake,
    minimumGasFee,
    epochStartTime,
    epochStartBlock,
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
    addOrUpdatePool,
    claimOrderedUnstake,
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
