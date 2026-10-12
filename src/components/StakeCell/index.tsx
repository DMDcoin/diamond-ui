'use client';
import BigNumber from 'bignumber.js';
import SaturationBar, { getSaturationPct, getSaturationTier } from '../SaturationBar';
import { formatDmdFromWei, formatSaturation } from '@/utils/format';
import '../SharedStats/SharedStats.css';

interface StakeCellProps {
  totalStakeWei: string | BigNumber;
}

export default function StakeCell({ totalStakeWei }: StakeCellProps) {
  const pct = getSaturationPct(totalStakeWei);
  const tier = getSaturationTier(pct);
  return (
    <div className="dmd-stake-cell">
      <div className="dmd-stake-cell__head">
        <span className="dmd-stake-cell__value">{formatDmdFromWei(totalStakeWei)}</span>
        <span className={`dmd-stake-cell__pct dmd-stake-cell__pct--${tier}`}>{formatSaturation(pct)}</span>
      </div>
      <SaturationBar totalStakeWei={totalStakeWei} showLabel={false} />
    </div>
  );
}
