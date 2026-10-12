'use client';
import BigNumber from 'bignumber.js';
import { useStakingContext } from '@/contexts/Staking';
import { Pool } from '@/contexts/types/models';
import { formatDmdFromWei } from '@/utils/format';

type OrderedPool = Pick<Pool, 'orderedWithdrawAmount' | 'orderedWithdrawUnlockEpoch'>;

export const isOrderClaimable = (pool: OrderedPool | null | undefined, stakingEpoch: number) =>
  new BigNumber(pool?.orderedWithdrawAmount ?? 0).isGreaterThan(0)
  && new BigNumber(pool?.orderedWithdrawUnlockEpoch ?? 0).isLessThanOrEqualTo(stakingEpoch);

interface OrderedStakeTagProps {
  pool: OrderedPool | null | undefined;
  className?: string;
}

export default function OrderedStakeTag({ pool, className }: OrderedStakeTagProps) {
  const { stakingEpoch } = useStakingContext();
  const amountWei = new BigNumber(pool?.orderedWithdrawAmount ?? 0);
  if (!amountWei.isGreaterThan(0)) return null;

  const unlockEpoch = new BigNumber(pool?.orderedWithdrawUnlockEpoch ?? 0);
  const isReady = isOrderClaimable(pool, stakingEpoch);
  const classes = ['ordered-stake-tag', isReady && 'ordered-stake-tag--ready', className].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      title={isReady
        ? 'Click Unstake to claim'
        : `Unlocks in epoch ${unlockEpoch.toFixed(0)}, current epoch is ${stakingEpoch}`}
    >
      <i className={isReady ? 'fas fa-circle-check' : 'fas fa-hourglass-half'} aria-hidden="true"></i>
      {formatDmdFromWei(amountWei)} {isReady ? 'ready to claim' : 'ordered'}
    </span>
  );
}
