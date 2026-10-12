'use client';

import '../Validators.css';
import './ValidatorDetails.css';
import '../../styles/proposal-status.css';
import '@/components/Charts/Charts.css';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, startTransition } from 'react';
import BigNumber from "bignumber.js";
import { truncateAddress, timestampToDate } from '@/utils/common';
import { useWeb3Context } from '@/contexts/Web3';
import { useStakingContext } from '@/contexts/Staking';
import { useDaoContext } from '@/contexts/DAO';
import { useIsPrivacyMode } from '@/contexts/PrivacyMode';
import StakeModal from '@/components/Modals/Stake/StakeModal';
import UnstakeModal from '@/components/Modals/Unstake/UnstakeModal';
import OrderedStakeTag, { isOrderClaimable } from '@/components/OrderedStakeTag';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import InfoTooltip from '@/components/InfoTooltip';
import { markdownToPlainText, markdownToSnippet } from '@/components/MarkdownText';
import { Aep30Ring } from '@/components/Aep30Badge';
import SaturationBar from '@/components/SaturationBar';
import ShareMenu from '@/components/Share';
import ComposedChart from '@/components/Charts/ComposedChart';
import BonusScoreHistoryModal from '@/components/Modals/BonusScoreHistory/BonusScoreHistoryModal';
import StakeHistoryModal from '@/components/Modals/StakeHistory/StakeHistoryModal';
import NodeRewardsHistoryModal from '@/components/Modals/NodeRewardsHistory/NodeRewardsHistoryModal';
import { getCachedNodeRewardStats, getCachedNodeDailyRewards } from '@/lib/rewardStatsCache';
import type { RewardsRange } from '@/lib/rewardStatsCache';
import { getDelegationStartDates } from '@/lib/delegationDates';
import { getValidatorCreationDate } from '@/lib/validatorCreation';
import type { DelegationStartDates } from '@/lib/delegationDates';
import { mapDailyRewardsToChartPoints } from '@/utils/rewardAggregation';
import type { NodeRewardStats, NodeDailyReward } from '@/types/rewards';
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses';
import { formatDmdName } from '@/utils/dmdNaming';
import { formatApy, formatCount, formatDmd, formatDmdFromWei, formatPercent, formatRpt30, formatSaturation } from '@/utils/format';


export default function ValidatorDetails() {
  const params = useParams();
  const router = useRouter();
  const address = params?.address as string;
  
  // Context hooks
  const { userWallet, web3Initialized, showLoader } = useWeb3Context();
  const { activeProposals, getMyVote, getActiveProposals } = useDaoContext();
  const { pools, stakingEpoch, delegatorMinStake, abandonedPools, stakesSyncedFor } = useStakingContext();
  const isPrivacyMode = useIsPrivacyMode();
  const dmdNames = useDmdNamesForAddresses(address ? [address] : []);
  const dmdName = address ? dmdNames[address.toLowerCase()] : null;
  const isAbandoned = !!address && !!abandonedPools[address.toLowerCase()];
  const isSyncingMyStakes = !!userWallet.myAddr && stakesSyncedFor !== userWallet.myAddr;

  // State
  const [pool, setPool] = useState<any | null>(null);
  const [filteredProposals, setFilteredProposals] = useState<any[]>([]);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [isBonusHistoryModalOpen, setIsBonusHistoryModalOpen] = useState(false);
  const [isStakeHistoryModalOpen, setIsStakeHistoryModalOpen] = useState(false);
  const [isDelegatedStakeHistoryModalOpen, setIsDelegatedStakeHistoryModalOpen] = useState(false);
  const [isRewardsHistoryModalOpen, setIsRewardsHistoryModalOpen] = useState(false);
  const [validatorRewardStats, setValidatorRewardStats] = useState<NodeRewardStats | null>(null);
  const [isLoadingValidatorStats, setIsLoadingValidatorStats] = useState(false);
  const [dailyRewards, setDailyRewards] = useState<NodeDailyReward[]>([]);
  const [isLoadingEpochRewards, setIsLoadingEpochRewards] = useState(false);
  const [chartRange, setChartRange] = useState<RewardsRange>('30d');
  const [chartShowRpt, setChartShowRpt] = useState(true);
  const [chartShowPoolReward, setChartShowPoolReward] = useState(true);
  const [chartShowOwnerShare, setChartShowOwnerShare] = useState(true);
  const [delegationStartDates, setDelegationStartDates] = useState<DelegationStartDates>({});
  const [creationTimestamp, setCreationTimestamp] = useState<number | null>(null);

  // Effects
  useEffect(() => {
    try {
      if (!activeProposals.length && web3Initialized) {
        showLoader(true, "");
        getActiveProposals();
      }
    } catch(err) {}
  }, [web3Initialized]);

  useEffect(() => {
    const foundPool = pools.find((pool) => pool.stakingAddress === address);
    setPool(foundPool || null);
  }, [address, pools, userWallet.myAddr]);

  useEffect(() => {
    if (!address) return;
    filterProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, activeProposals]);

  useEffect(() => {
    if (!address || isPrivacyMode) return;
    setIsLoadingValidatorStats(true);
    getCachedNodeRewardStats(address.toLowerCase())
      .then(data => { if (data) setValidatorRewardStats(data); })
      .catch(() => {})
      .finally(() => setIsLoadingValidatorStats(false));
  }, [address, isPrivacyMode]);

  useEffect(() => {
    if (!address || isPrivacyMode) return;
    setIsLoadingEpochRewards(true);
    getCachedNodeDailyRewards(address.toLowerCase(), chartRange)
      .then(data => setDailyRewards(data))
      .catch(() => {})
      .finally(() => setIsLoadingEpochRewards(false));
  }, [address, isPrivacyMode, chartRange]);

  useEffect(() => {
    if (!address || isPrivacyMode) {
      setDelegationStartDates({});
      return;
    }
    getDelegationStartDates(address)
      .then(dates => setDelegationStartDates(dates))
      .catch(() => {});
  }, [address, isPrivacyMode]);

  useEffect(() => {
    if (!address || isPrivacyMode) {
      setCreationTimestamp(null);
      return;
    }
    getValidatorCreationDate(address)
      .then(timestamp => setCreationTimestamp(timestamp))
      .catch(() => {});
  }, [address, isPrivacyMode]);

  // RpT30 change vs previous 30d as a percentage
  const rpt30DeltaPct = useMemo(() => {
    if (validatorRewardStats?.rpt30_delta == null || validatorRewardStats?.rpt30_prev30 == null) {
      return null;
    }
    const prev = validatorRewardStats.rpt30_prev30;
    if (prev === 0) return null;
    return (validatorRewardStats.rpt30_delta / prev) * 100;
  }, [validatorRewardStats]);

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

  // Pool stake breakdown: validator self stake vs delegated stake, plus the
  // connected user's own stake with this validator.
  const totalStakeWei = BigNumber(pool?.totalStake || 0);
  const selfStakeWei = BigNumber(pool?.ownStake || 0);
  const delegatedStakeWei = BigNumber.max(totalStakeWei.minus(selfStakeWei), 0);
  const myStakeWei = BigNumber(pool?.myStake || 0);
  const isClaimable = isOrderClaimable(pool, stakingEpoch);

  const maxPoolStakeWei = BigNumber(50000).multipliedBy(10 ** 18);
  const saturationPctNum = Math.min(Math.max(totalStakeWei.dividedBy(maxPoolStakeWei).multipliedBy(100).toNumber(), 0), 100);

  const stakePct = (partWei: BigNumber) =>
    totalStakeWei.isGreaterThan(0)
      ? partWei.multipliedBy(100).dividedBy(totalStakeWei)
      : new BigNumber(0);

  const selfStakePct = stakePct(selfStakeWei);
  const delegatedStakePct = stakePct(delegatedStakeWei);
  const myStakePct = stakePct(myStakeWei);

  const formatStakeDmd = (wei: BigNumber) => formatDmdFromWei(wei, { unit: false });

  const delegationSince = (delegatorAddress: string) => {
    if (isPrivacyMode) return '—';
    const timestamp = delegationStartDates[delegatorAddress?.toLowerCase()];
    return timestamp ? timestampToDate(String(timestamp)) : 'Unknown';
  };

  // Monthly rewards: validator owner share (VOS30) plus the rewards earned on the
  // validator's own staked DMD (own stake earns at the RpT30 rate per 1,000 DMD).
  const monthlyRewards30d = useMemo(() => {
    if (!validatorRewardStats) return null;
    const selfStakeDmd = selfStakeWei.dividedBy(10 ** 18).toNumber();
    const selfStakeReward = (validatorRewardStats.rpt30 * selfStakeDmd) / 1000;
    return validatorRewardStats.vos30 + selfStakeReward;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatorRewardStats, pool?.ownStake]);

  const proposalsCreatedCount = filteredProposals.filter(p => String(p.proposer || '').toLowerCase() === String(address || '').toLowerCase()).length;

  const validatorDisplayName = address ? (dmdName ? formatDmdName(dmdName) : truncateAddress(address)) : '';
  const validatorCreatedLabel = creationTimestamp ? timestampToDate(String(creationTimestamp)) : null;

  const shareTitle = dmdName
    ? `DMD Diamond validator - ${formatDmdName(dmdName)}`
    : address
      ? `DMD Diamond validator - ${address}`
      : 'DMD Diamond validator';

  // Functions
  async function filterProposals() {
    if (!activeProposals.length) return;

    const proposals = await Promise.all(
      activeProposals.map(async (proposal) => {
        let vote: any = null;
        try {
          vote = address ? await getMyVote(proposal.id, address) : null;
        } catch {
          vote = null;
        }

        const isProposer = String(proposal.proposer || '').toLowerCase() === String(address || '').toLowerCase();
        const hasVoted = !!vote && Number(vote.timestamp || 0) > 0 && (vote.vote === '0' || vote.vote === '1');

        if (isProposer || hasVoted) {
          return { ...proposal, myVote: hasVoted ? vote.vote : null };
        }

        return null;
      }),
    );

    const unique = new Map<string, any>();
    for (const p of proposals) {
      if (p && p.id) unique.set(String(p.id), p);
    }

    const list = Array.from(unique.values());
    list.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    setFilteredProposals(list);
  }

  const copyData = (data: string) => {
    copy(data);
    toast.success("Copied to clipboard");
  };

  const handleStakeClick = () => {
    setIsStakeModalOpen(true);
  };

  const handleUnstakeClick = () => {
    setIsUnstakeModalOpen(true);
  };

  const navigateToProposal = (proposalId: string) => {
    startTransition(() => {
      router.push(`/dao/details/${proposalId}`);
    });
  };

  // Loading state
  if (!address) {
    return <div>Loading...</div>;
  }

  return (
    <div className="validator-detail-page">
      <section className="validator-hero validator-hero--detail">
        <div className="cosmic-grid"></div>
        <div className="cosmic-elements">
          <div className="diamond diamond-1"></div>
          <div className="diamond diamond-2"></div>
          <div className="diamond diamond-3"></div>
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className="container">
          <div className="validator-hero-content">
            <div className="back-link">
              <a href="/validators" onClick={(e) => { e.preventDefault(); router.push('/validators'); }}>
                <i className="fas fa-arrow-left"></i> Back to Validators
              </a>
            </div>
            <div className="vd-detail-header">
              <div className="vd-detail-identity">
                <div className="vd-detail-avatar" aria-hidden="true"></div>
                <div className="vd-detail-id">
                  <div className="vd-detail-id-top">
                    <h1 id="validator-address" className="vd-detail-address">
                      {validatorDisplayName || 'Loading...'}
                    </h1>
                    <span id="validator-status-badge" className={`status-badge ${isAbandoned ? 'status-abandoned' : pool?.isActive ? 'status-active' : (pool?.isToBeElected || pool?.isPendingValidator) ? 'status-valid' : 'status-invalid'}`}>
                      {isAbandoned ? "Abandoned" : pool?.isActive ? "Active" : (pool?.isToBeElected || pool?.isPendingValidator) ? "Valid" : "Invalid"}
                    </span>
                    <div className="address-actions">
                      <button className="btn-icon" id="copy-address" title="Copy Address" onClick={() => copyData(address || "")}>
                        <i className="fas fa-copy"></i>
                      </button>
                      <a target="_blank" rel="noopener noreferrer" href={`https://explorer.bit.diamonds/address/${address}`}>
                        <button className="btn-icon" id="view-explorer" title="View in Explorer">
                          <i className="fas fa-external-link-alt"></i>
                        </button>
                      </a>
                      <ShareMenu
                        title={shareTitle}
                        variant="icon"
                        label="Share validator"
                        align="left"
                      />
                    </div>
                  </div>
                  <div className="vd-detail-meta">
                    {dmdName && (
                      <div className="vd-detail-address-sub" onClick={() => copyData(address || '')} title="Click to copy address">
                        {truncateAddress(address)}
                        <i className="fas fa-copy"></i>
                      </div>
                    )}
                    {validatorCreatedLabel && (
                      <div className="vd-detail-since">
                        <i className="fas fa-calendar-plus" aria-hidden="true"></i>
                        Validator since {validatorCreatedLabel}
                        <InfoTooltip
                          placement="bottom"
                          content={<p>Date this validator pool was created.</p>}
                        >
                          <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                        </InfoTooltip>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="vd-detail-totalpool">
                <div className="vd-detail-totalpool-value">{formatDmdFromWei(pool?.totalStake ?? 0)}</div>
                <div className="vd-detail-totalpool-label">Total pool stake</div>
              </div>
            </div>
          </div>
        </div>
      </section>

    <section className="validator-pool-overview">
      <div className="container">
        <div className="vd-section-title vd-section-title--analytics">
          <h2>
            Pool Overview
            <InfoTooltip
              placement="bottom"
              content={<p>Total amount of DMD staked on this validator, including both the validator’s own stake and delegated stake from others.</p>}
            >
              <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
            </InfoTooltip>
          </h2>
        </div>
        <div className="vd-pool-overview-grid">
          <div className="stat-card-wireframe fade-in">
            <div className="stat-header">
              <h3>
                Validator self stake
                <InfoTooltip
                  placement="bottom"
                  content={<span>Amount of DMD staked by the validator themselves, excluding delegations.</span>}
                >
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h3>
            </div>
            <p className="stat-value-large vd-pool-value">{formatStakeDmd(selfStakeWei)} DMD</p>
            {!isPrivacyMode && (
              <div className="stat-actions">
                <button
                  onClick={() => setIsStakeHistoryModalOpen(true)}
                  className="cta-button"
                  title="View validator stake history"
                >
                  History
                </button>
              </div>
            )}
          </div>

          <div className="stat-card-wireframe fade-in">
            <div className="stat-header">
              <h3>
                Delegated stake to this pool
                <InfoTooltip
                  placement="bottom"
                  content={<span>Total amount of DMD delegated to this validator by other users.</span>}
                >
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h3>
            </div>
            <p className="stat-value-large vd-pool-value">{formatStakeDmd(delegatedStakeWei)} DMD</p>
            {!isPrivacyMode && (
              <div className="stat-actions">
                <button
                  onClick={() => setIsDelegatedStakeHistoryModalOpen(true)}
                  className="cta-button"
                  title="View delegated stake history"
                >
                  History
                </button>
              </div>
            )}
          </div>

          <div className="stat-card-wireframe fade-in">
            <div className="stat-header">
              <h3>
                My stake with this validator
                <InfoTooltip
                  placement="bottom"
                  content={<span>Amount of DMD you have currently staked with this validator.</span>}
                >
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h3>
            </div>
            <p className="stat-value-large">{isSyncingMyStakes ? '…' : `${formatStakeDmd(myStakeWei)} DMD`}</p>
            <div className="vd-pool-sub">{isSyncingMyStakes ? '\u00a0' : `${formatPercent(myStakePct)} of pool`}</div>
            {!isSyncingMyStakes && userWallet.myAddr && <OrderedStakeTag pool={pool} className="vd-ordered" />}
            <div className="stat-actions vd-mystake-action">
              {!isSyncingMyStakes &&
              (pool?.isActive || pool?.isToBeElected || pool?.isPendingValidator) &&
              BigNumber(pool?.totalStake || 0).isLessThan(BigNumber(50000).multipliedBy(10**18)) &&
              BigNumber(50000).multipliedBy(10**18).minus(BigNumber(pool?.totalStake || 0)).isGreaterThanOrEqualTo(delegatorMinStake) &&
              userWallet.myAddr && pool && (
                <StakeModal
                  pool={pool}
                  buttonText="Delegate"
                />
              )}
              {!isSyncingMyStakes &&
              pool &&
              (myStakeWei.isGreaterThan(0) || isClaimable) &&
              userWallet.myAddr && (
                <UnstakeModal
                  pool={pool}
                  buttonText="Unstake"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="validator-stake-distribution">
      <div className="container">
        <div className="vd-section-title vd-section-title--analytics">
          <h2>
            Stake Distribution
            <InfoTooltip
              placement="bottom"
              content={<p>Visual breakdown showing the ratio between the validator’s own stake and delegated stake in this pool.</p>}
            >
              <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
            </InfoTooltip>
          </h2>
        </div>
        <div className="vd-panel">
          <div className="vd-dist-bar">
            <div className="vd-dist-self" style={{ width: `${selfStakePct.toFixed(4)}%` }} title={`${formatPercent(selfStakePct)} self stake`} />
            <div className="vd-dist-delegated" style={{ width: `${delegatedStakePct.toFixed(4)}%` }} title={`${formatPercent(delegatedStakePct)} delegated`} />
          </div>
          <div className="vd-dist-labels">
            <div className="vd-dist-label vd-dist-label--left">
              <div className="vd-dist-pct vd-dist-pct--self">{formatPercent(selfStakePct)} self stake</div>
              <div className="vd-dist-amount">{formatStakeDmd(selfStakeWei)} DMD</div>
            </div>
            <div className="vd-dist-label vd-dist-label--right">
              <div className="vd-dist-pct vd-dist-pct--delegated">{formatPercent(delegatedStakePct)} delegated stake</div>
              <div className="vd-dist-amount">{formatStakeDmd(delegatedStakeWei)} DMD</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {!isPrivacyMode && (
    <section className="validator-rewards-analytics">
      <div className="container">
        <div className="vd-section-title vd-section-title--analytics">
          <h2>Performance Analytics</h2>
          <p>Reward and participation metrics for this validator over the last 30 days</p>
        </div>
        <div className="vd-analytics-grid">
          <div className="stat-card-wireframe vd-analytics-card fade-in">
            <div className="stat-header">
              <h3>
                RpT30
                <InfoTooltip
                  placement="bottom"
                  content={<p>Historical staking rewards earned per 1000 DMD staked with this validator during the last 30 days. This value excludes the validator owner reward share and represents delegator-focused profitability.</p>}
                >
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h3>
            </div>
            <p className="stat-value-large vd-analytics-value">
              {isLoadingValidatorStats ? '...' : formatRpt30(validatorRewardStats?.rpt30)}
            </p>
            <div className="vd-analytics-sub">per 1000 / 30d</div>
            {rpt30DeltaPct != null && (
              <div className={`vd-analytics-delta ${rpt30DeltaPct >= 0 ? 'vd-delta-up' : 'vd-delta-down'}`}>
                {rpt30DeltaPct >= 0 ? '↑' : '↓'}{' '}
                {formatPercent(rpt30DeltaPct, { sign: true })} vs previous 30d
              </div>
            )}
            <div className="vd-analytics-footer">Historical delegator profitability</div>
          </div>

          <div className="stat-card-wireframe vd-analytics-card fade-in">
            <div className="stat-header">
              <h3>
                APY
                <InfoTooltip
                  placement="bottom"
                  content={<p>Historical annualized return based on delegator rewards earned during the last 30 days. This value excludes the validator owner reward share and does not guarantee future rewards.</p>}
                >
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h3>
            </div>
            <p className="stat-value-large vd-analytics-value">
              {isLoadingValidatorStats ? '...' : formatApy(validatorRewardStats?.estimated_apy)}
            </p>
            <div className="vd-analytics-sub">estimated APY</div>
            <div className="vd-analytics-footer">Based on last 30d rewards</div>
          </div>

          <div className="stat-card-wireframe vd-analytics-card vd-analytics-card--donut fade-in">
            <div className="stat-header">
              <h3>
                AEP30
                <InfoTooltip
                  placement="bottom"
                  content={<p>Percentage of epochs during the last 30 days where this validator was part of the active validator set.</p>}
                >
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h3>
            </div>
            <div className="vd-donut-wrap">
              <Aep30Ring
                aep30={validatorRewardStats?.aep30 ?? null}
                isLoading={isLoadingValidatorStats}
              />
            </div>
            <div className="vd-analytics-sub">
              {validatorRewardStats
                ? `${validatorRewardStats.active_epoch_count} / ${validatorRewardStats.total_epochs_in_window} active epochs`
                : 'active epochs'}
            </div>
            <div className="vd-analytics-footer">Participation during last 30d</div>
          </div>

          <div className="stat-card-wireframe vd-analytics-card fade-in">
            <div className="stat-header">
              <h3>
                VOS30
                <InfoTooltip
                  placement="bottom"
                  content={<p>Total validator owner rewards earned during the last 30 days from the 20% validator owner share.</p>}
                >
                  <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
                </InfoTooltip>
              </h3>
            </div>
            <p className="stat-value-large vd-analytics-value">
              {isLoadingValidatorStats ? '...' : formatDmd(validatorRewardStats?.vos30)}
            </p>
            <div className="vd-analytics-sub">validator owner rewards</div>
            <div className="vd-analytics-footer">Last 30d (20% owner share)</div>
          </div>
        </div>
      </div>
    </section>
    )}

    {!isPrivacyMode && (
    <section className="validator-rewards-chart">
      <div className="container">
        <div className="vd-rewards-performance-header">
          <div className="vd-rewards-performance-title">
            <h2>Rewards Performance</h2>
            <InfoTooltip
              placement="bottom"
              content={<p>Per-epoch reward per 1,000 DMD staked (approximated from epoch data).</p>}
            >
              <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
            </InfoTooltip>
          </div>
          <div className="vd-rewards-performance-controls">
            <div className="vd-legend-pills" role="group" aria-label="Chart series">
              <button
                type="button"
                className={`vd-legend-pill${chartShowRpt ? ' vd-legend-pill--active' : ''}`}
                onClick={() => setChartShowRpt((v) => !v)}
              >
                <span className="vd-legend-dot vd-legend-dot--rpt" aria-hidden="true" />
                RpT30
              </button>
              <button
                type="button"
                className={`vd-legend-pill${chartShowPoolReward ? ' vd-legend-pill--active' : ''}`}
                onClick={() => setChartShowPoolReward((v) => !v)}
              >
                <span className="vd-legend-dot vd-legend-dot--pool" aria-hidden="true" />
                Pool reward
              </button>
              <button
                type="button"
                className={`vd-legend-pill${chartShowOwnerShare ? ' vd-legend-pill--active' : ''}`}
                onClick={() => setChartShowOwnerShare((v) => !v)}
              >
                <span className="vd-legend-dot vd-legend-dot--owner" aria-hidden="true" />
                Owner share
              </button>
            </div>
            <div className="vd-range-pills" role="group" aria-label="Chart range">
              {(['30d', '1y', 'all'] as RewardsRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`vd-range-pill${chartRange === r ? ' vd-range-pill--active' : ''}`}
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
      </div>
    </section>
    )}

    <section className="validator-statistics">
      <div className="container">
        <div className="vd-section-title vd-section-title--analytics">
          <h2>Validator Statistics</h2>
        </div>
        <div className="vd-vstats-grid">
          <div className="vd-vstat-card stat-card-wireframe fade-in">
            <div className="vd-vstat-label">
              Pool rewards
              <InfoTooltip
                placement="bottom"
                content={<p>Total rewards generated by this validator pool during the last 30 days. Rewards are split between the validator owner (20%) and all stakers (80%).</p>}
              >
                <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
              </InfoTooltip>
            </div>
            <div className="vd-vstat-body">
              <div className="vd-vstat-value">
                {isPrivacyMode ? '—' : isLoadingValidatorStats ? '...' : formatDmd(monthlyRewards30d)}
              </div>
              <div className="vd-vstat-sub">Based on last 30d</div>
            </div>
            {!isPrivacyMode && (
              <div className="vd-vstat-action">
                <button
                  onClick={() => setIsRewardsHistoryModalOpen(true)}
                  className="cta-button"
                  id="rewards-history-button"
                >
                  History
                </button>
              </div>
            )}
          </div>

          <div className="vd-vstat-card stat-card-wireframe fade-in">
            <div className="vd-vstat-label">
              Voting power
              <InfoTooltip
                placement="bottom"
                content={<><p>Share of DAO voting influence held by this validator.</p><p>Voting power is based on total stake and affects how strongly a validator can influence governance proposals.</p></>}
              >
                <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
              </InfoTooltip>
            </div>
            <div className="vd-vstat-body">
              <div className="vd-vstat-value">{formatPercent(pool?.votingPower ?? 0)}</div>
              <div className="vd-vstat-sub">Proposals created: {proposalsCreatedCount}</div>
            </div>
            <div className="vd-vstat-action">
              <button onClick={() => toast.info('Coming soon!')} className="cta-button">History</button>
            </div>
          </div>

          <div className="vd-vstat-card stat-card-wireframe fade-in">
            <div className="vd-vstat-label">
              Score
              <InfoTooltip
                placement="bottom"
                content={<><p>Bonus Score earned by this validator through uptime and availability.</p> <p>Higher scores increase the chances of being selected for the active validator set in future epochs.</p></>}
              >
                <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
              </InfoTooltip>
            </div>
            <div className="vd-vstat-body">
              <div className="vd-vstat-value">{formatCount(pool?.score, '0')}</div>
              <div className="vd-vstat-sub">Based on network score</div>
            </div>
            {!isPrivacyMode && (
              <div className="vd-vstat-action">
                <button
                  onClick={() => setIsBonusHistoryModalOpen(true)}
                  className="cta-button"
                  title="View bonus score history"
                >
                  History
                </button>
              </div>
            )}
          </div>

          <div className="vd-vstat-card stat-card-wireframe fade-in">
            <div className="vd-vstat-label">
              Validator saturation
              <InfoTooltip
                placement="bottom"
                content={<p>Indicates how close the validator is to the maximum pool size. Higher saturation can reduce rewards due to max delegation limits and may influence validator election behavior, making this a useful signal when choosing where to stake.</p>}
              >
                <i className="fas fa-info-circle info-icon" aria-hidden="true"></i>
              </InfoTooltip>
            </div>
            <div className="vd-vstat-body">
              <div className="vd-vstat-value">{formatSaturation(saturationPctNum)} saturated</div>
              <div className="vd-vstat-sub">Based on total pool stake vs 50,000 DMD max</div>
            </div>
            <div className="vd-vstat-action">
              <SaturationBar totalStakeWei={pool?.totalStake || '0'} showLabel={false} size="lg" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="delegates-section">
      <div className="container">
        <div className="vd-section-title vd-section-title--analytics">
          <h2>Delegates</h2>
          <p>Users who have delegated their DMD to this validator</p>
        </div>
        <div className="delegates-table-container">
          <table className="delegates-table">
            <thead>
              {pool && pool.delegators && pool.delegators.length ? (
                <tr>
                  <th>Delegator <i className="fas fa-sort"></i></th>
                  <th>Delegated Stake <i className="fas fa-sort"></i></th>
                  <th>Percentage <i className="fas fa-sort"></i></th>
                  <th>Since <i className="fas fa-sort"></i></th>
                </tr>
              ) : (
                <tr>
                  <th>No Delegations</th>
                </tr>
              )}
            </thead>
            <tbody>
              {pool && pool.delegators && pool.delegators.length ? 
                pool.delegators.map((delegator: any, i: number) => {
                  const delegatedAmount = BigNumber(delegator.amount).dividedBy(10**18);
                  const totalStake = BigNumber(pool.totalStake).dividedBy(10**18);
                  const percentage = totalStake.isGreaterThan(0) ? delegatedAmount.dividedBy(totalStake).multipliedBy(100) : new BigNumber(0);
                  
                  return (
                    <tr key={i}>
                      <td>
                        <div className="delegate-address">
                          <div className="address-icon" style={{backgroundColor: `hsl(${(i * 137.5) % 360}, 50%, 50%)`}}></div>
                          <span>{truncateAddress(delegator.address)}</span>
                        </div>
                      </td>
                      <td>{formatDmd(delegatedAmount)}</td>
                      <td>{formatPercent(percentage)}</td>
                      <td>{delegationSince(delegator.address)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4}>No delegations found</td>
                  </tr>
                )
              }
            </tbody>
          </table>
        </div>
        {pool && pool.delegators && pool.delegators.length > 10 && (
          <div className="pagination">
            <button className="pagination-btn"><i className="fas fa-chevron-left"></i></button>
            <button className="pagination-btn active">1</button>
            <button className="pagination-btn">2</button>
            <button className="pagination-btn">3</button>
            <span className="pagination-ellipsis">...</span>
            <button className="pagination-btn">5</button>
            <button className="pagination-btn"><i className="fas fa-chevron-right"></i></button>
          </div>
        )}
      </div>
    </section>

    <section className="dao-section">
      <div className="container">
        <div className="vd-section-title vd-section-title--analytics">
          <h2>Validator DAO Participation</h2>
          <p>Governance proposals this validator has participated in</p>
        </div>
        <div className="dao-table-container">
          <table className="dao-table">
            <thead>
              {filteredProposals.length ? (
                <tr>
                  <th>Proposal <i className="fas fa-sort"></i></th>
                  <th>Description <i className="fas fa-sort"></i></th>
                  <th>Action <i className="fas fa-sort"></i></th>
                  <th>Date <i className="fas fa-sort"></i></th>
                </tr>
              ) : (
                <tr>
                  <th>No DAO Participations</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredProposals.length ?
                filteredProposals.map((proposal, i) => {
                  const isProposer = String(proposal.proposer || '').toLowerCase() === String(address || '').toLowerCase();
                  const hasVoted = proposal.myVote !== null && proposal.myVote !== undefined;
                  const votedYes = hasVoted && proposal.myVote === '1';
                  const votedNo = hasVoted && proposal.myVote === '0';

                  const title = markdownToPlainText(proposal.title);
                  const description = markdownToPlainText(proposal.description);

                  return (
                    <tr key={i} onClick={() => navigateToProposal(proposal.id)} className="clickable-row">
                      <td>
                        <div className="proposal-name">
                          <span className="vd-dao-title" title={title}>{title}</span>
                          {isProposer && (
                            <span className="creator-badge">
                              <i className="fas fa-user-edit"></i> Creator
                            </span>
                          )}
                        </div>
                      </td>
                      <td><span className="vd-dao-desc" title={description}>{markdownToSnippet(proposal.description) || '—'}</span></td>
                      <td>
                        {votedYes && (
                          <span className="vd-dao-action vd-dao-action--for">For</span>
                        )}
                        {votedNo && (
                          <span className="vd-dao-action vd-dao-action--against">Against</span>
                        )}
                        {!hasVoted && !isProposer && (
                          <span className="vd-dao-action vd-dao-action--none">Not Voted</span>
                        )}
                        {!hasVoted && isProposer && (
                          <span className="vd-dao-action vd-dao-action--creator">Creator</span>
                        )}
                      </td>
                      <td>{timestampToDate(proposal.timestamp)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4}>No DAO participations found</td>
                  </tr>
                )
              }
            </tbody>
          </table>
        </div>
        {filteredProposals.length > 10 && (
          <div className="pagination">
            <button className="pagination-btn"><i className="fas fa-chevron-left"></i></button>
            <button className="pagination-btn active">1</button>
            <button className="pagination-btn">2</button>
            <button className="pagination-btn"><i className="fas fa-chevron-right"></i></button>
          </div>
        )}
      </div>
    </section>

    {/* Modals */}
    <BonusScoreHistoryModal
      isOpen={isBonusHistoryModalOpen}
      onClose={() => setIsBonusHistoryModalOpen(false)}
      validatorAddress={address}
    />
    <StakeHistoryModal
      isOpen={isStakeHistoryModalOpen}
      onClose={() => setIsStakeHistoryModalOpen(false)}
      address={address}
      mode="node"
      delegatorFilter={false}
    />
    <StakeHistoryModal
      isOpen={isDelegatedStakeHistoryModalOpen}
      onClose={() => setIsDelegatedStakeHistoryModalOpen(false)}
      address={address}
      mode="node"
      delegatorFilter={true}
    />
    <NodeRewardsHistoryModal
      isOpen={isRewardsHistoryModalOpen}
      onClose={() => setIsRewardsHistoryModalOpen(false)}
      validatorAddress={address}
    />
</div>
  );
}
