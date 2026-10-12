'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsPrivacyMode } from '@/contexts/PrivacyMode';
import type { RichListEntry, RichListSnapshot } from '@/types/richList';

const CLIENT_TTL_MS = 2 * 60 * 1000;

let cached: { snapshot: RichListSnapshot; fetchedAt: number } | null = null;
let inFlight: Promise<RichListSnapshot> | null = null;

const fetchRichList = (force: boolean): Promise<RichListSnapshot> => {
  if (!force && cached && Date.now() - cached.fetchedAt < CLIENT_TTL_MS) {
    return Promise.resolve(cached.snapshot);
  }
  if (!inFlight) {
    inFlight = fetch('/api/rich-list')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Rich list request failed (${response.status})`);
        const snapshot = (await response.json()) as RichListSnapshot;
        cached = { snapshot, fetchedAt: Date.now() };
        return snapshot;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

export interface RichListData {
  blockNumber: bigint;
  blockTimestamp: number;
  generatedAt: number;
  totalSupply: bigint;
  holders: number;
  entries: RichListEntry[];
}

export interface UseRichListResult {
  data: RichListData | null;
  isLoading: boolean;
  error: Error | null;
  isHidden: boolean;
  retry: () => void;
}

export function useRichList(): UseRichListResult {
  const isHidden = useIsPrivacyMode();
  const [snapshot, setSnapshot] = useState<RichListSnapshot | null>(cached?.snapshot ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isHidden) return;

    let cancelled = false;
    fetchRichList(attempt > 0)
      .then((next) => {
        if (cancelled) return;
        setSnapshot(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error('Rich list request failed'));
      });

    return () => {
      cancelled = true;
    };
  }, [isHidden, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const data = useMemo<RichListData | null>(() => {
    if (!snapshot) return null;
    return {
      blockNumber: BigInt(snapshot.blockNumber),
      blockTimestamp: snapshot.blockTimestamp,
      generatedAt: snapshot.generatedAt,
      totalSupply: BigInt(snapshot.totalSupply),
      holders: snapshot.holders,
      entries: snapshot.rows.map((row, index) => ({
        rank: index + 1,
        address: row.address,
        wallet: BigInt(row.wallet),
        ownStake: BigInt(row.ownStake),
        delegatedOut: BigInt(row.delegatedOut),
        total: BigInt(row.total),
        isPool: row.isPool,
      })),
    };
  }, [snapshot]);

  return { data, isLoading: !isHidden && !snapshot && !error, error, isHidden, retry };
}
