'use client';

import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useWeb3Context } from '@/contexts/Web3';
import { useStakingContext } from '@/contexts/Staking';
import { useIsPrivacyMode } from '@/contexts/PrivacyMode';
import type { Pool } from '@/contexts/types/models';
import { computeHoldings, type PoolStake } from '@/utils/holdings';

const ZERO = BigInt(0);

const toWei = (value: BigNumber.Value | null | undefined): bigint => {
  const amount = new BigNumber(value ?? 0);
  return amount.isFinite() ? BigInt(amount.integerValue(BigNumber.ROUND_DOWN).toFixed(0)) : ZERO;
};

export interface WalletTotals {
  liquidWei: bigint;          // spendable native balance held on the address
  ownStakeWei: bigint;        // stake in the pool whose stakingAddress is the connected address
  delegatedWei: bigint;       // stake in every other pool
  stakedWei: bigint;          // ownStakeWei + delegatedWei
  totalWei: bigint;           // liquidWei + stakedWei
  pendingWithdrawWei: bigint; // ordered withdrawals, which sit in neither of the above
  isLoading: boolean;
  isHidden: boolean;
  isConnected: boolean;
}

const EMPTY = {
  liquidWei: ZERO,
  ownStakeWei: ZERO,
  delegatedWei: ZERO,
  stakedWei: ZERO,
  totalWei: ZERO,
  pendingWithdrawWei: ZERO,
  isLoading: false,
  isConnected: false,
};

/**
 * Everything the connected address controls, split into the buckets the chain keeps it in.
 *
 * The totals are derived from `pools` rather than read from the staking context's
 * `myTotalStake`, because that value is assigned inside a `setPools` updater callback and can
 * therefore be counted twice under StrictMode. Deriving here also yields the own/delegated
 * split in the same pass.
 *
 * Ordered withdrawals are reported separately and never folded into `stakedWei`: `orderWithdraw`
 * moves coins out of `stakeAmount` on-chain, and they only reach the address once claimed.
 */
export function useWalletTotals(): WalletTotals {
  const { userWallet } = useWeb3Context();
  const { pools, isSyncingPools, stakesSyncedFor } = useStakingContext();
  const isHidden = useIsPrivacyMode();

  const myAddr = userWallet?.myAddr ?? '';
  const myBalance = userWallet?.myBalance;

  return useMemo<WalletTotals>(() => {
    if (!myAddr) return { ...EMPTY, isHidden };

    const stakes: PoolStake[] = [];
    let pendingWithdrawWei = ZERO;

    for (const pool of pools as Pool[]) {
      stakes.push({ pool: pool.stakingAddress ?? '', amount: toWei(pool.myStake) });
      pendingWithdrawWei += toWei(pool.orderedWithdrawAmount);
    }

    const holdings = computeHoldings(myAddr, toWei(myBalance), stakes);

    return {
      liquidWei: holdings.wallet,
      ownStakeWei: holdings.ownStake,
      delegatedWei: holdings.delegatedOut,
      stakedWei: holdings.ownStake + holdings.delegatedOut,
      totalWei: holdings.total,
      pendingWithdrawWei,
      isLoading: isSyncingPools || stakesSyncedFor !== myAddr,
      isHidden,
      isConnected: true,
    };
  }, [myAddr, myBalance, pools, isSyncingPools, stakesSyncedFor, isHidden]);
}
