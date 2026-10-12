'use client';

import { clientApiGet } from '@/lib/apiClient';
import logger from '@/utils/logger';

/**
 * Derives, per delegator, the moment their current delegation to a pool began.
 */

const CACHE_PREFIX = 'dmd_delegation_since_';
const CACHE_BLOCK_KEY = 'dmd_delegation_since_block';
const BLOCK_REFERENCE_KEY = 'contractLatestBlockN';

/** Rows per request */
const PAGE_SIZE = 200;
/** Upper bound on paging */
const MAX_PAGES = 10;

interface StakeTransaction {
  block_timestamp: string | number;
  action_type: string;
  staker_address: string;
  amount: string;
}

interface StakeTransactionsResponse {
  data: StakeTransaction[];
  count: number;
}

/** Delegator address (lowercase) → unix timestamp in seconds. */
export type DelegationStartDates = Record<string, number>;

/** Maps a cache key → the Promise currently fetching that data. */
const pendingFetches = new Map<string, Promise<DelegationStartDates>>();

function readCache(key: string): DelegationStartDates | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as DelegationStartDates;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: DelegationStartDates): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function clearStaleCache(): void {
  let currentBlock = '';
  try {
    currentBlock = localStorage.getItem(BLOCK_REFERENCE_KEY) ?? '';
    const cachedBlock = localStorage.getItem(CACHE_BLOCK_KEY);
    if (cachedBlock !== currentBlock) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      pendingFetches.clear();
      if (currentBlock) {
        localStorage.setItem(CACHE_BLOCK_KEY, currentBlock);
      }
    }
  } catch {}
}

/**
 * Effect of an event on the staker's stake held in the pool.
 */
function stakeDelta(actionType: string, amount: bigint): bigint {
  switch (actionType) {
    case 'PlacedStake':
      return amount;
    case 'WithdrewStake':
    case 'OrderedWithdrawal':
    case 'MovedStake':
      return -amount;
    default:
      return BigInt(0);
  }
}

async function fetchStakeTransactions(poolAddress: string): Promise<StakeTransaction[]> {
  const rows: StakeTransaction[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await clientApiGet<StakeTransactionsResponse>(
      `node/${poolAddress}/stake-transactions?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
    );

    if (!response.ok) return rows;

    const batch = response.data?.data ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE || rows.length >= (response.data?.count ?? 0)) {
      return rows;
    }
  }

  logger.warn(`Stake history for ${poolAddress} exceeds ${MAX_PAGES * PAGE_SIZE} rows; delegation dates may be incomplete`);
  return rows;
}

function deriveStartDates(rows: StakeTransaction[]): DelegationStartDates {
  const balances = new Map<string, bigint>();
  const startedAt = new Map<string, number>();

  // Rows arrive oldest first, which is the order the replay needs.
  for (const row of rows) {
    const staker = row.staker_address?.toLowerCase();
    if (!staker) continue;

    let amount: bigint;
    try {
      amount = BigInt(row.amount);
    } catch {
      continue;
    }

    const previous = balances.get(staker) ?? BigInt(0);
    let next = previous + stakeDelta(row.action_type, amount);
    if (next < BigInt(0)) next = BigInt(0);

    if (previous <= BigInt(0) && next > BigInt(0)) {
      startedAt.set(staker, Number(row.block_timestamp));
    } else if (next <= BigInt(0)) {
      startedAt.delete(staker);
    }

    balances.set(staker, next);
  }

  const result: DelegationStartDates = {};
  startedAt.forEach((timestamp, staker) => {
    if (Number.isFinite(timestamp) && timestamp > 0) result[staker] = timestamp;
  });
  return result;
}

/**
 * Returns the delegation start date per delegator of a pool, keyed by lowercase address.
 */
export async function getDelegationStartDates(poolAddress: string): Promise<DelegationStartDates> {
  const pool = poolAddress.toLowerCase();

  clearStaleCache();

  const cacheKey = CACHE_PREFIX + pool;
  const cached = readCache(cacheKey);
  if (cached !== null) return cached;

  if (!pendingFetches.has(cacheKey)) {
    const fetchPromise = fetchStakeTransactions(pool)
      .then(rows => {
        const dates = deriveStartDates(rows);
        writeCache(cacheKey, dates);
        return dates;
      })
      .catch(err => {
        logger.error('Error deriving delegation start dates:', err);
        return {} as DelegationStartDates;
      });

    pendingFetches.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => pendingFetches.delete(cacheKey));
  }

  return pendingFetches.get(cacheKey)!;
}
