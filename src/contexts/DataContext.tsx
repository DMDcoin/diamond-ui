import React, { createContext, useContext, useState } from "react";

import Web3 from "web3";
import { BN } from "bn.js";
import Web3Modal from "web3modal";
import { walletConnectProvider } from "@web3modal/wagmi";
import { Context } from "../services/blockchain/models/context";
import { DataContextProviderProps, DataContextState } from "./types";
import { Delegator, Pool } from "../services/blockchain/models/model";
import { ContractManager } from "../services/blockchain/models/contractManager";
import { BlockType, NonPayableTx } from "../services/blockchain/types/contracts";
import { UserWallet } from "../services/blockchain/models/wallet";

interface DataContextProps {
  dataAdapter: DataContextState | null,
  initializeDataAdapter: () => {},
  connectWallet: () => {}
}

const web3 = new Web3("https://rpc.uniq.diamonds");
const contracts = new ContractManager(web3);
const initialDataContextState: DataContextState = {
  initialized: false,
  web3: web3,
  wallet: null,
  context: new Context(),
  handlingNewBlock: false,
  contracts: contracts,
  vsContract: contracts.getValidatorSetHbbft(),
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

const DataContext = createContext<DataContextProps | undefined>(undefined);

const DataContextProvider: React.FC<DataContextProviderProps> = ({children}) => {
  const [dataAdapter, setDataAdapter] = useState<DataContextState>(initialDataContextState);

  const initializeDataAdapter = async () => {
    if (dataAdapter.initialized) return;

    dataAdapter.initialized = true
    dataAdapter.stContract = await contracts.getStakingHbbft();
    dataAdapter.brContract = await contracts.getRewardHbbft();
    dataAdapter.kghContract = await contracts.getKeyGenHistory();
    dataAdapter.rngContract = await contracts.getRandomHbbft();

    await refresh();
    updateEventSubscription();
  }

  /**
   * updates the event subscript based on the fact 
   * if we are browsing historic data or not.
   */
  const updateEventSubscription = () => {
    console.log('[INFO] Updating event subscription. Is historic?:', dataAdapter.isShowHistoric);

    if (dataAdapter.isShowHistoric) {
      // if we browse historic, we can safely unsusbscribe from events.
      unsubscribeToEvents();
    }
    else {
      // if we are tracking the latest block,
      // we only subscript to event if we have not done already.
      if (!dataAdapter.newBlockPolling) {
        subscribeToEvents();
      }
    }
  }

  const unsubscribeToEvents = () => {
    if (dataAdapter.newBlockPolling) {
      clearInterval(dataAdapter.newBlockPolling);
      dataAdapter.newBlockPolling = undefined;
    }
  }

  const subscribeToEvents = async (): Promise<void> => {
    unsubscribeToEvents();

    dataAdapter.newBlockPolling = setInterval(async () =>  {
      // we make a double check, if we really
      // should not browse historic.
      if (dataAdapter.isShowHistoric) {
        return;
      }

      const currentBlock = await dataAdapter.web3.eth.getBlockNumber();
      if (currentBlock > dataAdapter.context.currentBlockNumber && !dataAdapter.handlingNewBlock) {
        dataAdapter.handlingNewBlock = true;
        await handleNewBlock();
        dataAdapter.handlingNewBlock = false;
      }
    }, 300000);
  }

  const handleNewBlock = async () : Promise<void> => {
    const currWallet = dataAdapter.wallet;
    const currContext = dataAdapter.context;

    console.log('[INFO] Handling new block.');
    const blockHeader = await dataAdapter.web3.eth.getBlock('latest');
    console.log(`[INFO] Current Block Number:`, currContext.currentBlockNumber);

    currContext.currentBlockNumber = blockHeader.number;
    currContext.currentTimestamp = new BN(blockHeader.timestamp);

    if (currWallet) {
      const myBalance = new BN(await dataAdapter.web3.eth.getBalance(currWallet.myAddr));
      currWallet.myBalance = myBalance;
    }

    // epoch change
    console.log(`[Info] Updating stakingEpochEndBlock at block ${currContext.currentBlockNumber}`);
    const oldEpoch = currContext.stakingEpoch;
    await retrieveValuesFromContract();

    console.log("[INFO] Epoch times | Old", oldEpoch, "Latest:", currContext.stakingEpoch, oldEpoch !== currContext.stakingEpoch);

    const isNewEpoch = oldEpoch !== currContext.stakingEpoch;

    setDataAdapter((prevDataAdapter) => ({
      ...prevDataAdapter, 
      context: currContext,
      wallet: currWallet
    }));
    await syncPoolsState(isNewEpoch);
  }

  const refresh = async () => {
    try {
      const history_info = getBlockHistoryInfoAsString();
      console.log('[INFO] Starting data refresh', history_info);
      dataAdapter.isReadingData = true;
      await retrieveGlobalValues();
      await retrieveValuesFromContract();
      await syncPoolsState(true);
      dataAdapter.isReadingData = false;
      dataAdapter.lastError = undefined;
      console.log('[INFO] Finished data refresh', history_info);
    } catch(e: unknown) {
      dataAdapter.lastError = e;
      dataAdapter.isReadingData = false;
    }
  }

  const getBlockHistoryInfoAsString = () => {
    return dataAdapter.isShowHistoric ? `historic block #${dataAdapter.showHistoricBlock}` : 'latest';
  }

  const tx = () : NonPayableTx | undefined => {
    return undefined;
  }

  const block = () : BlockType => {
    if ( dataAdapter.isShowHistoric ) {
      return dataAdapter.showHistoricBlock;
    }

    return dataAdapter.context.currentBlockNumber;
  }

  const getMyStake = async (stakingAddress: string): Promise<string> => {
    if (!dataAdapter.web3 || !dataAdapter.wallet || !dataAdapter.stContract) {
      return '0';
    }
    
    const stakeAmount = dataAdapter.stContract.methods.stakeAmount(stakingAddress, dataAdapter.wallet.myAddr).call(tx(), block());
    return stakeAmount;
  }

  const getBannedUntil = async (miningAddress: string): Promise<any> => {
    return new BN((await dataAdapter.vsContract.methods.bannedUntil(miningAddress).call(tx(), block())));
  }

  const getBanCount = async (miningAddress: string): Promise<number> => {
    return parseInt(await dataAdapter.vsContract.methods.banCounter(miningAddress).call(tx(), block()));
  }

  const getAvailableSince = async (miningAddress: string): Promise<any> => {
    const rawResult = await dataAdapter.vsContract.methods.validatorAvailableSince(miningAddress).call(tx(), block());
    return new BN(rawResult);
  }

  const retrieveGlobalValues = async () => {
    console.log("[INFO] Retrieving Global Values")
    const currWeb3 = dataAdapter.web3;
    const currContext = dataAdapter.context;
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

    if (dataAdapter.stContract) {
      currContext.candidateMinStake = new BN(await dataAdapter.stContract.methods.candidateMinStake().call(tx(), block()));
      currContext.delegatorMinStake = new BN(await dataAdapter.stContract.methods.delegatorMinStake().call(tx(), block()));
    }
    
    currContext.minimumGasFee = new BN(await dataAdapter.contracts.getContractPermission().methods.minimumGasPrice().call(tx(), block()));

    // those values are asumed to be not changeable.
    currContext.epochDuration = parseInt(await (await dataAdapter.contracts.getStakingHbbft()).methods.stakingFixedEpochDuration().call(tx(), block()));
    currContext.stakeWithdrawDisallowPeriod = parseInt(await (await dataAdapter.contracts.getStakingHbbft()).methods.stakingWithdrawDisallowPeriod().call(tx(), block()));

    setDataAdapter((prevDataAdapter) => ({
      ...prevDataAdapter, 
      context: currContext,
      web3: currWeb3
    }));
  }

  const retrieveValuesFromContract = async () => {
    console.log("[INFO] Retrieving Values From Contract");
    const currContext = dataAdapter.context;
    const oldStakingEpoch = dataAdapter.context.stakingEpoch;

    const promises: Promise<any>[] = [];
    
    if (dataAdapter.stContract) {
      currContext.stakingEpoch = parseInt(await dataAdapter.stContract.methods.stakingEpoch().call(tx(), block()));
    }

    promises.push(
      dataAdapter.contracts.getCurrentKeyGenRound(block()).then((result) => {
        currContext.keyGenRound = result;
      })
    );
    
    if (currContext.stakingEpoch !== oldStakingEpoch && dataAdapter.stContract && dataAdapter.brContract) {
      promises.push(
        dataAdapter.stContract.methods.stakingEpochStartBlock().call(tx(), block()).then((result) => {
          currContext.epochStartBlock = parseInt(result);
        }),
        dataAdapter.stContract.methods.stakingEpochStartTime().call(tx(), block()).then((result) => {
          currContext.epochStartTime = parseInt(result);
        }),
        dataAdapter.brContract.methods.deltaPot().call(tx(), block()).then((result) => {
          currContext.deltaPot = dataAdapter.web3.utils.fromWei(result, 'ether');
        }),
        dataAdapter.brContract.methods.reinsertPot().call(tx(), block()).then((result) => {
          currContext.reinsertPot = dataAdapter.web3.utils.fromWei(result, 'ether');
        }),
        dataAdapter.stContract.methods.stakingFixedEpochEndTime().call(tx(), block()).then((result) => {
          currContext.stakingEpochEndTime = parseInt(result);
        }),
        dataAdapter.stContract.methods.areStakeAndWithdrawAllowed().call(tx(), block()).then((result) => {
          currContext.canStakeOrWithdrawNow = result;
        })
      );
  
      promises.push(
        dataAdapter.web3.eth.getBalance('0xDA0da0da0Da0Da0Da0DA00DA0da0da0DA0DA0dA0').then((daoPotValue) => {
          currContext.daoPot = dataAdapter.web3.utils.fromWei(daoPotValue, 'ether');
        })
      );
    }

    await Promise.allSettled(promises).then(() => {
      setDataAdapter((prevDataAdapter) => ({
        ...prevDataAdapter, 
        context: currContext
      }));
    });
  }
  
  const syncPoolsState = async (isNewEpoch: boolean) => {
    const currContext = dataAdapter.context;

    const newCurrentValidators = await dataAdapter.vsContract.methods.getValidators().call(tx(), block());
    const validatorWithoutPool: Array<string> = [...newCurrentValidators];
    
    let activePoolAddrs: Array<string> = [];
    let inactivePoolAddrs: Array<string> = [];
    let toBeElectedPoolAddrs: Array<string> = [];
    let pendingValidatorAddrs: Array<string> = [];

    if (dataAdapter.stContract) {
      await Promise.allSettled([
        dataAdapter.stContract.methods.getPools().call(tx(), block()).then((result) => {
          activePoolAddrs = result;
        }),
        dataAdapter.stContract.methods.getPoolsInactive().call(tx(), block()).then((result) => {
          inactivePoolAddrs = result;
        }),
        dataAdapter.stContract.methods.getPoolsToBeElected().call(tx(), block()).then((result) => {
          toBeElectedPoolAddrs = result;
        }),
        dataAdapter.vsContract.methods.getPendingValidators().call(tx(), block()).then((result) => {
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
        setDataAdapter((prevDataAdapter) => ({
          ...prevDataAdapter,
          context: currContext
        }));
      });
    }
  }

  const updatePool = async (pool: Pool, activePoolAddrs: Array<string>, toBeElectedPoolAddrs: Array<string>, pendingValidatorAddrs: Array<string>, isNewEpoch: boolean) : Promise<Pool>  => {
    const { stakingAddress } = pool;

    pool.miningAddress = await dataAdapter.vsContract.methods.miningByStakingAddress(stakingAddress).call(tx(), block());
    await Promise.allSettled([
      dataAdapter.vsContract.methods.getPublicKey(pool.miningAddress).call(tx(), block()).then((result) => {
        pool.miningPublicKey = result;
      }),
      getAvailableSince(pool.miningAddress).then((result) => {
        pool.availableSince = result;
      }),
      getMyStake(stakingAddress).then((result) => {
        pool.myStake = new BN(result);
      }),
    ]);

    if (dataAdapter.stContract) {
      await Promise.allSettled([
        dataAdapter.stContract.methods.poolDelegators(stakingAddress).call(tx(), block()).then((result) => {
          pool.delegators = result.map((delegator: any) => new Delegator(delegator));
        }),
        dataAdapter.stContract.methods.stakeAmount(stakingAddress, stakingAddress).call(tx(), block()).then((result) => {
          pool.candidateStake = new BN(result);
        }),
        dataAdapter.stContract.methods.stakeAmountTotal(stakingAddress).call(tx(), block()).then((result) => {
          pool.totalStake = new BN(result);
        }),
        dataAdapter.wallet ? dataAdapter.stContract.methods.orderedWithdrawAmount(stakingAddress, dataAdapter.wallet.myAddr).call(tx(), block()).then((result) => {
          pool.orderedWithdrawAmount = new BN(result);
        }) : new BN(0),
        // dataAdapter.getClaimableReward(stakingAddress).then((result) => {
        //   pool.claimableReward = result;
        // })
        getBanCount(pool.miningAddress).then((result) => {
          pool.banCount = result;
        }),
        getBannedUntil(pool.miningAddress).then((result) => {
          pool.bannedUntil = new BN(result);
        }),
        dataAdapter.contracts.getPendingValidatorState(pool.miningAddress, block()).then((result) => {
          pool.keyGenMode = result;
        }),
      ])
    }
    
    pool.isAvailable = !pool.availableSince.isZero();
    pool.isActive = activePoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isToBeElected = toBeElectedPoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isPendingValidator = pendingValidatorAddrs.indexOf(pool.miningAddress) >= 0;
    pool.isMe = dataAdapter.wallet ? dataAdapter.wallet.myAddr === pool.stakingAddress : false;
    pool.isCurrentValidator = dataAdapter.context.currentValidators.indexOf(pool.miningAddress) >= 0;    

    // remove pool if required
    if (!dataAdapter.showAllPools) {
      if(!pool.isCurrentValidator && !pool.isAvailable && !pool.isToBeElected && !pool.isPendingValidator && !pool.isMe && !pool.myStake.gt(new BN('0'))) {
        for (let i = 0; i < dataAdapter.context.pools.length; i++) {
          if (dataAdapter.context.pools[i].stakingAddress === pool.stakingAddress) {
            dataAdapter.context.pools.splice(i, 1);
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

    if (pool.isPendingValidator && dataAdapter.kghContract) {
      pool.parts = await dataAdapter.kghContract.methods.parts(pool.miningAddress).call(tx(), block());
      const acksLengthBN = new BN(await dataAdapter.kghContract.methods.getAcksLength(pool.miningAddress).call(tx(), block()));
      pool.numberOfAcks = acksLengthBN.toNumber();
    } else {
      pool.parts = '';
      pool.numberOfAcks = 0;
    }
    return pool;
  }

  const connectWallet = async () => {
    try {
      const chainId = 777012;
      const url = "https://rpc.uniq.diamonds";
      const chainOptions: { rpc: Record<number, string> } = { rpc: { [chainId]: url } };

      const providerOptions = {
        walletconnect: {
          package: walletConnectProvider,
          options: chainOptions,
        },
      };
  
      const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: false, // optional
        providerOptions, // required
      });
  
      web3Modal.clearCachedProvider();
      const web3ModalInstance = await web3Modal.connect();
  
      // handle account change
      web3ModalInstance.on("accountsChanged", function (accounts: Array<string>) {
        if (accounts.length === 0) {
          window.location.reload();
        } else {
          connectWallet();
        }
      });
  
      const provider = new Web3(web3ModalInstance);
  
      // force user to change to DMD network
      if (web3ModalInstance.chainId !== chainId) {
        try {
          await web3ModalInstance.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: new Web3().utils.toHex(chainId) }],
          });
        } catch (err: any) {
          if (err.code === 4902) {
            await web3ModalInstance.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainName: "DMD",
                  chainId: new Web3().utils.toHex(chainId),
                  nativeCurrency: { name: "DMD", decimals: 18, symbol: "DMD" },
                  rpcUrls: [url],
                },
              ],
            });
          } else {
            console.error("[Wallet Connect] Other Error", err);
            return undefined;
          }
        }
      }
  
      const myBalance = new BN(await dataAdapter.web3.eth.getBalance(web3ModalInstance.selectedAddress));
      const wallet = new UserWallet(web3ModalInstance.selectedAddress, myBalance);

      setDataAdapter((prevDataAdapter) => ({
        ...prevDataAdapter, 
        web3: provider,
        wallet: wallet
      }));

      return true;
    } catch (err) {
      console.error("[Wallet Connect]", err);
    }
  };
  

  const contextValue = {
    // states
    dataAdapter,
    
    // methods
    initializeDataAdapter,
    connectWallet
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

const useDataContext = (): DataContextProps => {
  const context = useContext(DataContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export { DataContextProvider, useDataContext };
