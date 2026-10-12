import { createPublicClient, getAddress, http, isAddress, parseAbi, type Address } from 'viem';
import config from '@/lib/config';
import logger from '@/utils/logger';
import { ContractManager } from '@/contexts/services/contractManager';
import { RICH_LIST_EXCLUDED_ADDRESSES } from '@/config/richList';
import { computeHoldings, type PoolStake } from '@/utils/holdings';
import type { RichListRow, RichListSnapshot } from '@/types/richList';

const SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const RETRY_AFTER_MS = 60 * 1000;
const RPC_BATCH_SIZE = 100;
const RPC_TIMEOUT_MS = 30_000;
const EXPLORER_PAGE_SIZE = 5000;
const EXPLORER_MAX_PAGES = 20;
const EXPLORER_TIMEOUT_MS = 60_000;
const ZERO = BigInt(0);

const VALIDATOR_SET_ABI = parseAbi(['function stakingContract() view returns (address)']);

const STAKING_ABI = parseAbi(['function poolDelegatorsInactive(address _poolStakingAddress) view returns (address[])']);

const AGGREGATOR_ABI = parseAbi([
  'struct Pools { address[] stActivePools; address[] stInActivePools; address[] stPoolsToBeElected; address[] vsValidatorsMiningAddresses; address[] vsValidatorsStakingAddresses; address[] vsPendingValidatorsMiningAddresses; address[] vsPendingValidatorsStakingAddresses; }',
  'struct PoolData { address miningAddress; uint256 availableSince; bytes publicKey; address[] delegators; uint8 keygenMode; uint256 stakedAmountTotal; bool isFaultyValidator; uint256 validatorScore; uint256 connectivityScore; }',
  'struct DelegateData { address delegator; uint256 delegatedAmount; }',
  'function getAllPools() view returns (Pools pools)',
  'function getPoolsData(address[] _sAs) view returns (PoolData[] poolsData)',
  'function getDelegationsData(address[] delegators, address poolAddress) view returns (DelegateData[] _delegatesData, uint256 _ownStake, uint256 _candidateStake)',
]);

interface ExplorerAccount {
  address: string;
  balance: string | null;
  stale: boolean;
}

interface ExplorerAccountsResponse {
  status: string;
  message: string;
  result: ExplorerAccount[] | null;
}

interface RankedHolder {
  address: Address;
  wallet: bigint;
  ownStake: bigint;
  delegatedOut: bigint;
  total: bigint;
  isPool: boolean;
}

let snapshot: RichListSnapshot | null = null;
let pending: Promise<RichListSnapshot> | null = null;
let lastFailure: { at: number; error: unknown } | null = null;

const isZeroAddress = (address: string) => BigInt(address) === ZERO;

const fetchExplorerAddresses = async (): Promise<Address[]> => {
  const base = config.explorerUrl.replace(/\/$/, '');
  const addresses: Address[] = [];

  for (let page = 1; page <= EXPLORER_MAX_PAGES; page += 1) {
    const response = await fetch(
      `${base}/api?module=account&action=listaccounts&page=${page}&offset=${EXPLORER_PAGE_SIZE}`,
      { cache: 'no-store', signal: AbortSignal.timeout(EXPLORER_TIMEOUT_MS) }
    );
    if (!response.ok) {
      throw new Error(`Explorer account list failed with status ${response.status}`);
    }

    const body = (await response.json()) as ExplorerAccountsResponse;
    const accounts = body.result ?? [];
    if (body.status !== '1' && page === 1) {
      throw new Error(`Explorer account list failed: ${body.message}`);
    }

    for (const account of accounts) {
      if (!isAddress(account.address, { strict: false })) continue;
      if (account.stale || BigInt(account.balance || '0') > ZERO) {
        addresses.push(getAddress(account.address));
      }
    }

    if (accounts.length < EXPLORER_PAGE_SIZE) break;
  }

  return addresses;
};

const compareHolders = (a: RankedHolder, b: RankedHolder) => {
  if (a.total !== b.total) return a.total > b.total ? -1 : 1;
  return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
};

const toRow = (holder: RankedHolder): RichListRow => ({
  address: holder.address,
  wallet: holder.wallet.toString(),
  ownStake: holder.ownStake.toString(),
  delegatedOut: holder.delegatedOut.toString(),
  total: holder.total.toString(),
  isPool: holder.isPool,
});

const buildSnapshot = async (): Promise<RichListSnapshot> => {
  const client = createPublicClient({
    transport: http(config.rpcUrl, { batch: { batchSize: RPC_BATCH_SIZE }, timeout: RPC_TIMEOUT_MS }),
  });

  const block = await client.getBlock({ blockTag: 'latest' });
  const blockNumber = block.number;
  const validatorSet = getAddress(ContractManager.getContractAddresses().validatorSetAddress);
  const aggregator = getAddress(config.aggregatorContractAddress);

  const [stakingAddress, allPools, explorerAddresses] = await Promise.all([
    client.readContract({ address: validatorSet, abi: VALIDATOR_SET_ABI, functionName: 'stakingContract', blockNumber }),
    client.readContract({ address: aggregator, abi: AGGREGATOR_ABI, functionName: 'getAllPools', blockNumber }),
    fetchExplorerAddresses(),
  ]);

  const poolKeys = new Set<string>();
  const pools: Address[] = [];
  for (const pool of [
    ...allPools.stActivePools,
    ...allPools.stInActivePools,
    ...allPools.stPoolsToBeElected,
    ...allPools.vsValidatorsStakingAddresses,
    ...allPools.vsPendingValidatorsStakingAddresses,
  ]) {
    const key = pool.toLowerCase();
    if (isZeroAddress(pool) || poolKeys.has(key)) continue;
    poolKeys.add(key);
    pools.push(pool);
  }

  const [poolsData, inactiveDelegators] = await Promise.all([
    pools.length
      ? client.readContract({ address: aggregator, abi: AGGREGATOR_ABI, functionName: 'getPoolsData', args: [pools], blockNumber })
      : Promise.resolve([]),
    Promise.all(
      pools.map((pool) =>
        client.readContract({ address: stakingAddress, abi: STAKING_ABI, functionName: 'poolDelegatorsInactive', args: [pool], blockNumber })
      )
    ),
  ]);

  const delegations = await Promise.all(
    pools.map((pool, index) => {
      const stakers = new Map<string, Address>();
      for (const staker of [...poolsData[index].delegators, ...inactiveDelegators[index], pool]) {
        stakers.set(staker.toLowerCase(), staker);
      }
      return client.readContract({
        address: aggregator,
        abi: AGGREGATOR_ABI,
        functionName: 'getDelegationsData',
        args: [[...stakers.values()], pool],
        blockNumber,
      });
    })
  );

  const candidates = new Map<string, Address>();
  const stakesByAddress = new Map<string, PoolStake[]>();
  const addCandidate = (address: Address) => {
    const key = address.toLowerCase();
    if (!candidates.has(key)) candidates.set(key, address);
    return key;
  };
  const addStake = (address: Address, stake: PoolStake) => {
    if (stake.amount <= ZERO) return;
    const key = addCandidate(address);
    const stakes = stakesByAddress.get(key);
    if (stakes) {
      stakes.push(stake);
    } else {
      stakesByAddress.set(key, [stake]);
    }
  };

  pools.forEach((pool, index) => {
    const [delegates] = delegations[index];
    for (const { delegator, delegatedAmount } of delegates) {
      addStake(delegator, { pool, amount: delegatedAmount });
    }
  });
  explorerAddresses.forEach(addCandidate);

  const addresses = [...candidates.values()];
  const balances = await Promise.all(addresses.map((address) => client.getBalance({ address, blockNumber })));

  // share-of-supply denominator: sum of every balance at the snapshot block, excluded addresses included
  const totalSupply = balances.reduce((sum, balance) => sum + balance, ZERO);

  const excluded = new Set(RICH_LIST_EXCLUDED_ADDRESSES.map((address) => address.toLowerCase()));
  const positions: RankedHolder[] = [];
  addresses.forEach((address, index) => {
    const key = address.toLowerCase();
    if (excluded.has(key)) return;
    const holdings = computeHoldings(address, balances[index], stakesByAddress.get(key) ?? []);
    if (holdings.total <= ZERO) return;
    positions.push({ address, ...holdings, isPool: poolKeys.has(key) });
  });

  const codes = await Promise.all(positions.map(({ address }) => client.getCode({ address, blockNumber })));
  const holders = positions.filter((_, index) => !codes[index] || codes[index] === '0x');
  holders.sort(compareHolders);

  return {
    blockNumber: blockNumber.toString(),
    blockTimestamp: Number(block.timestamp),
    generatedAt: Date.now(),
    totalSupply: totalSupply.toString(),
    holders: holders.length,
    rows: holders.map(toRow),
  };
};

const refreshSnapshot = (): Promise<RichListSnapshot> => {
  if (!pending) {
    pending = buildSnapshot()
      .then((next) => {
        snapshot = next;
        lastFailure = null;
        return next;
      })
      .catch((error: unknown) => {
        lastFailure = { at: Date.now(), error };
        throw error;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

export const getRichListSnapshot = async (): Promise<RichListSnapshot> => {
  const now = Date.now();
  const canRetry = !lastFailure || now - lastFailure.at >= RETRY_AFTER_MS;

  if (!snapshot) {
    if (!pending && !canRetry && lastFailure) throw lastFailure.error;
    return refreshSnapshot();
  }

  if (now - snapshot.generatedAt >= SNAPSHOT_TTL_MS && canRetry) {
    refreshSnapshot().catch((error: unknown) => logger.error('[rich-list] snapshot refresh failed:', error));
  }
  return snapshot;
};
