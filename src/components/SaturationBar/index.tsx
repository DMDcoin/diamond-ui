'use client';
import BigNumber from 'bignumber.js';
import { formatSaturation } from '@/utils/format';
import '../SharedStats/SharedStats.css';

const MAX_STAKE_WEI = BigNumber(50000).multipliedBy(1e18);

export type SaturationTier = 'green' | 'yellow' | 'red';

export const getSaturationPct = (totalStakeWei: string | BigNumber): number => {
  const pct = BigNumber(totalStakeWei || 0).dividedBy(MAX_STAKE_WEI).multipliedBy(100).toNumber();
  return Math.min(Math.max(Number.isFinite(pct) ? pct : 0, 0), 100);
};

export const getSaturationTier = (pct: number): SaturationTier =>
  pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';

interface SaturationBarProps {
  totalStakeWei: string | BigNumber;
  showLabel?: boolean;
  size?: 'sm' | 'lg';
}

export default function SaturationBar({ totalStakeWei, showLabel = true, size = 'sm' }: SaturationBarProps) {
  const pctNum = getSaturationPct(totalStakeWei);
  const tier = getSaturationTier(pctNum);
  return (
    <div className={`dmd-sat-bar dmd-sat-bar--${size}`}>
      {showLabel && <span className="dmd-sat-bar__label">{formatSaturation(pctNum)}</span>}
      <div className="dmd-sat-bar__track">
        <div
          className={`dmd-sat-bar__fill dmd-sat-bar__fill--${tier}`}
          style={{ width: `${pctNum}%` }}
        />
      </div>
    </div>
  );
}
