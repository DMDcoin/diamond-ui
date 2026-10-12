"use client";

import "./dao.css";
import "../styles/proposal-status.css";
import React, { useEffect, useMemo, useState, startTransition } from "react";
import BigNumber from 'bignumber.js';
import { toast } from 'react-toastify';
import { useFadeInAnimation } from "@/hooks/useFadeInAnimation";
import { useRouter } from 'next/navigation';
import { useDaoContext } from '@/contexts/DAO';
import logger from '@/utils/logger';
import { useWeb3Context } from '@/contexts/Web3';
import { useStakingContext } from '@/contexts/Staking';
import { timestampToDate, truncateAddress } from '@/utils/common';
import { formatDmd, formatDmdFromWei, formatPercent } from '@/utils/format';
import InfoTooltip from '@/components/InfoTooltip';
import { markdownToPlainText } from '@/components/MarkdownText';
import ValidatorCell from '@/components/ValidatorCell';
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses';
import copy from 'copy-to-clipboard';

type ProposalType = "parameter" | "open" | "contract upgrade";

type Proposal = {
  id: string;
  date: string;
  creator: string;
  fullCreatorAddress?: string;
  creatorColor?: string;
  title: string;
  type: ProposalType | string;
  participation: number;
  exceeding: number;
  voted: boolean;
  status: string;
  state?: string;
  totalStakeSnapshot?: string;
  actionsNeeded?: boolean;
};

const initialProposals: Proposal[] = [];

export default function DaoPage() {
  useFadeInAnimation();

  const [localProposals] = useState<Proposal[]>(initialProposals);
  const [activeTab, setActiveTab] = useState<'currentPhase' | 'actionsNeeded'>('currentPhase');
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const [countdown, setCountdown] = useState({ days: "02", hours: "18", minutes: "45", seconds: "32" });

  // Modal state
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedVote, setSelectedVote] = useState<"Yes" | "No" | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState<boolean>(false);
  const [isMyPoolValid, setIsMyPoolValid] = useState<boolean>(true);
  const [votedByMe, setVotedByMe] = useState<Record<string, boolean>>({});
  const [voteModalProgressYesWidth, setVoteModalProgressYesWidth] = useState("0%");
  const [voteModalProgressNoWidth, setVoteModalProgressNoWidth] = useState("0%");
  const [voteModalThresholdLeft, setVoteModalThresholdLeft] = useState<string>("0%");
  const [voteModalStats, setVoteModalStats] = useState<any>(null);
  const [daoPotBalanceChange, setDaoPotBalanceChange] = useState<{
    changePercentage: string | null;
    absoluteChange?: string;
    direction: string;
    blocks: number;
  }>({
    changePercentage: "0.00",
    absoluteChange: "0.0000",
    direction: "neutral",
    blocks: 0
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Contexts
  const router = useRouter();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();

  // When web3 is ready, fetch DAO proposals
  useEffect(() => {
    try {
      if (!daoContext.activeProposals.length && web3Context.web3Initialized) {
        web3Context.showLoader(true, "");
        daoContext.getActiveProposals().then(() => { daoContext.getHistoricProposals(); web3Context.showLoader(false, ""); }).catch(() => web3Context.showLoader(false, ""));
      }
    } catch (err) {}
  }, [web3Context.web3Initialized]);

  const daoMappedProposals = useMemo(() => {
    const src = activeTab === 'currentPhase'
      ? daoContext.activeProposals.filter((proposal: any) => proposal.state !== "3")
      : daoContext.allDaoProposals.filter((proposal: any) => (
          proposal.state === "3" || proposal.state === "4"
        ));

    if (!src || !src.length) return [];

    return src.map((p: any) => {
      const fullAddress = p.proposer || p.proposerAddress || "";
      const mapped: Proposal = {
        id: p.id,
        date: (p.timestamp ? timestampToDate(p.timestamp) : new Date().toISOString().slice(0,10)),
        creator: truncateAddress(fullAddress),
        fullCreatorAddress: fullAddress,
        creatorColor: undefined,
        title: markdownToPlainText(p.title || (p.description ? String(p.description).split('\n')[0] : "")),
        type: (p.proposalType || p.rawProposalType || 'open').toLowerCase(),
        participation: Number(p.participation) || 0,
        exceeding: Number(p.exceedingYes) || 0,
        totalStakeSnapshot: p.totalStakeSnapshot || p.totalStakeSnapshot || '0',
        voted: false,
        status: daoContext.getStateString ? daoContext.getStateString(p.state) : (p.state || 'Unknown'),
        state: p.state,
        actionsNeeded: p.state === "3" || p.state === "4"
      };
      return mapped;
    });
  }, [daoContext.activeProposals, daoContext.allDaoProposals, activeTab, daoContext.daoPhase, daoContext.daoPhaseCount]);

  const creatorNames = useDmdNamesForAddresses(
    daoMappedProposals.map((p) => p.fullCreatorAddress || "").filter(Boolean)
  );

  // Reset voted map when wallet changes
  useEffect(() => {
    setVotedByMe({});
  }, [web3Context.userWallet?.myAddr]);

  // Load per-proposal voted status for current wallet
  useEffect(() => {
    let cancelled = false;
    async function loadVotedStatus() {
      try {
        const myAddr = web3Context.userWallet?.myAddr;
        if (!myAddr) return;
        const allIds: string[] = [
          ...(daoContext.activeProposals || []).map((p: any) => String(p.id)),
          ...(daoContext.allDaoProposals || []).map((p: any) => String(p.id))
        ];
        const uniqueIds = Array.from(new Set(allIds));
        const idsToFetch = uniqueIds.filter((id) => votedByMe[id] === undefined);
        if (!idsToFetch.length) return;

        const results = await Promise.all(idsToFetch.map(async (id) => {
          try {
            const vote = await daoContext.getMyVote(id, myAddr);
            return Number(vote?.timestamp) > 0;
          } catch {
            return false;
          }
        }));

        if (!cancelled) {
          const update: Record<string, boolean> = {};
          idsToFetch.forEach((id, idx) => { update[id] = !!results[idx]; });
          setVotedByMe((prev) => ({ ...prev, ...update }));
        }
      } catch {}
    }
    loadVotedStatus();
    return () => { cancelled = true; };
  }, [web3Context.userWallet?.myAddr, daoContext.activeProposals, daoContext.allDaoProposals, votedByMe]);

  const finalizeableProposalsCount = useMemo(() => {
    try {
      if (!daoContext?.allDaoProposals) return 0;
      return daoContext.allDaoProposals.filter((proposal: any) => proposal.state === "3").length;
    } catch {
      return 0;
    }
  }, [daoContext?.allDaoProposals]);

  const actionsNeededCount = useMemo(() => {
    try {
      if (!daoContext?.allDaoProposals) return 0;
      return daoContext.allDaoProposals.filter((proposal: any) => proposal.state === "3" || proposal.state === "4").length;
    } catch {
      return 0;
    }
  }, [daoContext?.allDaoProposals]);

  const votingPhase = useMemo(() => {
    const phase = daoContext?.daoPhase?.phase;
    return phase !== '0';
  }, [daoContext?.daoPhase?.phase]);

  const getDisplayStatus = (proposal: Proposal) => {
    if (proposal.status === 'Active' && votingPhase) {
      return 'Voting';
    }
    return proposal.status;
  };

  // Filter/sort/search derived list (prefer DAO data when present, otherwise fallback to local)
  const displayedProposals = useMemo(() => {
    let list: Proposal[];
    const daoHasAny = (daoContext.activeProposals && daoContext.activeProposals.length > 0) || (daoContext.allDaoProposals && daoContext.allDaoProposals.length > 0);

    if (daoMappedProposals && daoMappedProposals.length) {
      list = daoMappedProposals;
    } else if (daoContext.daoInitialized || daoHasAny) {
      list = [];
    } else {
      list = localProposals;
    }

    if (filterQuery) {
      if (filterQuery === 'unfinalized') {
        list = list.filter((p) => p.status === (daoContext.getStateString ? daoContext.getStateString('3') : '3'));
      } else if (filterQuery === 'myProposals') {
        const myAddr = web3Context.userWallet?.myAddr?.toLowerCase();
        if (myAddr) {
          list = list.filter((p: any) => (p.fullCreatorAddress && String(p.fullCreatorAddress).toLowerCase() === myAddr));
        }
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.creator.toLowerCase().includes(q));
    }

    if (filter !== "all") {
      list = list.filter((p) => String(p.type).toLowerCase().includes(filter.toLowerCase()));
    }

    if (sortField) {
      list = [...list].sort((a, b) => {
        let A: any = (a as any)[sortField as keyof Proposal];
        let B: any = (b as any)[sortField as keyof Proposal];
        if (sortField === "date") {
          A = new Date(a.date).getTime();
          B = new Date(b.date).getTime();
        }
        if (A < B) return sortAsc ? -1 : 1;
        if (A > B) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return list.map((p) => ({ ...p, voted: !!votedByMe[p.id] }));
  }, [daoMappedProposals, localProposals, filterQuery, search, filter, sortField, sortAsc, web3Context.userWallet, daoContext, votedByMe]);

  // Paginated proposals
  const paginatedProposals = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return displayedProposals.slice(startIndex, endIndex);
  }, [displayedProposals, currentPage]);

  const pageCount = Math.ceil(displayedProposals.length / PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, activeTab]);

  const handleDetailsClick = (proposalId: string) => {
    startTransition(() => {
      router.push(`/dao/details/${proposalId}`);
    });
  }

  useEffect(() => {
    function update() {
      try {
        const endSeconds = daoContext?.daoPhase?.end ? Number(daoContext.daoPhase.end) : 0;
        const endMs = endSeconds ? endSeconds * 1000 : 0;
        const nowMs = Date.now();
        const diff = endMs ? Math.max(0, endMs - nowMs) : 0;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown({ days: String(days).padStart(2, "0"), hours: String(hours).padStart(2, "0"), minutes: String(minutes).padStart(2, "0"), seconds: String(seconds).padStart(2, "0") });
      } catch (e) {}
    }

    update();
    const id = window.setInterval(update, 1000);
    return () => clearInterval(id);
  }, [daoContext?.daoPhase?.end]);

  // Check if my pool is valid
  useEffect(() => {
    let cancelled = false;
    async function checkPoolValidity() {
      try {
        if (web3Context.contractsManager?.stContract?.methods?.isPoolValid && web3Context.userWallet?.myAddr) {
          const res = await web3Context.contractsManager.stContract.methods.isPoolValid(web3Context.userWallet.myAddr).call();
          if (!cancelled) setIsMyPoolValid(!!res);
        } else {
          if (!cancelled) setIsMyPoolValid(true);
        }
      } catch {
        if (!cancelled) setIsMyPoolValid(true);
      }
    }
    checkPoolValidity();
    return () => { cancelled = true; };
  }, [web3Context.contractsManager?.stContract, web3Context.userWallet?.myAddr, web3Context.web3Initialized, stakingContext?.myPool]);

  // Fetch DAO pot balance change
  useEffect(() => {
    let cancelled = false;
    async function fetchBalanceChange() {
      try {
        if (daoContext.getDaoPotBalanceChange) {
          const res = await daoContext.getDaoPotBalanceChange(100);
          if (!cancelled && res) {
            setDaoPotBalanceChange(res as any);
          }
        }
      } catch (e) {
        logger.log("Error fetching DAO pot balance change:", e);
      }
    }
    fetchBalanceChange();
    return () => { cancelled = true; };
  }, [daoContext.allDaoProposals, daoContext.daoPhaseCount]);

  // Sorting toggle handler
  function onSort(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  function openVoteModal(p: Proposal) {
    setSelectedProposal(p);
    setSelectedVote(null);
    setVoteModalOpen(true);
    
    // Calculate voting progress bar widths
    (async () => {
      try {
        const proposalData = daoContext.activeProposals.find((ap: any) => ap.id === p.id) || 
                            daoContext.allDaoProposals.find((ap: any) => ap.id === p.id);
        
        if (proposalData && daoContext.getProposalVotingStats) {
          const votingStats = await daoContext.getProposalVotingStats(p.id);
          
          // Store voting stats for display
          setVoteModalStats({
            votingStats,
            proposalData,
            stakeForCalculation: (proposalData?.totalStakeSnapshot && proposalData.totalStakeSnapshot !== '0')
              ? proposalData.totalStakeSnapshot
              : stakingContext.totalDaoStake
          });
          
          const stakeForCalculation = (proposalData?.totalStakeSnapshot && proposalData.totalStakeSnapshot !== '0')
            ? proposalData.totalStakeSnapshot
            : stakingContext.totalDaoStake;
          
          const totalStake = BigNumber(stakeForCalculation || 0);
          const pos = BigNumber(votingStats?.positive || 0);
          const neg = BigNumber(votingStats?.negative || 0);
          
          if (totalStake.isGreaterThan(0)) {
            const exceedingYesPct = BigNumber.max(0, pos.minus(neg)).multipliedBy(100).dividedBy(totalStake).toNumber();
            const noPct = neg.multipliedBy(100).dividedBy(totalStake).toNumber();
            setVoteModalProgressYesWidth(`${Math.max(0, Math.min(100, exceedingYesPct))}%`);
            setVoteModalProgressNoWidth(`${Math.max(0, Math.min(100, noPct))}%`);
          } else {
            setVoteModalProgressYesWidth("0%");
            setVoteModalProgressNoWidth("0%");
          }
          
          const rawType = String(proposalData?.rawProposalType || '');
          const thresholdPercentage = daoContext.getProposalThreshold
            ? daoContext.getProposalThreshold(rawType || '0')
            : 0;
          setVoteModalThresholdLeft(`${thresholdPercentage}%`);
        } else {
          setVoteModalProgressYesWidth("0%");
          setVoteModalProgressNoWidth("0%");
          setVoteModalThresholdLeft("0%");
        }
      } catch (e) {
        setVoteModalProgressYesWidth("0%");
        setVoteModalProgressNoWidth("0%");
        setVoteModalThresholdLeft("0%");
      }
    })();
  }

  async function handleFinalizeClick(p: Proposal) {
    try {
      if (daoContext?.finalizeProposal) {
        await daoContext.finalizeProposal(p.id);
      }
    } catch (e) {}
  }

  async function handleExecuteClick(p: Proposal) {
    try {
      if (daoContext?.executeProposal) {
        await daoContext.executeProposal(p.id);
      }
    } catch (e) {}
  }

  function handleCreateProposalClick(e: React.MouseEvent) {
    e.preventDefault();
    if (finalizeableProposalsCount > 0) {
      setActiveTab('actionsNeeded');
      toast.warning('Please finalize existing proposals before creating a new one');
      // Scroll to proposals section
      setTimeout(() => {
        const proposalsSection = document.querySelector('.proposals-management');
        if (proposalsSection) {
          proposalsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      router.push('/dao/create');
    }
  }

  async function confirmVote() {
    if (!selectedVote || !selectedProposal || voteSubmitting) return;
    try {
      setVoteSubmitting(true);
      try {
        const isValid = web3Context.contractsManager?.stContract?.methods?.isPoolValid
          ? await web3Context.contractsManager.stContract.methods
              .isPoolValid(web3Context.userWallet?.myAddr)
              .call()
          : true;
        if (!isValid) {
          setVoteSubmitting(false);
          return;
        }
      } catch {}

      const voteValue = selectedVote === "Yes" ? 1 : 0;

      await daoContext.castVote((selectedProposal as any).id, voteValue, "");

      // Close modal and refresh proposals to reflect updated state
      setVoteModalOpen(false);
      // mark as voted for current wallet
      try {
        setVotedByMe((prev) => ({ ...prev, [String((selectedProposal as any).id)]: true }));
      } catch {}
      try {
        await daoContext.getActiveProposals();
        await daoContext.getHistoricProposals();
      } catch {}
    } catch (e) {} finally {
      setVoteSubmitting(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'actionsNeeded' && actionsNeededCount === 0) {
      setActiveTab('currentPhase');
    }
  }, [activeTab, actionsNeededCount]);

  return (
    <div className="dao-page">
      {/* Hero */}
      <section className="governance-hero">
        <div className="cosmic-grid" />
        <div className="cosmic-elements">
          <div className="diamond diamond-1" />
          <div className="diamond diamond-2" />
          <div className="diamond diamond-3" />
          <div className="glow glow-1" />
          <div className="glow glow-2" />
        </div>
        <div className="container">
          <div className="governance-hero-content">
            <h1 className="fade-in">Governance</h1>
            <div className="phase-indicator">
              <div className="phase-badge">
                <i className="fas fa-hourglass-half" /> Current Phase: {daoContext?.daoPhase?.phase === '0' ? 'Proposal' : 'Voting'}
              </div>
              <div className="phase-progress">
                <div className={`phase-step ${daoContext?.daoPhase?.phase === '0' ? 'active' : ''}`}>
                  <div className="step-dot" />
                  <span>Proposal</span>
                </div>
                <div className="phase-connector" />
                <div className={`phase-step ${daoContext?.daoPhase?.phase !== '0' ? 'active' : ''}`}>
                  <div className="step-dot" />
                  <span>Voting</span>
                </div>
                {/* <div className="phase-connector" />
                <div className="phase-step">
                  <div className="step-dot" />
                  <span>Execution</span>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
      </div>

      {/* Stats */}
      <section className="governance-stats">
        <div className="container">
          <div className="dao-stats-flex">
            <div className="dao-stat-card dao-phase-card">
              <div className="stat-header">
                <h3>DAO Phase</h3>
                <div className="stat-icon">
                  <i className="fas fa-calendar-alt" />
                </div>
              </div>
              <div className="stat-content">
                <p className="stat-value">
                  {daoContext?.daoPhase && daoContext.daoPhase.daoEpoch !== undefined
                    ? (daoContext.daoPhase.phase === '0'
                        ? `Proposal Phase ${daoContext.daoPhase.daoEpoch}`
                        : `Voting Phase ${daoContext.daoPhase.daoEpoch}`)
                    : 'DMD Governance'}
                </p>
                <div className="countdown-timer">
                  <div className="countdown-item">
                    <span className="countdown-value">{countdown.days}</span>
                    <span className="countdown-label">Days</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-value">{countdown.hours}</span>
                    <span className="countdown-label">Hours</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-value">{countdown.minutes}</span>
                    <span className="countdown-label">Minutes</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-value">{countdown.seconds}</span>
                    <span className="countdown-label">Seconds</span>
                  </div>
                </div>
                {
                  daoContext.daoPhase.phase === '0' && (
                    <button onClick={handleCreateProposalClick} className="btn-primary create-proposal-btn">
                      <i className="fas fa-plus-circle" /> Create Proposal
                    </button>
                  )
                }
              </div>
            </div>

            {stakingContext?.myPool ? (
              <div className="dao-stat-card voting-power-card">
                <div className="stat-header">
                  <h3>Voting Power</h3>
                  <div className="stat-icon">
                    <i className="fas fa-vote-yea" />
                  </div>
                </div>
                <div className="stat-content">
                  <p className="stat-value">{formatPercent(stakingContext.myPool.votingPower ?? 0)}</p>
                  <div className="stat-details">
                    <div className="detail-item">
                      <span className="detail-label">Pool Stake:</span>
                      <span className="detail-value">{formatDmdFromWei(stakingContext.myPool.ownStake ?? 0)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Stake:</span>
                      <span className="detail-value">{formatDmdFromWei(stakingContext.totalDaoStake ?? 0)}</span>
                    </div>
                  </div>
                  <div className="voting-power-bar">
                    <div className="power-progress" style={{ width: `${stakingContext.myPool.votingPower ? stakingContext.myPool.votingPower.toFixed(4) : 0}%` }} />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="dao-stat-card governance-pot-card">
              <div className="stat-header">
                <h3>
                  Governance Pot
                  <InfoTooltip
                    placement="bottom"
                    content={
                      <>
                        <p>Treasury pool used to fund DAO-approved proposals, ecosystem development, protocol upgrades, and governance-related initiatives.</p>
                        <p>The Governance Pot receives a percentage of epoch rewards before validator reward distribution.</p>
                      </>
                    }
                  >
                    <i className="fas fa-info-circle info-icon" aria-hidden="true" />
                  </InfoTooltip>
                </h3>
                <div className="stat-icon">
                  <i className="fas fa-coins" />
                </div>
              </div>
              <div className="stat-content">
                <p className="stat-value">{formatDmd(daoContext.governancePotBalance ?? 0)}</p>
                <div className={`stat-trend ${daoPotBalanceChange.direction === "neutral" ? "" : daoPotBalanceChange.direction}`}>
                  {daoPotBalanceChange.direction !== "neutral" && (
                    <i className={`fas ${daoPotBalanceChange.direction === "positive" ? "fa-arrow-up" : "fa-arrow-down"}`} />
                  )}
                  {daoPotBalanceChange.changePercentage !== null
                    ? `${formatPercent(daoPotBalanceChange.changePercentage, { sign: true })} since last ${daoPotBalanceChange.blocks} blocks`
                    : `${formatDmd(daoPotBalanceChange.absoluteChange, { sign: true })} since last ${daoPotBalanceChange.blocks} blocks`}
                </div>
                <div className="pot-distribution">
                  <div className="distribution-item">
                    <span className="distribution-label">
                      Low Majority Pot
                      <InfoTooltip
                        placement="bottom"
                        content={
                          <>
                            <p>Special treasury reserve used for proposals requiring lower governance participation thresholds.</p>
                            <p>Open proposals draw funds from the Low Majority Pot first before accessing the main Governance Pot.</p>
                          </>
                        }
                      >
                        <i className="fas fa-info-circle info-icon" aria-hidden="true" />
                      </InfoTooltip>
                    </span>
                    <span className="distribution-value">{formatDmd(daoContext.lowMajorityContractBalance ?? 0)}</span>
                    {/* <div className="distribution-bar">
                      <div className="distribution-progress community" style={{ width: `40%` }} />
                    </div> */}
                  </div>
                </div>
              </div>
            </div>

            <div className="dao-stat-card historic-proposals-card">
              <div className="stat-header">
                <h3>Historic Proposals</h3>
                <div className="stat-icon">
                  <i className="fas fa-history" />
                </div>
              </div>
              <div className="stat-content">
                <p className="stat-value">{daoContext.allDaoProposals ? daoContext.allDaoProposals.length : 0}</p>
                <div className="proposals-breakdown">
                  <div className="breakdown-item-dao">
                    <span className="breakdown-dot passed" />
                    <span className="breakdown-label">Passed:</span>
                    <span className="breakdown-value">{daoContext.allDaoProposals ? daoContext.allDaoProposals.filter(p => p.state === '4' || p.state === '6').length : 0}</span>
                  </div>
                  <div className="breakdown-item-dao">
                    <span className="breakdown-dot rejected" />
                    <span className="breakdown-label">Rejected:</span>
                    <span className="breakdown-value">{daoContext.allDaoProposals ? daoContext.allDaoProposals.filter(p => p.state === '5').length : 0}</span>
                  </div>
                </div>
                <button className="btn-outline view-history-btn" onClick={() => router.push('/dao/historic')}>
                  <i className="fas fa-external-link-alt" /> View History
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proposals Management */}
      <section className="proposals-management">
        <div className="container">
          <div className="proposals-controls">
            <div className="search-filter-group">
              <div className="search-container">
                <input id="proposal-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proposals..." />
                <button className="search-btn"><i className="fas fa-search" /></button>
              </div>
              <div className="filter-container">
                <select id="scope-filter" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="myProposals">My proposals</option>
                  <option value="unfinalized">Unfinalized</option>
                </select>
              </div>
              <div className="filter-container">
                <select id="proposal-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="open">Open</option>
                  <option value="open payout">Open payout</option>
                  <option value="contract fill">Contract fill</option>
                  <option value="contract upgrade">Contract upgrade</option>
                  <option value="parameter">Ecosystem parameter</option> 
                </select>
              </div>
            </div>
          </div>

          <div className="proposals-tabs">
            <button className={`tab-btn ${activeTab === "currentPhase" ? "active" : ""}`} data-tab="current" onClick={() => setActiveTab("currentPhase")}>Proposals of the current DAO phase</button>
            {actionsNeededCount > 0 && (
              <button className={`tab-btn ${activeTab === "actionsNeeded" ? "active" : ""}`} data-tab="actions" onClick={() => setActiveTab("actionsNeeded")}>Actions needed
                <span className="actionsNeededBadge">{actionsNeededCount}</span>
              </button>
            )}
          </div>

          <div className={`proposals-tab-content ${activeTab === "currentPhase" ? "active" : ""}`} id="current-tab">
            <div className="proposals-table-container">
              <table className="proposals-table">
                <thead>
                  <tr>
                    <th onClick={() => onSort("date")}>Date <i className={`fas ${sortField === "date" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                    <th onClick={() => onSort("creator")}>Created by <i className={`fas ${sortField === "creator" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                    <th onClick={() => onSort("title")}>Title <i className={`fas ${sortField === "title" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                    <th onClick={() => onSort("type")}>Type <i className={`fas ${sortField === "type" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                    <th onClick={() => onSort("participation")}>Participation <i className={`fas ${sortField === "participation" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                    <th onClick={() => onSort("exceeding")}>Exceeding Yes <i className={`fas ${sortField === "exceeding" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                    <th onClick={() => onSort("voted")}>Voted <i className={`fas ${sortField === "voted" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                    <th onClick={() => onSort("status")}>Status <i className={`fas ${sortField === "status" ? (sortAsc ? "fa-sort-up" : "fa-sort-down") : "fa-sort"}`} /></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProposals.map((p) => (
                    <tr key={p.id} onClick={() => handleDetailsClick(p.id)} style={{ cursor: 'pointer' }}>
                      <td>{p.date}</td>
                      <td>
                        {(() => {
                          const hash = (p.creator || "").split("").reduce((h, ch) => ch.charCodeAt(0) + ((h << 5) - h), 0);
                          const color = `#${(hash & 0x00ffffff).toString(16).padStart(6, "0")}`;
                          const creatorAddress = p.fullCreatorAddress || "";
                          return (
                            <div className="creator-address">
                              <div className="address-icon" style={{ backgroundColor: color }} />
                              {creatorAddress ? (
                                <ValidatorCell
                                  address={creatorAddress}
                                  name={creatorNames[creatorAddress.toLowerCase()]}
                                  onCopy={(addr) => { copy(addr); toast.success('Copied creator address'); }}
                                />
                              ) : (
                                <span>{p.creator}</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div className="proposal-title" title={p.title}><span>{p.title}</span></div>
                      </td>
                      <td><span className={`proposal-type ${(p.type || '').replace(/\s+/g, '-')}`}>{p.type === "community" ? "Open" : p.type}</span></td>
                      <td>
                        <div className="participation-bar">
                          <div className="participation-progress" style={{ width: `${p.participation}%` }} />
                          {(() => {
                            try {
                              const snap = (p as any).totalStakeSnapshot;
                              if (snap && snap !== '0') {
                                const tokens = BigNumber(snap).multipliedBy(Number(p.participation)).dividedBy(100).dividedBy(1e18).toFixed(2);
                                return <span className="participation-value">{formatPercent(p.participation)}</span>;
                              }
                            } catch (e) {logger.log("Error", e);}
                            return <span className="participation-value">{formatPercent(p.participation)}</span>;
                          })()}
                        </div>
                      </td>
                      <td><span className={`exceeding-value ${p.exceeding >= 0 ? "positive" : "negative"}`}>{formatPercent(p.exceeding, { sign: true })}</span></td>
                      <td><span className={`voted-status ${p.voted ? "voted" : "not-voted"}`}>{p.voted ? <i className="fas fa-check-circle" /> : <i className="fas fa-times-circle" />}</span></td>
                      {/* {votingPhase && isMyPoolValid && p.status !== (daoContext.getStateString ? daoContext.getStateString('1') : 'Canceled') && (
                        <td>
                          <button className="btn-vote" onClick={(e) => { e.stopPropagation(); openVoteModal(p); }}>
                            <i className="fas fa-vote-yea" /> Vote
                          </button>
                        </td>
                      )} */}
                      <td>
                        <span className={`proposal-status ${getDisplayStatus(p).toLowerCase()}`}>{getDisplayStatus(p)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`proposals-tab-content ${activeTab === "actionsNeeded" ? "active" : ""}`} id="actions-tab">
            <div className="proposals-table-container">
              <table className="proposals-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Created by</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Participation</th>
                    <th>Exceeding Yes</th>
                    <th>Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProposals
                    .filter((p) => p.state === '3' || p.state === '4')
                    .map((p) => (
                    <tr key={p.id} onClick={() => handleDetailsClick(p.id)} style={{ cursor: 'pointer' }}>
                      <td>{p.date}</td>
                      <td>
                        {(() => {
                          const hash = (p.creator || "").split("").reduce((h, ch) => ch.charCodeAt(0) + ((h << 5) - h), 0);
                          const color = `#${(hash & 0x00ffffff).toString(16).padStart(6, "0")}`;
                          const creatorAddress = p.fullCreatorAddress || "";
                          return (
                            <div className="creator-address">
                              <div className="address-icon" style={{ backgroundColor: color }} />
                              {creatorAddress ? (
                                <ValidatorCell
                                  address={creatorAddress}
                                  name={creatorNames[creatorAddress.toLowerCase()]}
                                  onCopy={(addr) => { copy(addr); toast.success('Copied creator address'); }}
                                />
                              ) : (
                                <span>{p.creator}</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div className="proposal-title" title={p.title}><span>{p.title}</span></div>
                      </td>
                      <td><span className={`proposal-type ${(p.type || '').replace(/\s+/g, '-')}`}>{p.type}</span></td>
                      <td>
                        <div className="participation-bar">
                          <div className="participation-progress" style={{ width: `${p.participation}%` }} />
                          {(() => {
                            try {
                              const snap = (p as any).totalStakeSnapshot;
                              if (snap && snap !== '0') {
                                const tokens = BigNumber(snap).multipliedBy(Number(p.participation)).dividedBy(100).dividedBy(1e18).toFixed(2);
                                return <span className="participation-value">{formatPercent(p.participation)}</span>;
                              }
                            } catch (e) {}
                            return <span className="participation-value">{formatPercent(p.participation)}</span>;
                          })()}
                        </div>
                      </td>
                      <td><span className={`exceeding-value ${p.exceeding >= 0 ? "positive" : "negative"}`}>{formatPercent(p.exceeding, { sign: true })}</span></td>
                      <td>
                        {p.state === '4' ? (
                          <button className="btn-vote" onClick={(e) => { e.stopPropagation(); handleExecuteClick(p); }}>
                            <i className="fas fa-play" /> Execute
                          </button>
                        ) : (
                          <button className="btn-vote" onClick={(e) => { e.stopPropagation(); handleFinalizeClick(p); }}>
                            <i className="fas fa-gavel" /> Finalize
                          </button>
                        )}
                      </td>
                      <td><span className={`proposal-status ${p.status.toLowerCase()}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty state */}
          {displayedProposals.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fas fa-file-alt" /></div>
              <h3>No proposals found</h3>
              <p>There are no proposals matching your search criteria.</p>
              {
                daoContext.daoPhase.phase === '0' && (
                  <button onClick={handleCreateProposalClick} className="btn-primary create-proposal-btn">
                    <i className="fas fa-plus-circle" /> Create Proposal
                  </button>
                )
              }
            </div>
          )}

          {displayedProposals.length > PAGE_SIZE && (
            <div className="pagination">
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-left" />
              </button>

              {(() => {
                const maxButtons = 7;
                const pages: number[] = [];
                let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                let end = start + maxButtons - 1;
                if (end > pageCount) {
                  end = pageCount;
                  start = Math.max(1, end - maxButtons + 1);
                }
                for (let i = start; i <= end; i++) pages.push(i);
                return (
                  <>
                    {start > 1 && (
                      <button className="pagination-btn" onClick={() => setCurrentPage(1)}>
                        1
                      </button>
                    )}
                    {start > 2 && <span className="pagination-ellipsis">...</span>}
                    {pages.map((pg) => (
                      <button
                        key={pg}
                        className={`pagination-btn ${pg === currentPage ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pg)}
                      >
                        {pg}
                      </button>
                    ))}
                    {end < pageCount - 1 && <span className="pagination-ellipsis">...</span>}
                    {end < pageCount && (
                      <button className="pagination-btn" onClick={() => setCurrentPage(pageCount)}>
                        {pageCount}
                      </button>
                    )}
                  </>
                );
              })()}

              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} 
                disabled={currentPage === pageCount}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Vote Modal */}
      <div id="vote-modal" className={`modal ${voteModalOpen ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setVoteModalOpen(false); }}>
        <div className="modal-content">
          <div className="dao-modal-header">
            <h3>Vote on Proposal</h3>
            <button className="close-modal" onClick={() => setVoteModalOpen(false)}><i className="fas fa-times" /></button>
          </div>
          <div className="dao-modal-body">
            {selectedProposal && (
              <>
                <div className="proposal-info">
                  <h4 id="vote-proposal-title">{selectedProposal.title}</h4>
                  <div className="proposal-meta-dao">
                    <span className={`proposal-type ${(selectedProposal.type || '').replace(/\s+/g, '-')}`}>{selectedProposal.type}</span>
                    <span className="proposal-date">Created on {selectedProposal.date}</span>
                  </div>
                  <div className="proposal-description">
                    <p>This proposal contains details and rationale for the requested change. Review and cast your vote below.</p>
                  </div>
                </div>

                <div className="voting-stats-dao">
                  <div className="voting-stat-dao">
                    <span className="stat-label">Current Results</span>
                    <div className="voting-progress-container">
                      <div
                        className="voting-progress-bar segmented"
                        style={{
                          ['--yes-width' as any]: voteModalProgressYesWidth,
                          ['--no-width' as any]: voteModalProgressNoWidth,
                          ['--threshold-left' as any]: voteModalThresholdLeft,
                        }}
                      >
                        <div className="bar-segments">
                          <div className="progress-yes" />
                          <div className="progress-no" />
                        </div>
                        <div className="threshold-line" />
                      </div>
                      <div className="voting-legend">
                        <span className="legend-item"><span className="legend-dot yes"></span> Exceeding yes (Yes - No)</span>
                        <span className="legend-item"><span className="legend-dot no"></span> No Votes</span>
                        <span className="legend-item"><span className="legend-dot threshold"></span> Acceptance Threshold</span>
                      </div>
                    </div>
                    {voteModalStats && (() => {
                      const totalBn = BigNumber(voteModalStats.votingStats?.total || 0);
                      const positiveBn = BigNumber(voteModalStats.votingStats?.positive || 0);
                      const negativeBn = BigNumber(voteModalStats.votingStats?.negative || 0);
                      const hasTotal = totalBn.isGreaterThan(0);

                      const yesPct = hasTotal
                        ? positiveBn.multipliedBy(100).dividedBy(totalBn)
                        : new BigNumber(0);
                      const noPct = hasTotal
                        ? negativeBn.multipliedBy(100).dividedBy(totalBn)
                        : new BigNumber(0);

                      return (
                        <div className="voting-stats" style={{ marginTop: '20px' }}>
                          <div className="stat-item total-stake">
                            Total stake: {formatDmdFromWei(totalBn)}
                          </div>
                          <div className="stat-item yes-votes">
                            Yes: {formatPercent(yesPct)}
                          </div>
                          <div className="stat-item no-votes">
                            No: {formatPercent(noPct)}
                          </div>
                          <div className="stat-divider" />
                          <div className="stat-item participation">
                            Exceeding Yes: {formatDmdFromWei(BigNumber.max(0, positiveBn.minus(negativeBn)))} ({formatPercent(parseFloat(String(voteModalProgressYesWidth)))} | {formatPercent(daoContext.getProposalThreshold(voteModalStats.proposalData?.rawProposalType))} required)
                          </div>
                          <div className="stat-item participation">
                            Participation:{" "}
                            {formatDmdFromWei(totalBn)} (
                            {formatPercent(totalBn.dividedBy(Number(voteModalStats.stakeForCalculation)).multipliedBy(100))} |{" "}
                            {formatPercent(daoContext.getProposalThreshold(voteModalStats.proposalData?.rawProposalType))} required)
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="vote-options">
                  <h4>Cast Your Vote</h4>
                  <div className="vote-buttons">
                    <button className={`vote-btn vote-yes ${selectedVote === "Yes" ? "selected" : ""}`} onClick={() => setSelectedVote("Yes")}><i className="fas fa-check-circle" /> Yes</button>
                    <button className={`vote-btn vote-no ${selectedVote === "No" ? "selected" : ""}`} onClick={() => setSelectedVote("No")}><i className="fas fa-times-circle" /> No</button>
                  </div>
                  <div className="voting-power-info">
                    <span>Your Voting Power: <strong>{formatPercent(stakingContext?.myPool?.votingPower ?? 0)}</strong></span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn-secondary close-modal" onClick={() => setVoteModalOpen(false)}>Cancel</button>
            <button className="btn-primary" id="confirm-vote" disabled={!selectedVote || voteSubmitting} onClick={confirmVote}>
              {voteSubmitting ? (<><i className="fas fa-spinner fa-spin" /> Submitting…</>) : 'Confirm Vote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

