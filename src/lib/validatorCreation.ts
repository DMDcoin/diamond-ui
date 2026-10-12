'use client';

import { clientApiGet } from '@/lib/apiClient';

/**
 * Resolves when a validator pool came into existence, which on chain is the moment
 * its owner placed the initial self stake through addPool. That timestamp never
 * changes, so it is fetched once per validator and kept from then on.
 */

const CACHE_PREFIX = 'dmd_validator_created_';
/** Enough rows to look past delegations recorded in the same block, still a single small request. */
const PAGE_SIZE = 5;

interface StakeTransaction {
  block_timestamp: string | number;
  action_type: string;
  staker_address: string;
  is_delegator_stake: boolean;
}

interface StakeTransactionsResponse {
  data: StakeTransaction[];
}

/** Maps a cache key → the Promise currently fetching that data. */
const pendingFetches = new Map<string, Promise<number | null>>();

function readCache(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, timestamp: number): void {
  try {
    localStorage.setItem(key, String(timestamp));
  } catch {}
}

/**
 * Picks the pool owner's first stake out of the oldest transactions of a pool.
 * Falls back to the oldest transaction of any kind, since nothing can be staked
 * on a pool before that pool exists.
 */
function deriveCreationTimestamp(rows: StakeTransaction[], poolAddress: string): number | null {
  const firstSelfStake = rows.find(
    row =>
      row.action_type === 'PlacedStake' &&
      !row.is_delegator_stake &&
      row.staker_address?.toLowerCase() === poolAddress,
  );

  const timestamp = Number((firstSelfStake ?? rows[0])?.block_timestamp);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

/**
 * Returns the pool creation date as a unix timestamp in seconds, or null when the
 * backend holds no stake history for the address.
 */
export async function getValidatorCreationDate(poolAddress: string): Promise<number | null> {
  const pool = poolAddress.toLowerCase();
  const cacheKey = CACHE_PREFIX + pool;

  const cached = readCache(cacheKey);
  if (cached !== null) return cached;

  if (!pendingFetches.has(cacheKey)) {
    const fetchPromise = clientApiGet<StakeTransactionsResponse>(
      `node/${pool}/stake-transactions?limit=${PAGE_SIZE}&offset=0`,
    )
      .then(response => {
        if (!response.ok) return null;
        const timestamp = deriveCreationTimestamp(response.data?.data ?? [], pool);
        // Only a resolved date is worth keeping; a temporary outage must stay retryable.
        if (timestamp !== null) writeCache(cacheKey, timestamp);
        return timestamp;
      })
      .catch(() => null);

    pendingFetches.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => pendingFetches.delete(cacheKey));
  }

  return pendingFetches.get(cacheKey)!;
}
