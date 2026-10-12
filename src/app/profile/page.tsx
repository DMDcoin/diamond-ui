'use client'

import '../page.css';
import './Profile.css';
import Link from 'next/link';
import BigNumber from 'bignumber.js';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { truncateAddress } from '@/utils/common';
import { formatApy, formatCount, formatDmd, formatDmdFromWei, formatPercent, formatRpt30 } from '@/utils/format';
import { useWeb3Context } from '@/contexts/Web3';
import InfoTooltip from '@/components/InfoTooltip';
import { useStakingContext } from '@/contexts/Staking';
import { useDaoContext } from '@/contexts/DAO';
import { useIsPrivacyMode } from '@/contexts';
import { useWalletConnect } from '@/contexts/WalletConnect';
import StakeModal from '@/components/Modals/Stake/StakeModal';
import UnstakeModal from '@/components/Modals/Unstake/UnstakeModal';
import RemoveValidatorModal from '@/components/Modals/RemoveValidator/RemoveValidatorModal';
import CreatePoolModal from '@/components/Modals/CreatePool/CreatePoolModal';
import UpdatePoolOperatorModal from '@/components/Modals/UpdatePoolOperator/UpdatePoolOperatorModal';
import BonusScoreHistoryModal from '@/components/Modals/BonusScoreHistory/BonusScoreHistoryModal';
import StakeHistoryModal from '@/components/Modals/StakeHistory/StakeHistoryModal';
import RewardsHistoryModal from '@/components/Modals/RewardsHistory/RewardsHistoryModal';
import NodeRewardsHistoryModal from '@/components/Modals/NodeRewardsHistory/NodeRewardsHistoryModal';
import type { BatchNodeRewardStats, NodeRewardStats, StakerRewardStats, NodeDailyReward } from '@/types/rewards';
import {
  getCachedBatchNodeStats,
  getCachedNodeRewardStats,
  getCachedNodeDailyRewards,
  getCachedStakerRewardStats,
  getCachedStakerRewards30d,
} from '@/lib/rewardStatsCache';
import type { RewardsRange } from '@/lib/rewardStatsCache';
import { mapDailyRewardsToChartPoints } from '@/utils/rewardAggregation';
import ComposedChart from '@/components/Charts/ComposedChart';
import '@/components/Charts/Charts.css';
import ValidatorCell from '@/components/ValidatorCell';
import Aep30Badge, { Aep30Ring } from '@/components/Aep30Badge';
import SaturationBar from '@/components/SaturationBar';
import Rpt30Cell from '@/components/Rpt30Cell';
import OrderedStakeTag, { isOrderClaimable } from '@/components/OrderedStakeTag';
import ProfileIdentityHeader from '@/components/DMDNames/ProfileIdentityHeader';
import { useWalletDmdName } from '@/hooks/useWalletDmdName';

export default function ProfilePage() {
  const router = useRouter();
  const { userWallet } = useWeb3Context();
  const walletDmdName = useWalletDmdName();
  const { myPool, pools, totalDaoStake, myTotalStake, myCandidateStake, delegatorMinStake, stakingEpoch } = useStakingContext();
  const isPrivacyMode = useIsPrivacyMode();
  const { isConnected } = useWalletConnect();
  const { allDaoProposals } = useDaoContext();
  const [isBonusHistoryModalOpen, setIsBonusHistoryModalOpen] = useState(false);
  const [isValidatorStakeHistoryModalOpen, setIsValidatorStakeHistoryModalOpen] = useState(false);
  const [isDelegatedStakeHistoryModalOpen, setIsDelegatedStakeHistoryModalOpen] = useState(false);
  const [isStakerHistoryModalOpen, setIsStakerHistoryModalOpen] = useState(false);

  // Delegator reward state
  const [stakerRewardStats, setStakerRewardStats] = useState<StakerRewardStats | null>(null);
  const [stakerNodeStatsMap, setStakerNodeStatsMap] = useState<Record<string, BatchNodeRewardStats>>({});
  const [isLoadingStakerStats, setIsLoadingStakerStats] = useState(false);
  const [isRewardsHistoryModalOpen, setIsRewardsHistoryModalOpen] = useState(false);

  // Validator reward state
  const [validatorRewardStats, setValidatorRewardStats] = useState<NodeRewardStats | null>(null);
  const [isLoadingValidatorStats, setIsLoadingValidatorStats] = useState(false);
  const [isValidatorRewardsHistoryModalOpen, setIsValidatorRewardsHistoryModalOpen] = useState(false);

  // Per-pool rewards 30d (delegator view)
  const [perPoolRewards30d, setPerPoolRewards30d] = useState<Record<string, number>>({});
  // Top validators stats map (delegator view)
  const [topValidatorStatsMap, setTopValidatorStatsMap] = useState<Record<string, BatchNodeRewardStats>>({});
  // Daily reward series (validator view)
  const [dailyRewards, setDailyRewards] = useState<NodeDailyReward[]>([]);
  const [isLoadingEpochRewards, setIsLoadingEpochRewards] = useState(false);
  const [chartRange, setChartRange] = useState<RewardsRange>('30d');
  // legend toggles for Rewards Performance chart
  const [chartShowRpt, setChartShowRpt] = useState(true);
  const [chartShowPoolReward, setChartShowPoolReward] = useState(true);
  const [chartShowOwnerShare, setChartShowOwnerShare] = useState(true);

  // Get validators that user has staked with or has ordered coins waiting to be claimed
  const stakedValidators = useMemo(() => {
    return pools.filter(pool =>
      (BigNumber(pool.myStake ?? 0).isGreaterThan(0) ||
        BigNumber(pool.orderedWithdrawAmount ?? 0).isGreaterThan(0)) &&
      pool.stakingAddress !== userWallet.myAddr
    );
  }, [pools, userWallet.myAddr]);

  // Pools with room for at least delegatorMinStake more DMD
  const eligibleTopValidators = useMemo(() => {
    const poolMaxWei = BigNumber(50000).multipliedBy(10 ** 18);
    return pools.filter(pool => {
      if (!pool.totalStake || !BigNumber(pool.totalStake).isGreaterThan(0)) return false;
      if (!(pool.isActive || pool.isToBeElected || pool.isPendingValidator)) return false;
      const totalStakeWei = BigNumber(pool.totalStake);
      if (!totalStakeWei.isLessThan(poolMaxWei)) return false;
      return poolMaxWei.minus(totalStakeWei).isGreaterThanOrEqualTo(delegatorMinStake);
    });
  }, [pools, delegatorMinStake]);

  // Top 5 eligible validators by highest RpT30
  const topValidators = useMemo(() => {
    return [...eligibleTopValidators]
      .sort((a, b) => {
        const aRpt = topValidatorStatsMap[a.stakingAddress.toLowerCase()]?.rpt30 ?? -Infinity;
        const bRpt = topValidatorStatsMap[b.stakingAddress.toLowerCase()]?.rpt30 ?? -Infinity;
        return bRpt - aRpt;
      })
      .slice(0, 5);
  }, [eligibleTopValidators, topValidatorStatsMap]);

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!isConnected || !userWallet.myAddr) {
      router.replace('/');
    }
  }, [isConnected, userWallet.myAddr, router]);

  const handleValidatorRowClick = (stakingAddress: string) => {
    if (userWallet.myAddr && stakingAddress.toLowerCase() === userWallet.myAddr.toLowerCase()) {
      router.push('/profile');
    } else {
      router.push(`/validators/${stakingAddress}`);
    }
  };

  const myDelegatedStakeWei = useMemo(() => {
    if (myPool) {
      return new BigNumber(0);
    }
    return myTotalStake || new BigNumber(0);
  }, [myPool, myTotalStake]);

  const myOutgoingDelegationsWei = useMemo(() => {
    return myCandidateStake || new BigNumber(0);
  }, [myCandidateStake]);

  const myPendingWithdrawWei = useMemo(() => {
    return stakedValidators.reduce(
      (sum, v) => sum.plus(new BigNumber(v.orderedWithdrawAmount ?? 0)),
      new BigNumber(0)
    );
  }, [stakedValidators]);

  // Number of proposals created by the user
  const myProposalsCreated = useMemo(() => {
    if (!allDaoProposals || !userWallet.myAddr) return 0;
    try {
      return allDaoProposals.filter(p => (p.proposer || '').toLowerCase() === userWallet.myAddr.toLowerCase()).length;
    } catch {
      return 0;
    }
  }, [allDaoProposals, userWallet.myAddr]);

  // Aggregate voting power of validators the user staked with
  const stakedWithVotingPowerPct = useMemo(() => {
    if (!totalDaoStake || totalDaoStake.isZero()) return new BigNumber(0);
    const sumStakeWei = stakedValidators.reduce((sum, v) => sum.plus(v.totalStake || 0), new BigNumber(0));
    return BigNumber(sumStakeWei).dividedBy(totalDaoStake).multipliedBy(100);
  }, [stakedValidators, totalDaoStake]);

  const hasValidator = Boolean(myPool);

  // Staker reward stats (used by "Staked With" tables in both views)
  useEffect(() => {
    if (!userWallet.myAddr || isPrivacyMode) return;
    setIsLoadingStakerStats(true);
    getCachedStakerRewardStats(userWallet.myAddr)
      .then(data => { if (data) setStakerRewardStats(data); })
      .catch(() => {})
      .finally(() => setIsLoadingStakerStats(false));
  }, [userWallet.myAddr, isPrivacyMode]);

  // Per-staked-validator node stats (used by "Staked With" tables in both views)
  useEffect(() => {
    if (!stakedValidators.length || isPrivacyMode) return;
    const addresses = stakedValidators.map(p => p.stakingAddress.toLowerCase());
    getCachedBatchNodeStats(addresses)
      .then(data => setStakerNodeStatsMap(data))
      .catch(() => {});
  }, [stakedValidators, isPrivacyMode]);

  // Validator reward stats (validator view)
  useEffect(() => {
    if (!hasValidator || !myPool?.stakingAddress || isPrivacyMode) return;
    setIsLoadingValidatorStats(true);
    getCachedNodeRewardStats(myPool.stakingAddress)
      .then(data => { if (data) setValidatorRewardStats(data); })
      .catch(() => {})
      .finally(() => setIsLoadingValidatorStats(false));
  }, [hasValidator, myPool?.stakingAddress, isPrivacyMode]);

  // Per-pool rewards 30d (used by "Staked With" tables in both views)
  useEffect(() => {
    if (!userWallet.myAddr || isPrivacyMode) return;
    getCachedStakerRewards30d(userWallet.myAddr)
      .then(map => setPerPoolRewards30d(map))
      .catch(() => {});
  }, [userWallet.myAddr, isPrivacyMode]);

  // Stats for all eligible candidates, used to rank topValidators by RpT30
  useEffect(() => {
    if (!eligibleTopValidators.length || isPrivacyMode) return;
    const addresses = eligibleTopValidators.map(p => p.stakingAddress.toLowerCase());
    getCachedBatchNodeStats(addresses)
      .then(data => setTopValidatorStatsMap(data))
      .catch(() => {});
  }, [eligibleTopValidators, isPrivacyMode]);

  // Daily reward series (validator view) — GET /node/:address/epoch-rewards/daily
  useEffect(() => {
    if (!hasValidator || !myPool?.stakingAddress || isPrivacyMode) return;
    setIsLoadingEpochRewards(true);
    getCachedNodeDailyRewards(myPool.stakingAddress, chartRange)
      .then(data => setDailyRewards(data))
      .catch(() => {})
      .finally(() => setIsLoadingEpochRewards(false));
  }, [hasValidator, myPool?.stakingAddress, isPrivacyMode, chartRange]);

  const rpt30DeltaPct = useMemo(() => {
    if (validatorRewardStats?.rpt30_delta == null || validatorRewardStats?.rpt30_prev30 == null) {
      return null;
    }
    const prev = validatorRewardStats.rpt30_prev30;
    if (prev === 0) return null;
    return (validatorRewardStats.rpt30_delta / prev) * 100;
  }, [validatorRewardStats]);

  // Monthly rewards (validator owner view): the validator owner share (VOS30, the
  // 20% owner reward) PLUS the rewards earned on the owner's own staked DMD.
  // The owner's own stake earns at the same rate as delegators (RpT30 is rewards
  // per 1,000 DMD), so own-stake reward ≈ rpt30 * (ownStakeDmd / 1000).
  const monthlyRewards30d = useMemo(() => {
    if (!validatorRewardStats) return null;
    const ownStakeDmd = BigNumber(myPool?.myStake || 0).dividedBy(1e18).toNumber();
    const ownStakeReward = (validatorRewardStats.rpt30 * ownStakeDmd) / 1000;
    return validatorRewardStats.vos30 + ownStakeReward;
  }, [validatorRewardStats, myPool?.myStake]);

  const validatorChartData = useMemo(() => mapDailyRewardsToChartPoints(dailyRewards), [dailyRewards]);

  const validatorChartElements = useMemo(() => {
    const elements: { type: 'area'; dataKey: string; name: string; color: string; yAxisId: 'left' | 'right'; dot: boolean; curveType: 'linear' }[] = [];
    if (chartShowPoolReward) {
      elements.push({ type: 'area', dataKey: 'totalReward', name: 'Pool reward', color: '#22c55e', yAxisId: 'right', dot: true, curveType: 'linear' });
    }
    if (chartShowOwnerShare) {
      elements.push({ type: 'area', dataKey: 'ownerReward', name: 'Owner share', color: '#f59e0b', yAxisId: 'right', dot: true, curveType: 'linear' });
    }
    if (chartShowRpt) {
      elements.push({ type: 'area', dataKey: 'rpt', name: 'RpT30', color: '#3a7bd5', yAxisId: 'left', dot: true, curveType: 'linear' });
    }
    return elements;
  }, [chartShowRpt, chartShowPoolReward, chartShowOwnerShare]);

  // APY (delegator view)
  const portfolioApy = useMemo(() => {
    if (!stakerRewardStats || !myTotalStake || BigNumber(myTotalStake).isZero()) return null;
    const rewards = BigNumber(stakerRewardStats.total_rewards_30d);
    const stakeInDmd = BigNumber(myTotalStake).dividedBy(1e18);
    return rewards.dividedBy(stakeInDmd).multipliedBy(12).multipliedBy(100);
  }, [stakerRewardStats, myTotalStake]);

  // Average RpT30 across staked validators
  const avgRpt30 = useMemo(() => {
    const entries = stakedValidators
      .map(v => stakerNodeStatsMap[v.stakingAddress.toLowerCase()]?.rpt30)
      .filter((v): v is number => v != null);
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + b, 0) / entries.length;
  }, [stakedValidators, stakerNodeStatsMap]);

  // Best validator by RpT30
  const bestValidator = useMemo(() => {
    return stakedValidators.reduce<{ addr: string; rpt30: number } | null>((best, v) => {
      const rpt30 = stakerNodeStatsMap[v.stakingAddress.toLowerCase()]?.rpt30;
      if (rpt30 == null) return best;
      if (!best || rpt30 > best.rpt30) return { addr: v.stakingAddress, rpt30 };
      return best;
    }, null);
  }, [stakedValidators, stakerNodeStatsMap]);

  // Determine current validator status
  const myValidatorStatus = useMemo(() => {
    if (!myPool) return null;
    const isActive = Boolean((myPool as any).isActive);
    const isValid = Boolean((myPool as any).isToBeElected || (myPool as any).isPendingValidator);
    if (isActive) return { label: 'Active', className: 'active' } as const;
    if (isValid) return { label: 'Valid', className: 'valid' } as const;
    return { label: 'Invalid', className: 'invalid' } as const;
  }, [myPool]);

  // Compute own validator stake and delegated stake for the current pool
  const totalStakeWei = BigNumber(myPool?.totalStake || 0);
  const myValidatorStakeWei = BigNumber(myPool?.myStake || 0);
  const delegatedStakeWei = BigNumber.max(totalStakeWei.minus(myValidatorStakeWei), 0);

  // Compute stake distribution percentages (own vs delegated)
  const ownStakePct = totalStakeWei.isGreaterThan(0)
    ? myValidatorStakeWei.multipliedBy(100).dividedBy(totalStakeWei)
    : new BigNumber(0);
  const delegatedStakePct = totalStakeWei.isGreaterThan(0)
    ? delegatedStakeWei.multipliedBy(100).dividedBy(totalStakeWei)
    : new BigNumber(0);

  const copyData = (data: string) => {
    copy(data);
    toast.success("Copied to clipboard");
  };

  const openValidator = (stakingAddress: string) => {
    router.push(`/validators/${stakingAddress}`);
  };

  return (
    <div>
        {/* Authenticated User View (Without Validator) */}
        <div id="authenticated-user-view" style={{display: hasValidator ? "none" : "block"}}>
          {/* User Information Section */}
          <section className="hero user-info-section">
            <div className="cosmic-grid"></div>
            <div className="cosmic-elements">
              <div className="glow glow-1"></div>
              <div className="glow glow-2"></div>
            </div>
            <div className="container">
              <div className="user-dashboard">
                <div className="user-info-card">
                  <div className="user-info-header">
                    <ProfileIdentityHeader address={userWallet.myAddr} activeName={walletDmdName} />
                    <Link href={`/dmd-names/${userWallet.myAddr}`} className="btn-primary btn-sm profile-dmd-names-btn">
                      My DMD Names
                    </Link>
                  </div>
                  
                  <div className="dp2-stats-bar">
                    <div className="dp2-stat-item">
                      <div className="dp2-stat-label">
                        Total Delegated Stake
                        <InfoTooltip content={<div><p>The total amount of DMD you've delegated across all validators.</p></div>}>
                          <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                        </InfoTooltip>
                      </div>
                      <div className="dp2-stat-value dp2-stat-value--teal">
                        {isPrivacyMode ? '—' : formatDmdFromWei(myDelegatedStakeWei)}
                      </div>
                      <div className="dp2-stat-sub">
                        across {stakedValidators.length} validator{stakedValidators.length !== 1 ? 's' : ''}
                        {!isPrivacyMode && myPendingWithdrawWei.isGreaterThan(0)
                          && ` · ${formatDmdFromWei(myPendingWithdrawWei)} ordered`}
                      </div>
                    </div>

                    <div className="dp2-stat-item dp2-stat-item--sep">
                      <div className="dp2-stat-label">
                        Total Rewards 30d
                        <InfoTooltip content={<div><p>Total DMD rewards earned from all your staked validators over the past 30 days.</p></div>}>
                          <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                        </InfoTooltip>
                      </div>
                      <div className="dp2-stat-value dp2-stat-value--teal">
                        {isPrivacyMode ? '—' : isLoadingStakerStats ? '...' : stakerRewardStats ? formatDmd(stakerRewardStats.total_rewards_30d) : '—'}
                      </div>
                      <div className="dp2-stat-sub">last 30d</div>
                    </div>

                    <div className="dp2-stat-item dp2-stat-item--sep">
                      <div className="dp2-stat-label">
                        Portfolio APY
                        <InfoTooltip content={<div><p>Historical annualized return based on the delegator rewards earned by your staking portfolio during the last 30 days. This value excludes validator owner reward shares and does not guarantee future rewards.</p></div>}>
                          <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                        </InfoTooltip>
                      </div>
                      <div className="dp2-stat-value dp2-stat-value--teal">
                        {isPrivacyMode ? '—' : isLoadingStakerStats ? '...' : formatApy(portfolioApy)}
                      </div>
                      <div className="dp2-stat-sub">estimated</div>
                    </div>

                    <div className="dp2-stat-item dp2-stat-item--sep">
                      <div className="dp2-stat-label">
                        Avg RpT30
                        <InfoTooltip content={<div><p>Average historical rewards earned per 1000 DMD across the validators you delegated to during the last 30 days. This value is based on delegator rewards only and excludes validator owner reward shares.</p></div>}>
                          <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                        </InfoTooltip>
                      </div>
                      <div className="dp2-stat-value dp2-stat-value--teal">
                        {isPrivacyMode ? '—' : formatRpt30(avgRpt30)}
                      </div>
                      <div className="dp2-stat-sub">per 1000 / 30d</div>
                    </div>

                    <div className="dp2-stat-item dp2-stat-item--sep dp2-stat-item--address">
                      <div className="dp2-stat-label">
                        Best Validator
                        <InfoTooltip content={<div><p>The validator you're staked with that has the highest RpT30 (rewards per 1,000 DMD / 30d).</p></div>}>
                          <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                        </InfoTooltip>
                      </div>
                      <div className="dp2-stat-value dp2-stat-value--teal dp2-stat-value--link dp2-stat-value--address">
                        {isPrivacyMode ? '—' : bestValidator
                          ? <Link href={`/validators/${bestValidator.addr}`} title={bestValidator.addr}>{truncateAddress(bestValidator.addr)}</Link>
                          : '—'}
                      </div>
                      <div className="dp2-stat-sub">
                        {!isPrivacyMode && bestValidator ? `RpT30: ${formatRpt30(bestValidator.rpt30, { unit: false })}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="dp2-card-actions">
                    <CreatePoolModal buttonText="Create pool" />
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* Staked With Section */}
          <section className="validators-staked">
            <div className="container">
              <div className="dp-section-header">
                <h2>Staked With</h2>
                {!isPrivacyMode && (
                  <button
                    onClick={() => setIsRewardsHistoryModalOpen(true)}
                    className="btn-secondary btn-sm dp2-rewards-history-btn"
                  >
                    <i className="fas fa-history" aria-hidden="true"></i>
                    History
                  </button>
                )}
              </div>
              <div className="table-container">
                <table className="validators-table">
                  <thead>
                    <tr>
                      <th>Validator</th>
                      {!isPrivacyMode && <th>RpT30</th>}
                      {!isPrivacyMode && <th>APY</th>}
                      {!isPrivacyMode && <th>AEP30</th>}
                      <th>Saturation</th>
                      <th>My Stake</th>
                      {!isPrivacyMode && <th>Rewards 30d</th>}
                      <th className="dp2-action-cell"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakedValidators.length > 0 ? (
                      stakedValidators.map((validator) => {
                        const stats = stakerNodeStatsMap[validator.stakingAddress.toLowerCase()];
                        const rewards30d = perPoolRewards30d[validator.stakingAddress.toLowerCase()];
                        const hasStake = BigNumber(validator.myStake ?? 0).isGreaterThan(0);
                        const isClaimable = isOrderClaimable(validator, stakingEpoch);
                        return (
                          <tr
                            key={validator.stakingAddress}
                            className="dp2-clickable-row"
                            onClick={() => openValidator(validator.stakingAddress)}
                          >
                            <td><ValidatorCell address={validator.stakingAddress} /></td>
                            {!isPrivacyMode && <td>{stats ? <Rpt30Cell rpt30={stats.rpt30} rpt30_delta={stats.rpt30_delta} /> : '—'}</td>}
                            {!isPrivacyMode && <td>{formatApy(stats?.estimated_apy)}</td>}
                            {!isPrivacyMode && <td>{stats ? <Aep30Badge aep30={stats.aep30} /> : '—'}</td>}
                            <td><SaturationBar totalStakeWei={validator.totalStake || '0'} /></td>
                            <td>
                              <div className="dp2-stake-cell">
                                <span>{hasStake ? formatDmdFromWei(validator.myStake ?? 0) : '—'}</span>
                                <OrderedStakeTag pool={validator} />
                              </div>
                            </td>
                            {!isPrivacyMode && <td className="dp2-rewards-cell">{formatDmd(rewards30d)}</td>}
                            <td className="dp2-action-cell" onClick={(e) => e.stopPropagation()}>
                              <div className="dp2-action-group">
                                {(hasStake || isClaimable) && <UnstakeModal buttonText="Unstake" pool={validator} />}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isPrivacyMode ? 4 : 8} style={{ textAlign: 'center', padding: '2rem' }}>
                          You haven't staked with any validators yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {stakedValidators.length > 0 && (
                    <tfoot>
                      <tr className="dp2-tfoot-row">
                        <td>
                          <span className="dp2-tfoot-count">
                            <i className="fas fa-chart-bar" aria-hidden="true"></i>
                            {' '}{stakedValidators.length} validator{stakedValidators.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        {!isPrivacyMode && <td></td>}
                        {!isPrivacyMode && <td></td>}
                        {!isPrivacyMode && <td></td>}
                        <td></td>
                        <td className="dp2-tfoot-total">
                          <span>Total Delegated:</span>{' '}
                          <strong>{isPrivacyMode ? '—' : formatDmdFromWei(myDelegatedStakeWei)}</strong>
                          {!isPrivacyMode && myPendingWithdrawWei.isGreaterThan(0) && (
                            <div className="dp2-tfoot-pending">
                              <span>Ordered:</span>{' '}
                              <strong>{formatDmdFromWei(myPendingWithdrawWei)}</strong>
                            </div>
                          )}
                        </td>
                        {!isPrivacyMode && (
                          <td className="dp2-tfoot-rewards">
                            <span>Total Rewards 30d:</span>{' '}
                            <strong className="dp2-tfoot-rewards-value">
                              {stakerRewardStats ? formatDmd(stakerRewardStats.total_rewards_30d) : '—'}
                            </strong>
                          </td>
                        )}
                        <td className="dp2-action-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </section>

          {/* Top Validators Section */}
          <section className="top-validators">
            <div className="container">
              <h2>Top Validators</h2>
              <div className="table-container">
                <table className="validators-table">
                  <thead>
                    <tr>
                      <th>Validator</th>
                      {!isPrivacyMode && <th>RpT30</th>}
                      {!isPrivacyMode && <th>APY</th>}
                      <th>Saturation</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topValidators.map((validator) => {
                      const stats = topValidatorStatsMap[validator.stakingAddress.toLowerCase()];
                      return (
                        <tr
                          key={validator.stakingAddress}
                          className={`validators-table-row${validator.stakingAddress === userWallet.myAddr ? " current-user" : ""}`}
                          onClick={() => handleValidatorRowClick(validator.stakingAddress)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <ValidatorCell
                              address={validator.stakingAddress}
                              subtext={validator.stakingAddress === userWallet.myAddr ? '(You)' : undefined}
                            />
                          </td>
                          {!isPrivacyMode && <td>{stats ? <Rpt30Cell rpt30={stats.rpt30} rpt30_delta={stats.rpt30_delta} /> : '—'}</td>}
                          {!isPrivacyMode && <td>{formatApy(stats?.estimated_apy)}</td>}
                          <td><SaturationBar totalStakeWei={validator.totalStake || '0'} /></td>
                          <td>{validator.score !== undefined && validator.score !== null ? formatCount(validator.score) : 'N/A'}</td>
                        </tr>
                      );
                    })}
                    {topValidators.length === 0 && (
                      <tr>
                        <td colSpan={isPrivacyMode ? 3 : 5} style={{ textAlign: 'center', padding: '2rem' }}>
                          No validator data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="validators-actions">
                <Link href="/validators" className="dp-view-all-link btn-primary">See the list <i className="fas fa-arrow-right"></i></Link>
              </div>
            </div>
          </section>
        </div>

        {/* Authenticated User View (With Validator) */}
        <div id="authenticated-validator-view" style={{display: hasValidator ? "block" : "none"}}>
          {/* User/Validator Information Section */}
          <section className="hero validator-info-section">
            <div className="cosmic-grid"></div>
            <div className="cosmic-elements">
              <div className="glow glow-1"></div>
              <div className="glow glow-2"></div>
            </div>
            <div className="container">
              <div className="validator-dashboard">
                <div className="validator-header">
                  <ProfileIdentityHeader
                    address={userWallet.myAddr}
                    activeName={walletDmdName}
                    wrapperClass="validator-identity"
                    statusBadge={
                      myValidatorStatus ? (
                        <span className={`status-badge ${myValidatorStatus.className}`}>
                          {myValidatorStatus.label}
                        </span>
                      ) : undefined
                    }
                  />
                  <Link href={`/dmd-names/${userWallet.myAddr}`} className="btn-primary btn-sm profile-dmd-names-btn">
                    My DMD Names
                  </Link>
                </div>
                
                <div className="combined-stake-card">
                  <div className="stake-card-header">
                    <h3>Validator Pool Overview <InfoTooltip content={<div><p>Summary of your total stake, combining your own validator stake and all delegations received.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></h3>
                    <div className="total-stake-value highlight">
                      {formatDmdFromWei(myPool?.totalStake || 0)}
                    </div>
                  </div>
                  
                  <div className="stake-breakdown">
                    <div className="stake-item">
                      <div className="stake-item-header">
                        <span className="stake-label">My validator stake <InfoTooltip content={<div><p>The amount of DMD you've personally staked as a validator in your own pool.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></span>
                        <span className="stake-value highlight">{formatDmdFromWei(myValidatorStakeWei)}</span>
                      </div>
                      <div className="stake-actions">
                        {
                          myPool && (
                            <>
                              {(myPool.isActive || myPool.isToBeElected || myPool.isPendingValidator) &&
                                BigNumber(myPool.totalStake ?? 0).isLessThan(BigNumber(50000).multipliedBy(10 ** 18)) &&
                                BigNumber(50000).multipliedBy(10 ** 18).minus(BigNumber(myPool.totalStake ?? 0)).isGreaterThanOrEqualTo(delegatorMinStake) && (
                                  <StakeModal buttonText="Stake" pool={myPool} />
                                )}
                              <UnstakeModal buttonText="Unstake" pool={myPool} />
                              {!isPrivacyMode && (
                                <button onClick={() => setIsValidatorStakeHistoryModalOpen(true)}  className="btn-secondary btn-sm">History</button>
                              )}
                              {myPool && (
                                <RemoveValidatorModal buttonText="Remove pool" pool={myPool} />
                              )}
                            </>
                          )
                        }
                      </div>
                    </div>
                    
                    <div className="stake-item">
                      <div className="stake-item-header">
                        <span className="stake-label">Delegated stake to my pool <InfoTooltip content={<div><p>The amount of DMD delegated to your pool by other users (excluding your own stake).</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></span>
                        <span className="stake-value highlight">{formatDmdFromWei(delegatedStakeWei)}</span>
                      </div>
                      {!isPrivacyMode && (
                        <button onClick={() => setIsDelegatedStakeHistoryModalOpen(true)}  className="btn-secondary btn-sm">History</button>
                      )}
                    </div>
                  </div>
                  
                  <div className="stake-distribution-section">
                    <div className="distribution-header">
                      <span className="distribution-label">Stake Distribution <InfoTooltip content={<div><p>Visual breakdown showing the ratio between your own stake and delegated stake in your validator pool.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></span>
                    </div>
                    <div className="stake-distribution">
                      <div className="stake-bar">
                          <div
                            className="own-stake"
                            title={`${formatPercent(ownStakePct)} own stake`}
                            style={{ width: `${ownStakePct.toFixed(4)}%` }}
                          />
                          <div
                            className="delegated-stake"
                            title={`${formatPercent(delegatedStakePct)} delegated`}
                            style={{ width: `${delegatedStakePct.toFixed(4)}%` }}
                          />
                      </div>
                      <div className="stake-labels">
                        <span className="own-stake-label">{formatPercent(ownStakePct)} own stake</span>
                        <span className="delegated-stake-label">{formatPercent(delegatedStakePct)} delegated</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Analytics section */}
                {!isPrivacyMode && (
                  <section className="vp-performance-section vp2-performance-section">
                <h2 className="vp2-section-title">
                  Performance Analytics
                  <InfoTooltip content={<div><p>Key reward and participation metrics for your validator over the last 30 days.</p></div>}>
                    <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                  </InfoTooltip>
                </h2>
                <div className="vp2-analytics-grid">
                  <div className="stat-card vp2-analytics-card">
                    <div className="stat-label">RpT30 <InfoTooltip content={<div><p>Historical staking rewards earned per 1000 DMD staked with this validator during the last 30 days. This value excludes the validator owner reward share and represents delegator-focused profitability.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                    <div className="stat-value highlight vp2-analytics-value">
                      {isLoadingValidatorStats ? '...' : formatRpt30(validatorRewardStats?.rpt30)}
                    </div>
                    <div className="vp2-analytics-sub">per 1000 / 30d</div>
                    {rpt30DeltaPct != null && (
                      <div className={`vp2-analytics-delta ${rpt30DeltaPct >= 0 ? 'vp2-delta-up' : 'vp2-delta-down'}`}>
                        {rpt30DeltaPct >= 0 ? '↑' : '↓'}{' '}
                        {rpt30DeltaPct >= 0 ? '+' : ''}
                        {formatPercent(Math.abs(rpt30DeltaPct))} vs previous 30d
                      </div>
                    )}
                    <div className="vp2-analytics-footer">Historical delegator profitability</div>
                  </div>
                  <div className="stat-card vp2-analytics-card">
                    <div className="stat-label">APY <InfoTooltip content={<div><p>Historical annualized return based on delegator rewards earned during the last 30 days. This value excludes the validator owner reward share and does not guarantee future rewards.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                    <div className="stat-value highlight vp2-analytics-value">
                      {isLoadingValidatorStats ? '...' : formatApy(validatorRewardStats?.estimated_apy)}
                    </div>
                    <div className="vp2-analytics-sub">estimated APY</div>
                    <div className="vp2-analytics-footer">Based on last 30d rewards</div>
                  </div>
                  <div className="stat-card vp2-analytics-card vp2-analytics-card--donut">
                    <div className="stat-label">AEP30 <InfoTooltip content={<div><p>Percentage of epochs during the last 30 days where this validator was part of the active validator set.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                    <div className="vp2-donut-wrap">
                      <Aep30Ring
                        aep30={validatorRewardStats?.aep30 ?? null}
                        isLoading={isLoadingValidatorStats}
                      />
                    </div>
                    <div className="vp2-analytics-sub">
                      {validatorRewardStats
                        ? `${validatorRewardStats.active_epoch_count} / ${validatorRewardStats.total_epochs_in_window} active epochs`
                        : 'active epochs'}
                    </div>
                    <div className="vp2-analytics-footer">Participation during last 30d</div>
                  </div>
                  <div className="stat-card vp2-analytics-card">
                    <div className="stat-label">VOS30 <InfoTooltip content={<div><p>Total validator owner rewards earned during the last 30 days from the 20% validator owner share.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                    <div className="stat-value highlight vp2-analytics-value">
                      {isLoadingValidatorStats ? '...' : formatDmd(validatorRewardStats?.vos30)}
                    </div>
                    <div className="vp2-analytics-sub">validator owner rewards</div>
                    <div className="vp2-analytics-footer">Last 30d (20% owner share)</div>
                  </div>
                </div>
                  </section>
                )}

                {/* Rewards Performance chart section */}
                {!isPrivacyMode && (
                  <section className="vp-rewards-chart-section vp2-rewards-performance">
                <div className="vp2-rewards-performance-header">
                  <div className="vp2-rewards-performance-title">
                    <h3>Rewards Performance</h3>
                    <InfoTooltip content={<div><p>Per-epoch reward per 1,000 DMD staked (approximated from epoch data).</p></div>}>
                      <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                    </InfoTooltip>
                  </div>
                  <div className="vp2-rewards-performance-controls">
                    <div className="vp2-legend-pills" role="group" aria-label="Chart series">
                      <button
                        type="button"
                        className={`vp2-legend-pill${chartShowRpt ? ' vp2-legend-pill--active' : ''}`}
                        onClick={() => setChartShowRpt((v) => !v)}
                      >
                        <span className="vp2-legend-dot vp2-legend-dot--rpt" aria-hidden="true" />
                        RpT30
                      </button>
                      <button
                        type="button"
                        className={`vp2-legend-pill${chartShowPoolReward ? ' vp2-legend-pill--active' : ''}`}
                        onClick={() => setChartShowPoolReward((v) => !v)}
                      >
                        <span className="vp2-legend-dot vp2-legend-dot--pool" aria-hidden="true" />
                        Pool reward
                      </button>
                      <button
                        type="button"
                        className={`vp2-legend-pill${chartShowOwnerShare ? ' vp2-legend-pill--active' : ''}`}
                        onClick={() => setChartShowOwnerShare((v) => !v)}
                      >
                        <span className="vp2-legend-dot vp2-legend-dot--owner" aria-hidden="true" />
                        Owner share
                      </button>
                    </div>
                    <div className="vp2-range-pills" role="group" aria-label="Chart range">
                      {(['30d', '1y', 'all'] as RewardsRange[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={`vp2-range-pill${chartRange === r ? ' vp2-range-pill--active' : ''}`}
                          onClick={() => setChartRange(r)}
                        >
                          {r === '30d' ? '30D' : r === '1y' ? '1Y' : 'All'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <ComposedChart
                  data={validatorChartData}
                  xAxisKey="date"
                  elements={validatorChartElements}
                  config={{ height: 260, margin: { top: 10, right: 20, left: 10, bottom: 0 } }}
                  showLegend={false}
                  yAxisLabel="RpT per 1000 DMD"
                  showSecondaryYAxis
                  secondaryYAxisLabel="DMD"
                  isLoading={isLoadingEpochRewards}
                  emptyMessage="No epoch data available"
                    />
                  </section>
                )}

                {/* Validator Statistics section */}
                <section className="vp2-validator-statistics">
              <h2 className="vp2-section-title">
                Validator Statistics
                <InfoTooltip content={<div><p>Operational and reward statistics for your validator pool.</p></div>}>
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h2>
              <div className="vp2-stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Pool rewards <InfoTooltip content={<div><p>Total rewards generated by this validator pool during the last 30 days. Rewards are split between the validator owner (20%) and all stakers (80%).</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                  <div className="stat-value highlight">
                    {isPrivacyMode ? '—' : isLoadingValidatorStats ? '...' : formatDmd(monthlyRewards30d)}
                  </div>
                  {!isPrivacyMode && (
                    <button onClick={() => setIsValidatorRewardsHistoryModalOpen(true)} className="btn-secondary btn-sm">History</button>
                  )}
                </div>

                <div className="stat-card">
                  <div className="stat-label">Node operator shared reward <InfoTooltip content={<div><p>The portion of the validator's 20% reward that is shared with a separate node operator.</p> <p>Useful when a node owner delegates technical operation to someone else but keeps ownership and voting rights. Configurable per pool (from 0.01% to 20%).</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                  <div className="stat-value highlight">{formatPercent(myPool?.poolOperatorShare ? BigNumber(myPool.poolOperatorShare).dividedBy(100) : null)}</div>
                  <div className="stat-note copy-address-container vp2-operator-address" title={myPool?.poolOperator || undefined}>
                    {myPool?.poolOperator ? truncateAddress(myPool.poolOperator) : '—'}
                  </div>
                  {myPool && <UpdatePoolOperatorModal buttonText="Edit" pool={myPool} />}
                </div>

                <div className="stat-card">
                  <div className="stat-label">Voting power <InfoTooltip content={<div><p>Voting power is the share of total DAO stake that your validator pool represents (your own stake + delegated stake).</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                  <div className="stat-value highlight">{myPool?.votingPower && myPool.votingPower.toString() !== 'NaN' ? formatPercent(myPool.votingPower) : '0.00%'}</div>
                  <div className="stat-note">Proposals created: {myProposalsCreated}</div>
                  {!isPrivacyMode && (
                    <button onClick={() => toast.info('Coming soon!')} className="btn-secondary btn-sm">History</button>
                  )}
                </div>

                <div className="stat-card">
                  <div className="stat-label">Score <InfoTooltip
                    placement="bottom"
                    content={
                      <div>
                        <p>The Bonus Score measures your validator's performance and uptime.</p>
                        <ul>
                          <li>Staying online and ready increases your score.</li>
                          <li>Downtime, missed key operations, or unavailability decrease it.</li>
                        </ul>
                        <p>Your selection chance for the next epoch is based on Stake × Bonus Score.</p>
                        <p>Scores range from 1 to 1000.</p>
                      </div>
                    }
                  >
                    <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                  </InfoTooltip></div>
                  <div className="stat-value highlight">{formatCount(myPool?.score)}</div>
                  <div className="cr-count">Connectivity reports: {myPool?.connectivityReport ?? '—'}<InfoTooltip content={<div><p>Number of detected connectivity issues for this validator.</p></div>}><i className="fas fa-info-circle info-icon" aria-hidden="true"></i></InfoTooltip></div>
                  {!isPrivacyMode && (
                    <button onClick={() => setIsBonusHistoryModalOpen(true)} className="btn-secondary btn-sm">History</button>
                  )}
                </div>
              </div>
                </section>
              </div>
            </div>
          </section>

          {/* Staked With Section */}
          <section className="validators-staked">
            <div className="container">
              <div className="dp-section-header">
                <h2>Staked With</h2>
                {!isPrivacyMode && (
                  <button
                    onClick={() => setIsRewardsHistoryModalOpen(true)}
                    className="btn-secondary btn-sm dp2-rewards-history-btn"
                  >
                    <i className="fas fa-history" aria-hidden="true"></i>
                    History
                  </button>
                )}
              </div>
              <div className="table-container">
                <table className="validators-table">
                  <thead>
                    <tr>
                      <th>Validator</th>
                      {!isPrivacyMode && <th>RpT30</th>}
                      {!isPrivacyMode && <th>APY</th>}
                      {!isPrivacyMode && <th>AEP30</th>}
                      <th>Saturation</th>
                      <th>My Stake</th>
                      {!isPrivacyMode && <th>Rewards 30d</th>}
                      <th className="dp2-action-cell"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakedValidators.length > 0 ? (
                      stakedValidators.map((validator) => {
                        const stats = stakerNodeStatsMap[validator.stakingAddress.toLowerCase()];
                        const rewards30d = perPoolRewards30d[validator.stakingAddress.toLowerCase()];
                        const hasStake = BigNumber(validator.myStake ?? 0).isGreaterThan(0);
                        const isClaimable = isOrderClaimable(validator, stakingEpoch);
                        return (
                          <tr
                            key={validator.stakingAddress}
                            className="dp2-clickable-row"
                            onClick={() => openValidator(validator.stakingAddress)}
                          >
                            <td><ValidatorCell address={validator.stakingAddress} /></td>
                            {!isPrivacyMode && <td>{stats ? <Rpt30Cell rpt30={stats.rpt30} rpt30_delta={stats.rpt30_delta} /> : '—'}</td>}
                            {!isPrivacyMode && <td>{formatApy(stats?.estimated_apy)}</td>}
                            {!isPrivacyMode && <td>{stats ? <Aep30Badge aep30={stats.aep30} /> : '—'}</td>}
                            <td><SaturationBar totalStakeWei={validator.totalStake || '0'} /></td>
                            <td>
                              <div className="dp2-stake-cell">
                                <span>{hasStake ? formatDmdFromWei(validator.myStake ?? 0) : '—'}</span>
                                <OrderedStakeTag pool={validator} />
                              </div>
                            </td>
                            {!isPrivacyMode && <td className="dp2-rewards-cell">{formatDmd(rewards30d)}</td>}
                            <td className="dp2-action-cell" onClick={(e) => e.stopPropagation()}>
                              <div className="dp2-action-group">
                                {(hasStake || isClaimable) && <UnstakeModal buttonText="Unstake" pool={validator} />}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isPrivacyMode ? 4 : 8} style={{ textAlign: 'center', padding: '2rem' }}>
                          You haven't staked with any validators yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {stakedValidators.length > 0 && (
                    <tfoot>
                      <tr className="dp2-tfoot-row">
                        <td>
                          <span className="dp2-tfoot-count">
                            <i className="fas fa-chart-bar" aria-hidden="true"></i>
                            {' '}{stakedValidators.length} validator{stakedValidators.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        {!isPrivacyMode && <td></td>}
                        {!isPrivacyMode && <td></td>}
                        {!isPrivacyMode && <td></td>}
                        <td></td>
                        <td className="dp2-tfoot-total">
                          <span>Total Delegated:</span>{' '}
                          <strong>{isPrivacyMode ? '—' : formatDmdFromWei(myOutgoingDelegationsWei)}</strong>
                          {!isPrivacyMode && myPendingWithdrawWei.isGreaterThan(0) && (
                            <div className="dp2-tfoot-pending">
                              <span>Ordered:</span>{' '}
                              <strong>{formatDmdFromWei(myPendingWithdrawWei)}</strong>
                            </div>
                          )}
                        </td>
                        {!isPrivacyMode && (
                          <td className="dp2-tfoot-rewards">
                            <span>Total Rewards 30d:</span>{' '}
                            <strong className="dp2-tfoot-rewards-value">
                              {stakerRewardStats ? formatDmd(stakerRewardStats.total_rewards_30d) : '—'}
                            </strong>
                          </td>
                        )}
                        <td className="dp2-action-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </section>

          {/* Top Validators Section */}
          <section className="top-validators">
            <div className="container">
              <h2>Top Validators</h2>
              <div className="table-container">
                <table className="validators-table">
                  <thead>
                    <tr>
                      <th>Validator</th>
                      {!isPrivacyMode && <th>RpT30</th>}
                      {!isPrivacyMode && <th>APY</th>}
                      <th>Saturation</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topValidators.map((validator) => {
                      const stats = topValidatorStatsMap[validator.stakingAddress.toLowerCase()];
                      return (
                        <tr
                          key={validator.stakingAddress}
                          className={`validators-table-row${validator.stakingAddress === userWallet.myAddr ? " current-user" : ""}`}
                          onClick={() => handleValidatorRowClick(validator.stakingAddress)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <ValidatorCell
                              address={validator.stakingAddress}
                              subtext={validator.stakingAddress === userWallet.myAddr ? '(You)' : undefined}
                            />
                          </td>
                          {!isPrivacyMode && <td>{stats ? <Rpt30Cell rpt30={stats.rpt30} rpt30_delta={stats.rpt30_delta} /> : '—'}</td>}
                          {!isPrivacyMode && <td>{formatApy(stats?.estimated_apy)}</td>}
                          <td><SaturationBar totalStakeWei={validator.totalStake || '0'} /></td>
                          <td>{validator.score !== undefined && validator.score !== null ? formatCount(validator.score) : 'N/A'}</td>
                        </tr>
                      );
                    })}
                    {topValidators.length === 0 && (
                      <tr>
                        <td colSpan={isPrivacyMode ? 3 : 5} style={{ textAlign: 'center', padding: '2rem' }}>
                          No validator data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="validators-actions">
                <Link href="/validators" className="dp-view-all-link btn-primary">See the list <i className="fas fa-arrow-right"></i></Link>
              </div>
            </div>
          </section>
        </div>

        {/* Modals */}
        <BonusScoreHistoryModal
          isOpen={isBonusHistoryModalOpen}
          onClose={() => setIsBonusHistoryModalOpen(false)}
          validatorAddress={userWallet.myAddr}
        />
        <StakeHistoryModal
          isOpen={isValidatorStakeHistoryModalOpen}
          onClose={() => setIsValidatorStakeHistoryModalOpen(false)}
          address={myPool?.stakingAddress || userWallet.myAddr}
          mode="node"
          delegatorFilter={false}
        />
        <StakeHistoryModal
          isOpen={isDelegatedStakeHistoryModalOpen}
          onClose={() => setIsDelegatedStakeHistoryModalOpen(false)}
          address={myPool?.stakingAddress || userWallet.myAddr}
          mode="node"
          delegatorFilter={true}
        />
        <StakeHistoryModal
          isOpen={isStakerHistoryModalOpen}
          onClose={() => setIsStakerHistoryModalOpen(false)}
          address={userWallet.myAddr}
          mode="staker"
        />
        <RewardsHistoryModal
          isOpen={isRewardsHistoryModalOpen}
          onClose={() => setIsRewardsHistoryModalOpen(false)}
          stakerAddress={userWallet.myAddr}
        />
        <NodeRewardsHistoryModal
          isOpen={isValidatorRewardsHistoryModalOpen}
          onClose={() => setIsValidatorRewardsHistoryModalOpen(false)}
          validatorAddress={myPool?.stakingAddress || userWallet.myAddr}
        />
    </div>
  );
}