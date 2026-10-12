'use client';

import { clientApiGet, clientApiPost } from '@/lib/apiClient';
import { parseEpochEndTime } from '@/utils/common';
import type {
  BatchNodeRewardStats,
  BatchNodeRewardStatsResponse,
  NodeRewardStats,
  NodeDailyReward,
  NodeDailyRewardsResponse,
  RewardsRange,
  StakerRewardStats,
  StakerRewardsListResponse,
} from '@/types/rewards';

export type { RewardsRange } from '@/types/rewards';

const CACHE_BLOCK_KEY = 'dmd_reward_cache_block';
const CACHE_BATCH_KEY = 'dmd_reward_cache_batch';
const CACHE_NODE_PREFIX = 'dmd_reward_cache_node_';
const CACHE_STAKER_STATS_PREFIX = 'dmd_reward_cache_staker_stats_';
const CACHE_STAKER_REWARDS_PREFIX = 'dmd_reward_cache_staker_rewards_';
const BLOCK_REFERENCE_KEY = 'contractLatestBlockN';

/** Maps a cache key → the Promise currently fetching that data. */
const pendingFetches = new Map<string, Promise<any>>();

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function getCurrentBlock(): string {
  try {
    return localStorage.getItem(BLOCK_REFERENCE_KEY) ?? '';
  } catch {
    return '';
  }
}

function clearStaleCache(): string {
  const currentBlock = getCurrentBlock();
  try {
    const cachedBlock = localStorage.getItem(CACHE_BLOCK_KEY);
    if (cachedBlock !== currentBlock) {
      // Remove all reward cache entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('dmd_reward_cache_')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      pendingFetches.clear();
      if (currentBlock) {
        localStorage.setItem(CACHE_BLOCK_KEY, currentBlock);
      }
    }
  } catch {}
  return currentBlock;
}

export async function getCachedBatchNodeStats(
  addresses: string[]
): Promise<Record<string, BatchNodeRewardStats>> {
  if (addresses.length === 0) return {};

  clearStaleCache();

  const cached = readCache<Record<string, BatchNodeRewardStats>>(CACHE_BATCH_KEY) ?? {};
  const missing = addresses.filter(a => !(a in cached));

  if (missing.length > 0) {
    // Check if there is already a fetch in flight for these addresses.
    // Use a stable key: sorted list of missing addresses.
    const pendingKey = CACHE_BATCH_KEY + ':' + [...missing].sort().join(',');

    if (!pendingFetches.has(pendingKey)) {
      const fetchPromise = (async () => {
        const CHUNK_SIZE = 100;
        const chunks: string[][] = [];
        for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
          chunks.push(missing.slice(i, i + CHUNK_SIZE));
        }

        const responses = await Promise.all(
          chunks.map(chunk =>
            clientApiPost<BatchNodeRewardStatsResponse>('nodes/reward-stats', { addresses: chunk })
              .catch(() => null)
          )
        );

        const fresh: Record<string, BatchNodeRewardStats> = {};
        for (const res of responses) {
          if (res?.ok) Object.assign(fresh, res.data);
        }

        // Read cache again (another call may have written to it while we fetched)
        const existing = readCache<Record<string, BatchNodeRewardStats>>(CACHE_BATCH_KEY) ?? {};
        const merged = { ...existing, ...fresh };
        writeCache(CACHE_BATCH_KEY, merged);
        return merged;
      })();

      pendingFetches.set(pendingKey, fetchPromise);
      fetchPromise.finally(() => pendingFetches.delete(pendingKey));
    }

    const merged = await pendingFetches.get(pendingKey)!;
    // Return only the addresses the caller asked for
    const result: Record<string, BatchNodeRewardStats> = {};
    for (const addr of addresses) {
      if (addr in merged) result[addr] = merged[addr];
    }
    return result;
  }

  // All addresses were already cached — return subset
  const result: Record<string, BatchNodeRewardStats> = {};
  for (const addr of addresses) {
    if (addr in cached) result[addr] = cached[addr];
  }
  return result;
}

/**
 * Returns single-address reward stats (used by the validator owner view on Profile
 * for the Performance Analytics and Validator Statistics cards).
 */
export async function getCachedNodeRewardStats(
  address: string
): Promise<NodeRewardStats | null> {
  const addr = address.toLowerCase();

  clearStaleCache();

  const cacheKey = CACHE_NODE_PREFIX + addr;
  const cached = readCache<NodeRewardStats>(cacheKey);
  if (cached !== null) return cached;

  if (!pendingFetches.has(cacheKey)) {
    const fetchPromise = clientApiGet<NodeRewardStats>(`node/${addr}/reward-stats`)
      .then(res => {
        if (res.ok) {
          writeCache(cacheKey, res.data);
          return res.data;
        }
        return null;
      })
      .catch(() => null);

    pendingFetches.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => pendingFetches.delete(cacheKey));
  }

  return pendingFetches.get(cacheKey)!;
}

const CACHE_DAILY_PREFIX = 'dmd_reward_cache_daily_';

export async function getCachedNodeDailyRewards(
  address: string,
  range: RewardsRange
): Promise<NodeDailyReward[]> {
  const addr = address.toLowerCase();

  clearStaleCache();

  const cacheKey = CACHE_DAILY_PREFIX + addr + '_' + range;
  const cached = readCache<NodeDailyReward[]>(cacheKey);
  if (cached !== null) return cached;

  if (!pendingFetches.has(cacheKey)) {
    const fetchPromise = clientApiGet<NodeDailyRewardsResponse>(
      `node/${addr}/epoch-rewards/daily?range=${range}`
    )
      .then(res => {
        if (!res.ok) return [] as NodeDailyReward[];
        const rows = res.data.data ?? [];
        writeCache(cacheKey, rows);
        return rows;
      })
      .catch(() => [] as NodeDailyReward[]);

    pendingFetches.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => pendingFetches.delete(cacheKey));
  }

  return pendingFetches.get(cacheKey)!;
}

export async function getCachedStakerRewardStats(
  stakerAddress: string
): Promise<StakerRewardStats | null> {
  const addr = stakerAddress.toLowerCase();

  clearStaleCache();

  const cacheKey = CACHE_STAKER_STATS_PREFIX + addr;
  const cached = readCache<StakerRewardStats>(cacheKey);
  if (cached !== null) return cached;

  if (!pendingFetches.has(cacheKey)) {
    const fetchPromise = clientApiGet<StakerRewardStats>(`staker/${addr}/reward-stats`)
      .then(res => {
        if (res.ok) {
          writeCache(cacheKey, res.data);
          return res.data;
        }
        return null;
      })
      .catch(() => null);

    pendingFetches.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => pendingFetches.delete(cacheKey));
  }

  return pendingFetches.get(cacheKey)!;
}

export async function getCachedStakerRewards30d(
  stakerAddress: string
): Promise<Record<string, number>> {
  const addr = stakerAddress.toLowerCase();

  clearStaleCache();

  const cacheKey = CACHE_STAKER_REWARDS_PREFIX + addr;
  const cached = readCache<Record<string, number>>(cacheKey);
  if (cached !== null) return cached;

  if (!pendingFetches.has(cacheKey)) {
    const fetchPromise = clientApiGet<StakerRewardsListResponse>(
      `staker/${addr}/rewards?limit=500`
    )
      .then(res => {
        if (!res.ok) return {} as Record<string, number>;
        const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
        const map: Record<string, number> = {};
        for (const entry of res.data.data) {
          const endTime = parseEpochEndTime(entry.epoch_end_time);
          if (endTime === null || endTime.getTime() < thirtyDaysAgo) continue;
          const pool = entry.pool_address.toLowerCase();
          map[pool] = (map[pool] || 0) + parseFloat(entry.reward_amount);
        }
        writeCache(cacheKey, map);
        return map;
      })
      .catch(() => ({} as Record<string, number>));

    pendingFetches.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => pendingFetches.delete(cacheKey));
  }

  return pendingFetches.get(cacheKey)!;
}
