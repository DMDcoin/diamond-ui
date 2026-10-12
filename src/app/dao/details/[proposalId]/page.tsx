"use client"

import "./proposal-details.css"
import "../../../styles/proposal-status.css";
import React, { useEffect, useMemo, useRef, useState } from "react"
import InfoTooltip from '@/components/InfoTooltip'
import MarkdownText, { hasMarkdownSyntax, markdownToPlainText } from '@/components/MarkdownText'
import Modal from '@/components/Modal'
import ShareMenu from '@/components/Share'
import ProposalVotes from '@/components/ProposalVotes'
import { usePathname } from 'next/navigation'
import BigNumber from 'bignumber.js'
import { useDaoContext } from '@/contexts/DAO'
import logger from '@/utils/logger';
import { useWeb3Context } from '@/contexts/Web3'
import { useStakingContext } from '@/contexts/Staking'
import { capitalizeFirstLetter, decodeCallData, extractValueFromCalldata, formatCryptoUnitValue, getFunctionInfoWithAbi, timestampToDate, truncateAddress } from '@/utils/common'
import { formatCount, formatDmd, formatDmdFromWei, formatPercent } from '@/utils/format'
import { getProposalImpact } from '@/constants/proposalImpacts'
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses'
import { formatDmdName } from '@/utils/dmdNaming'
import { toast } from 'react-toastify'
import copy from 'copy-to-clipboard'

interface UsernameModerationDetails {
  summary: string;
  username: string;
  ownerAddress: string;
  reasonCategory: string;
  evidenceNotes: string;
}

const USERNAME_MODERATION_SUFFIX = /\n\n---\nUsername: (.+)\nOwner Address: (.+)\nReason category: (.+)\nEvidence\/Notes: ([\s\S]*)$/;

function parseUsernameModerationDescription(description: string): UsernameModerationDetails | null {
  const match = description.match(USERNAME_MODERATION_SUFFIX);
  if (!match) return null;

  const [, username, ownerAddress, reasonCategory, evidenceNotes] = match;
  const summary = description.slice(0, match.index).trim().replace(/^description\s*[:\-]\s*/i, '');
  return {
    summary,
    username,
    ownerAddress,
    reasonCategory,
    evidenceNotes,
  };
}

function CollapsibleDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLElement | null>(null);
  const formatted = useMemo(() => hasMarkdownSyntax(text), [text]);

  useEffect(() => {
    const measure = () => {
      const el = contentRef.current;
      if (!el) return;
      // Only offer the toggle when the clamped text is actually cut off
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    if (!expanded) measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, expanded, formatted]);

  return (
    <>
      {formatted ? (
        <MarkdownText
          ref={(el) => { contentRef.current = el; }}
          text={text}
          className={expanded ? '' : 'clamped'}
        />
      ) : (
        <p ref={(el) => { contentRef.current = el; }} className={expanded ? '' : 'clamped'}>{text}</p>
      )}
      {(overflows || expanded) && (
        <button
          type="button"
          className="expand-btn description-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded
            ? (<><i className="fas fa-chevron-up" /> Show less</>)
            : (<><i className="fas fa-chevron-down" /> Show more</>)}
        </button>
      )}
    </>
  );
}

function ProposalDescription({ description, loaded = true }: { description: string; loaded?: boolean }) {
  const moderation = parseUsernameModerationDescription(description);

  if (!moderation) {
    if (!description.trim()) {
      if (!loaded) return null;
      return <p className="empty-description">No description was provided for this proposal.</p>;
    }
    return <CollapsibleDescription text={description} />;
  }

  return (
    <>
      {moderation.summary && (
        hasMarkdownSyntax(moderation.summary)
          ? <MarkdownText text={moderation.summary} />
          : <p>{moderation.summary}</p>
      )}
      <div className="target-address">
        <div className="label">Username</div>
        <div className="value">{moderation.username}</div>
      </div>
      <div className="target-address">
        <div className="label">Owner Address</div>
        <div className="value">{moderation.ownerAddress}</div>
      </div>
      <div className="target-address">
        <div className="label">Reason Category</div>
        <div className="value">{moderation.reasonCategory}</div>
      </div>
      <div className="target-address" style={{ marginBottom: 0 }}>
        <div className="label">Evidence / Notes</div>
        <div className="value">{moderation.evidenceNotes}</div>
      </div>
    </>
  );
}

export default function ProposalDetailsPage() {
  const [menuActive, setMenuActive] = useState(false)
  const [type, setType] = useState<"parameter-change" | "funding-request" | "contract-upgrade">("parameter-change")
  const [callDataCollapsed, setCallDataCollapsed] = useState(false)
  const [progressYesWidth, setProgressYesWidth] = useState("0%")
  const [progressNoWidth, setProgressNoWidth] = useState("0%")
  const [thresholdLeft, setThresholdLeft] = useState<string>("0%")
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)

  // contexts
  const daoContext = useDaoContext()
  const web3Context = useWeb3Context()
  const stakingContext = useStakingContext()

  // proposal-related state
  const [proposal, setProposal] = useState<any>({
    id: "",
    title: "",
    timestamp: "",
    proposer: "",
    description: "",
    state: "",
    proposalType: "",
    discussionUrl: "",
    targets: [],
    values: [],
    calldatas: [],
    totalStakeSnapshot: '0',
    rawProposalType: undefined
  })

  const proposerNames = useDmdNamesForAddresses(proposal?.proposer ? [proposal.proposer] : [])
  const proposerName = proposal?.proposer ? proposerNames[String(proposal.proposer).toLowerCase()] : null

  const [proposalState, setProposalState] = useState<string>("")
  const [myVote, setMyVote] = useState<any>(null)
  const [votingStats, setVotingStats] = useState<any>(null)
  const [voteReason, setVoteReason] = useState<string>("")
  const [dismissReason, setDismissReason] = useState<string>("")
  const [dismissProposal, setDismissProposal] = useState<boolean>(false)
  const [paramFunctionName, setParamFunctionName] = useState<string>("")
  const [paramDisplayName, setParamDisplayName] = useState<string>("")
  const [currentParamValue, setCurrentParamValue] = useState<string>("")
  const [proposedParamValue, setProposedParamValue] = useState<string>("")
  const [liveProposalFee, setLiveProposalFee] = useState<string | null>(null)

  const pathname = usePathname()
  const proposalId = (() => {
    if (!pathname) return undefined
    const segments = String(pathname).split('/').filter(Boolean)
    const detailsIndex = segments.indexOf('details')
    if (detailsIndex !== -1 && segments.length > detailsIndex + 1) {
      return segments[detailsIndex + 1]
    }
    return undefined
  })()

  useEffect(() => {
    try {
      const stakeForCalculation = (proposal?.totalStakeSnapshot && proposal.totalStakeSnapshot !== '0')
        ? proposal.totalStakeSnapshot
        : stakingContext.totalDaoStake

      const totalStake = BigNumber(stakeForCalculation || 0)
      const pos = BigNumber(votingStats?.positive || 0)
      const neg = BigNumber(votingStats?.negative || 0)

      if (totalStake.isGreaterThan(0)) {

        const exceedingYesPct = BigNumber.max(0, pos.minus(neg)).multipliedBy(100).dividedBy(totalStake).toNumber()
        const noPct = neg.multipliedBy(100).dividedBy(totalStake).toNumber()
        setProgressYesWidth(`${Math.max(0, Math.min(100, exceedingYesPct))}%`)
        setProgressNoWidth(`${Math.max(0, Math.min(100, noPct))}%`)
      } else {
        setProgressYesWidth("0%")
        setProgressNoWidth("0%")
      }

      const rawType = String(proposal?.rawProposalType || '')
      const thresholdPercentage = daoContext.getProposalThreshold
        ? daoContext.getProposalThreshold(rawType || '0')
        : 0
      setThresholdLeft(`${thresholdPercentage}%`)
    } catch (e) {
      setProgressYesWidth("0%")
      setProgressNoWidth("0%")
      setThresholdLeft("0%")
    }
  }, [votingStats, proposal?.totalStakeSnapshot, proposal?.proposalType, proposal?.rawProposalType, stakingContext.totalDaoStake])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const fee = await web3Context.contractsManager?.daoContract?.methods?.createProposalFee().call()
        if (!cancelled && fee !== undefined && fee !== null) setLiveProposalFee(String(fee))
      } catch (e) {}
    })()
    return () => { cancelled = true }
  }, [web3Context.contractsManager])

  // fetch proposal details and related data
  useEffect(() => {
    async function getProposalDetails(pid?: string) {
      if (!pid) return
      try {
        web3Context.showLoader?.(true, "Fetching proposal details")

        if (web3Context.userWallet?.myAddr && daoContext.getMyVote) {
          try { const mv = await daoContext.getMyVote(pid, web3Context.userWallet.myAddr); setMyVote(mv); } catch (e) {}
        }

        const stored = (daoContext.getCachedProposals ? daoContext.getCachedProposals() : []).filter((p: any) => p.id === pid)
        if (!stored || !stored.length) {
          if (daoContext.getHistoricProposalsEvents) await daoContext.getHistoricProposalsEvents()
        }

        // attempt to fetch proposal details via DAO context
        if (daoContext.getProposalDetails) {
          // small delay to allow RPC to update if needed
          setTimeout(() => {
            daoContext.getProposalDetails(pid).then((res: any) => {
              if (!res) {
                setProposal({})
                web3Context.showLoader?.(false, "")
                return
              }
              // set in local state
              setProposal(res)
              if (daoContext.setProposalsState) daoContext.setProposalsState([res])
              if (daoContext.setActiveProposals && daoContext.activeProposals) {
                daoContext.setActiveProposals(daoContext.activeProposals.map((p: any) => p.id === res.id ? res : p))
              }
              if (daoContext.getProposalVotingStats) {
                daoContext.getProposalVotingStats(res.id).then((stats: any) => setVotingStats(stats)).catch(() => {})
              }
              // fetch and attach timeline info
              if (daoContext.getProposalTimeline) {
                try {
                  daoContext.getProposalTimeline(res.id).then((tl: any) => {
                    if (tl) {
                      const updated = { ...res };
                      if (tl.createdAt) updated.createdAt = tl.createdAt;
                      if (tl.creationBlock) updated.creationBlock = tl.creationBlock;
                      if (tl.votingStartAt) updated.votingStartAt = tl.votingStartAt;
                      if (tl.votingEndAt) updated.votingEndAt = tl.votingEndAt;
                      if (tl.finalizedAt) updated.finalizedAt = tl.finalizedAt;
                      if (tl.finalizedResult) updated.finalizedResult = tl.finalizedResult;
                      if (tl.executedAt) updated.executedAt = tl.executedAt;
                      setProposal(updated);
                      if (daoContext.setProposalsState) daoContext.setProposalsState([updated]);
                    }
                  }).catch(() => {})
                } catch (e) {}
              }
              if (daoContext.getStateString) setProposalState(daoContext.getStateString(res.state))
              web3Context.showLoader?.(false, "")
            }).catch(() => { web3Context.showLoader?.(false, "") })
          }, 800)
        }
      } catch (err) {
        web3Context.showLoader?.(false, "")
      }
    }

    if (proposalId) getProposalDetails(proposalId)
  }, [proposalId, web3Context.userWallet?.myAddr, daoContext.daoPhase])

  useEffect(() => {
    try {
      const pt = String(proposal?.proposalType || proposal?.rawProposalType || '').toLowerCase()
      if (!pt) return
      if (pt.includes('ecosystem') || pt.includes('parameter')) {
        setType('parameter-change')
      } else if (pt.includes('contract')) {
        setType('contract-upgrade')
      } else {
        setType('funding-request')
      }
    } catch (e) {}
  }, [proposal?.proposalType, proposal?.rawProposalType])

  // Format parameter values based on the parameter/function
  const formatParameterValue = (fnName: string, displayName: string, rawValue: string): string => {
    try {
      const v = rawValue || '0'
      const name = (displayName || fnName || '').toLowerCase()
      // Specific formatting rules per parameter
      if (fnName === 'setStandByFactor' || name.includes('standby')) {
        return `${v}`
      }
      if (fnName === 'setGovernancePotShareNominator' || name.includes('governance pot share nominator')) {
        return formatPercent(v)
      }
      if (fnName === 'setReportDisallowPeriod' || name.includes('report disallow period')) {
        // seconds -> minutes
        return `${formatCount(Number(v) / 60)} minutes`
      }
      if (fnName === 'setBlockGasLimit' || name.includes('block gas limit')) {
        // show in mGas
        return `${formatCount(Number(v) / 10 ** 6)} mGas`
      }
      if (fnName === 'setMinimumGasPrice' || name.includes('minimum gas price')) {
        // show in Gwei
        return `${formatCount(Number(v) / 10 ** 9)} Gwei`
      }
      if (fnName === 'setCreateProposalFee' || name.includes('create proposal fee')) {
        return formatDmdFromWei(v)
      }
      if (fnName === 'setDelegatorMinStake' || name.includes('delegator min stake')) {
        return formatDmdFromWei(v)
      }
      if (fnName === 'setMintingFee' || name.includes('minting fee')) {
        return formatDmdFromWei(v)
      }
      // Fallback to crypto unit heuristic
      return formatCryptoUnitValue(v)
    } catch (e) {
      return rawValue
    }
  }

  // derive parameter name/function and compute current/proposed values
  useEffect(() => {
    (async () => {
      try {
        const target = proposal?.targets?.[0]
        const calldata = proposal?.calldatas?.[0]
        if (!target || !calldata) return

        let fnName = ''
        let displayName = ''
        try {
          const decoded: any = decodeCallData(web3Context.contractsManager, target, calldata)
          if (decoded && decoded['Function Name']) fnName = decoded['Function Name']
        } catch (e) {}
        try {
          const info = getFunctionInfoWithAbi(web3Context.contractsManager, target, calldata)
          displayName = info?.parameterName || ''
        } catch (e) {}
        setParamFunctionName(fnName)
        setParamDisplayName(displayName)

        // Proposed value extracted from calldata
        const rawProposed = extractValueFromCalldata(calldata)
        setProposedParamValue(formatParameterValue(fnName, displayName, rawProposed))

        // Fetch current value based on the function
        let currentRaw: string | null = null
        if (fnName === 'setCreateProposalFee') {
          currentRaw = await web3Context.contractsManager.daoContract.methods.createProposalFee().call()
        } else if (fnName === 'setDelegatorMinStake') {
          currentRaw = await web3Context.contractsManager.stContract?.methods.delegatorMinStake().call() || '0'
        } else if (fnName === 'setMinimumGasPrice') {
          currentRaw = await web3Context.contractsManager.tpContract?.methods.minimumGasPrice().call() || '0'
        } else if (fnName === 'setBlockGasLimit') {
          currentRaw = await web3Context.contractsManager.tpContract?.methods.blockGasLimit().call() || '0'
        } else if (fnName === 'setReportDisallowPeriod') {
          currentRaw = await web3Context.contractsManager.ctContract?.methods.reportDisallowPeriod().call() || '0'
        } else if (fnName === 'setGovernancePotShareNominator') {
          const nom = await web3Context.contractsManager.brContract?.methods.governancePotShareNominator().call() || '0'
          const denom = await web3Context.contractsManager.brContract?.methods.governancePotShareDenominator().call() || '100'
          try {
            setCurrentParamValue(formatPercent(BigNumber(nom).multipliedBy(100).dividedBy(denom)))
          } catch (e) {
            setCurrentParamValue(formatPercent(nom))
          }
          return
        } else if (fnName === 'setStandByFactor') {
          currentRaw = await web3Context.contractsManager.bsContract?.methods.standByFactor().call() || '0'
        } else if (fnName === 'setMintingFee') {
          currentRaw = await web3Context.contractsManager.diamondRegistryContract?.methods.mintingFee().call() || '0'
        }

        // No reader wired up for a parameter — show it as unknown rather than as zero
        setCurrentParamValue(currentRaw === null ? '—' : formatParameterValue(fnName, displayName, currentRaw))
      } catch (e) {
        setCurrentParamValue('—')
      }
    })()
  }, [proposal?.targets, proposal?.calldatas, web3Context.contractsManager])

  // interaction handlers
  const handleDismissProposal = async () => {
    if (!proposal?.id) return
    if (daoContext.dismissProposal) {
      try {
        await daoContext.dismissProposal(proposal.id, dismissReason)
        // Close the modal
        setDismissProposal(false)
        setDismissReason("")
        
        // Refetch proposal details
        if (daoContext.getProposalDetails) {
          const updatedProposal = await daoContext.getProposalDetails(proposal.id)
          if (updatedProposal) {
            setProposal(updatedProposal)
            // Update state string
            if (daoContext.getStateString) {
              setProposalState(daoContext.getStateString(updatedProposal.state))
            }
            // Update proposals in cache
            if (daoContext.setProposalsState) {
              daoContext.setProposalsState([updatedProposal])
            }
            if (daoContext.setActiveProposals && daoContext.activeProposals) {
              daoContext.setActiveProposals(
                daoContext.activeProposals.map((p: any) => p.id === updatedProposal.id ? updatedProposal : p)
              )
            }
          }
        }
        
        // Refetch voting stats
        if (daoContext.getProposalVotingStats && proposal.id) {
          const updatedStats = await daoContext.getProposalVotingStats(proposal.id)
          if (updatedStats) {
            setVotingStats(updatedStats)
          }
        }
        
        // Refetch timeline info
        if (daoContext.getProposalTimeline && proposal.id) {
          const tl = await daoContext.getProposalTimeline(proposal.id)
          if (tl) {
            setProposal((prev: any) => {
              const updated = { ...prev }
              if (tl.createdAt) updated.createdAt = tl.createdAt
              if (tl.creationBlock) updated.creationBlock = tl.creationBlock
              if (tl.votingStartAt) updated.votingStartAt = tl.votingStartAt
              if (tl.votingEndAt) updated.votingEndAt = tl.votingEndAt
              if (tl.finalizedAt) updated.finalizedAt = tl.finalizedAt
              if (tl.finalizedResult) updated.finalizedResult = tl.finalizedResult
              if (tl.executedAt) updated.executedAt = tl.executedAt
              return updated
            })
          }
        }
      } catch (e) {
        logger.error("Failed to dismiss proposal:", e)
      }
    }
  }

  const handleCastVote = async (vote: number) => {
    if (!proposal?.id) return
    try {
      // check pool validity if available
      const isValid = web3Context.contractsManager?.stContract?.methods?.isPoolValid ? await web3Context.contractsManager.stContract.methods.isPoolValid(web3Context.userWallet?.myAddr) : true
      if (!isValid) return
      if (daoContext.castVote) {
        await daoContext.castVote(proposal.id, vote, voteReason)
        // Refresh vote status, voting stats and proposal details after a successful vote
        if (daoContext.getMyVote && web3Context.userWallet?.myAddr) {
          daoContext.getMyVote(proposal.id, web3Context.userWallet.myAddr).then((mv: any) => setMyVote(mv)).catch(() => {})
        }
        if (daoContext.getProposalVotingStats) {
          daoContext.getProposalVotingStats(proposal.id).then((stats: any) => setVotingStats(stats)).catch(() => {})
        }
        if (daoContext.getProposalDetails) daoContext.getProposalDetails(proposal.id).then((res: any) => setProposal(res)).catch(() => {})
      }
    } catch (e) {}
  }

  const handleProposalFinalization = async (pid?: string) => {
    if (!pid) return
    if (daoContext.finalizeProposal) {
      const res = await daoContext.finalizeProposal(pid)
      if (res === 'success' && daoContext.getProposalDetails) daoContext.getProposalDetails(pid).then((r: any) => setProposal(r)).catch(() => {})
    }
  }

  const handleProposalExecution = async (pid?: string) => {
    if (!pid) return
    if (daoContext.executeProposal) {
      const res = await daoContext.executeProposal(pid)
      if (res === 'success' && daoContext.getProposalDetails) daoContext.getProposalDetails(pid).then((r: any) => setProposal(r)).catch(() => {})
    }
  }

  const shareTitle = useMemo(() => {
    const title = markdownToPlainText(proposal?.title || '').trim()
    return title ? `DMD Diamond DAO proposal: ${title}` : 'DMD Diamond DAO proposal'
  }, [proposal?.title])

  const proposalFeeLabel = useMemo(() => {
    const fee = liveProposalFee ?? daoContext?.proposalFee
    if (fee === undefined || fee === null || fee === '') return '—'
    try {
      const amount = BigNumber(fee).dividedBy(1e18)
      if (!amount.isFinite()) return '—'
      return formatDmd(amount)
    } catch (e) {
      return '—'
    }
  }, [liveProposalFee, daoContext?.proposalFee])

  const proposalAccepted = (proposalType: string, positive: BigNumber, negative: BigNumber) => {
    const thresholdPercentage = daoContext.getProposalThreshold ? daoContext.getProposalThreshold(proposalType) : 0
    const stakeForCalculation = (proposal?.totalStakeSnapshot && proposal.totalStakeSnapshot !== '0') ? proposal.totalStakeSnapshot : stakingContext.totalDaoStake
    const threshold = BigNumber(stakeForCalculation || 0).multipliedBy(thresholdPercentage).dividedBy(100)
    const hasSufficientVotes = positive.minus(negative).isGreaterThanOrEqualTo(threshold)
    const hasRequiredParticipation = votingStats?.total ? BigNumber(votingStats.total).isGreaterThanOrEqualTo(threshold) : false
    return hasSufficientVotes && hasRequiredParticipation
  }

  const copyData = async (data: string, e?: React.MouseEvent) => {
    try { await navigator.clipboard.writeText(data); if (e && e.currentTarget) { const el = e.currentTarget as HTMLElement; el.classList.add('copied'); setTimeout(() => el.classList.remove('copied'), 2000); } } catch (err) {}
  }

  // copy handler
  const handleCopy = async (text: string, e?: React.MouseEvent) => {
    try {
      copy(text)
      const trigger = (e?.currentTarget || null) as HTMLElement | null
      if (trigger) {
        trigger.classList.add("copied")
        setTimeout(() => trigger.classList.remove("copied"), 2000)
      }
      toast.success("Copied creator address")
    } catch (err) {
      logger.error("copy failed", err)
    }
  }

  // progress tooltip mouse move
  const handleProgressMouseMove = (e: React.MouseEvent) => {
    const bar = progressBarRef.current
    const tooltip = tooltipRef.current
    if (!bar || !tooltip) return
    const rect = bar.getBoundingClientRect()
    let x = e.clientX - rect.left
    if (x < 0) x = 0
    if (x > rect.width) x = rect.width
    const left = Math.max(0, Math.min(rect.width - 200, x - 0))
    tooltip.style.left = `${left}px`
  }

  return (
    <div className="proposal-details-page-root">
      <section className="proposal-hero">
        <div className="cosmic-grid"></div>
        <div className="cosmic-elements">
          <div className="diamond diamond-1" />
          <div className="diamond diamond-2" />
          <div className="diamond diamond-3" />
          <div className="glow glow-1" />
          <div className="glow glow-2" />
        </div>
        <div className="container">
          <div className="proposal-hero-content">
            <div className="proposal-breadcrumb">
              <a href="/dao">Governance</a>
              <i className="fas fa-chevron-right" />
              <span>Proposal Details</span>
            </div>
            <div className="proposal-header">
              <h1 id="proposal-title">{markdownToPlainText(proposal?.title || '')}</h1>
              <div className="proposal-meta">
                <div className="proposal-date">
                  <i className="fas fa-calendar" /> Date: {proposal?.timestamp ? timestampToDate(proposal.timestamp) : ''}
                </div>
                <div className={`proposal-status ${(proposalState || 'Executed').toLowerCase().replace(/[^a-z]/g, '')}`}>
                  <i className="fas fa-check-circle" /> {proposalState || 'Executed'}
                </div>
                <ShareMenu title={shareTitle} variant="pill" label="Share" align="left" />
                {web3Context.userWallet?.myAddr === proposal?.proposer &&
                  proposal?.state === '0' &&
                  daoContext.daoPhase?.phase === '0' && (
                    <button className="dismiss-proposal-btn" onClick={() => setDismissProposal(true)}>
                      <i className="fas fa-times" /> Dismiss
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proposal-details">
        <div className="container">
          <div className="proposal-grid">
            <div className="proposal-info">
              <div className="proposal-card creator-card">
                <div className="card-header"><h3>Created By</h3></div>
                <div className="card-content">
                  <div className="creator-address">
                    <div className="address-icon" style={{ backgroundColor: "#3a7bd5" }} />
                    {proposerName ? (
                      <div className="creator-identity">
                        <span className="creator-name">{formatDmdName(proposerName)}</span>
                        <span className="creator-address-row">
                          <span className="address-text">{truncateAddress(String(proposal?.proposer || ''))}</span>
                          <button className="copy-btn" onClick={(e) => handleCopy(String(proposal?.proposer || ''), e)}>
                            <i className="fas fa-copy" />
                          </button>
                          <div className="copy-tooltip">Copied!</div>
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="address-text">{proposal?.proposer || '0x8F3c7D138e6F5b9D6F9D4c4e4c8D2D8D2D9D2b'}</span>
                        <button className="copy-btn" onClick={(e) => handleCopy(String(proposal?.proposer || ''), e)}>
                          <i className="fas fa-copy" />
                        </button>
                        <div className="copy-tooltip">Copied!</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="proposal-card description-card" id="description-content">
                <div className="card-header"><h3>Description</h3></div>
                <div className="card-content">
                  <div className="parameter-description">
                    <ProposalDescription description={proposal?.description || ''} loaded={Boolean(proposal?.id)} />
                  </div>
                </div>
              </div>

              <div className={`proposal-card parameter-change-card ${type !== "parameter-change" ? "hidden" : ""}`} id="parameter-change-content">
                <div className="card-header"><h3>Parameter Change</h3></div>
                <div className="card-content">
                  <div className="parameter-name"><h4>{(() => {
                    try {
                      if (proposal?.proposalType === 'Ecosystem Parameter Change' && proposal?.calldatas && proposal.calldatas[0]) {
                        return paramDisplayName || 'Parameter Change'
                      }
                    } catch (e) {}
                    return 'Parameter Change'
                  })()}</h4></div>
                  <div className="parameter-comparison">
                    <div className="parameter-current">
                      <div className="label">Current</div>
                      <div className="value">{currentParamValue || ''}</div>
                    </div>
                    <div className="parameter-arrow">→</div>
                    <div className="parameter-proposed">
                      <div className="label">Proposed</div>
                      <div className="value">{proposedParamValue || ''}</div>
                    </div>
                  </div>
                  <div className="parameter-fee">
                    <span className="label">Proposal fee:</span>
                    <span className="value">{proposalFeeLabel}</span>
                    <InfoTooltip placement="bottom" content={<span>Fee to create a proposal. Refunded if approved.</span>}>
                      <i className="fas fa-info-circle info-icon" aria-hidden="true" />
                    </InfoTooltip>
                  </div>
                  {(() => {
                    const impactData = getProposalImpact(paramFunctionName);
                    if (!impactData) return null;
                    
                    return (
                      <div className="parameter-impact">
                        <h4>Impact Assessment</h4>
                        {impactData.effects.map((effect, index) => (
                          <div key={index} className="impact-item">
                            <div className={`impact-icon ${effect.type}`}>
                              {effect.type === 'positive' ? '+' : '-'}
                            </div>
                            <div className="impact-text">
                              <p>{effect.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {type === "funding-request" && proposal?.targets?.[0] !== '0x0000000000000000000000000000000000000000' && (
                <div className="proposal-card funding-request-card" id="funding-request-content">
                  <div className="card-header"><h3>Funding Request</h3></div>
                  <div className="card-content">
                    {proposal?.targets?.map((target: string, index: number) => {
                      if (target === '0x0000000000000000000000000000000000000000') return null
                      return (
                        <div key={index} className="funding-details" style={{ marginBottom: index < (proposal.targets?.length || 0) - 1 ? '20px' : '0', paddingBottom: '20px', borderBottom: index < (proposal.targets?.length || 0) - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
                          {proposal.targets.length > 1 && <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--accent)' }}>Transaction {index + 1}</div>}
                          <div className="payout-address">
                            <span className="label">Payout Address</span>
                            <div className="address-container">{target}</div>
                          </div>
                          <div className="payout-amount">
                            <span className="label">Amount</span>
                            <div className="value">{formatDmdFromWei(proposal?.values?.[index] ?? 0)}</div>
                          </div>
                        </div>
                      )
                    })}
                    <div className="parameter-fee" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <span className="label">Proposal fee:</span>
                      <span className="value">{proposalFeeLabel}</span>
                      <InfoTooltip placement="bottom" content={<span>Fee to create a proposal. Refunded if approved.</span>}>
                        <i className="fas fa-info-circle info-icon" aria-hidden="true" />
                      </InfoTooltip>
                    </div>
                  </div>
                </div>
              )}

              <div className={`proposal-card contract-upgrade-card ${type !== "contract-upgrade" ? "hidden" : ""}`} id="contract-upgrade-content">
                <div className="card-header"><h3>Contract Upgrade</h3></div>
                <div className="card-content">
                  {proposal?.targets?.map((target: string, index: number) => (
                    <div key={index} className="technical-details" style={{ marginBottom: index < (proposal.targets?.length || 0) - 1 ? '30px' : '0', paddingBottom: '20px', borderBottom: index < (proposal.targets?.length || 0) - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
                      {proposal.targets.length > 1 && <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--accent)' }}>Transaction {index + 1}</div>}
                      <div className="target-address">
                        <div className="label">Target</div>
                        <div className="value">{target || '0xdef...456'}</div>
                      </div>
                      {proposal?.values && proposal.values[index] && proposal.values[index] !== '0' && (
                        <div className="payout-amount">
                          <span className="label">Requested Amount</span>
                          <div className="value">{formatDmdFromWei(proposal.values[index])}</div>
                        </div>
                      )}
                      <div className="call-data">
                        <button id={`expand-call-data-${index}`} className="expand-btn" onClick={() => setCallDataCollapsed(!callDataCollapsed)}>
                          {callDataCollapsed ? (<><i className="fas fa-chevron-down"></i> Expand</>) : (<><i className="fas fa-chevron-up"></i> Collapse</>) }
                        </button>
                        <div className={`call-data-content ${callDataCollapsed ? "collapsed" : ""}`}>
                          {(() => {
                            const calldata = proposal?.calldatas?.[index]
                            if (!calldata || calldata === '0x') return <pre className="code-block"><code>No call data for this transaction</code></pre>
                            try {
                              const res = target ? decodeCallData(web3Context.contractsManager, target, calldata) : {}
                              if (res && Object.keys(res).length > 0) {
                                return Object.entries(res).map(([k, v]) => (<div key={k}><strong>{capitalizeFirstLetter(k)}:</strong> {String(v)}</div>))
                              }
                            } catch (e) {}
                            // Signature isn't in the target contract's current ABI, so fall back to raw
                            return <pre className="code-block"><code>{calldata}</code></pre>
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const impactData = getProposalImpact(paramFunctionName);
                    if (!impactData) return null;
                    
                    return (
                      <div className="parameter-impact" style={{ marginTop: '30px' }}>
                        <h4>Impact Assessment</h4>
                        <div className="impact-title">{impactData.title}</div>
                        {impactData.effects.map((effect, index) => (
                          <div key={index} className="impact-item">
                            <div className={`impact-icon ${effect.type}`}>
                              {effect.type === 'positive' ? '+' : '-'}
                            </div>
                            <div className="impact-text">
                              <p>{effect.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="parameter-fee" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <span className="label">Proposal fee:</span>
                    <span className="value">{proposalFeeLabel}</span>
                    <InfoTooltip placement="bottom" content={<span>Fee to create a proposal. Refunded if approved.</span>}>
                      <i className="fas fa-info-circle info-icon" aria-hidden="true" />
                    </InfoTooltip>
                  </div>
                </div>
              </div>

              <div className="proposal-timeline-section">
                <div className="card-header"><h3>Proposal Timeline</h3></div>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot"><i className="fas fa-plus" /></div>
                    <div className="timeline-content">
                      <div className="timeline-date">{proposal?.timestamp ? timestampToDate(proposal.timestamp) : ''}</div>
                      <div className="timeline-title">Proposal Created</div>
                      <div className="timeline-description">Proposal was submitted to the DMD DAO governance system</div>
                    </div>
                  </div>
                  {proposal?.votingStartAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot"><i className="fas fa-bullhorn" /></div>
                      <div className="timeline-content">
                        <div className="timeline-date">{timestampToDate(proposal.votingStartAt)}</div>
                        <div className="timeline-title">Voting Started</div>
                        <div className="timeline-description">Voting phase began for this proposal{proposal?.votingEndAt ? ` — ends on ${timestampToDate(proposal.votingEndAt)}` : ''}</div>
                      </div>
                    </div>
                  )}

                  {proposal?.finalizedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot"><i className={`fas ${proposal.finalizedResult === 'Accepted' ? 'fa-check-circle' : 'fa-times-circle'}`} /></div>
                      <div className="timeline-content">
                        <div className="timeline-date">{timestampToDate(proposal.finalizedAt)}</div>
                        <div className="timeline-title">Finalized — {proposal.finalizedResult || ''}</div>
                        <div className="timeline-description">Voting finalized on-chain{proposal.finalizedResult === 'Accepted' ? ' — proposal accepted' : ' — proposal declined'}</div>
                      </div>
                    </div>
                  )}

                  {proposal?.executedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot"><i className="fas fa-play-circle" /></div>
                      <div className="timeline-content">
                        <div className="timeline-date">{timestampToDate(proposal.executedAt)}</div>
                        <div className="timeline-title">Executed</div>
                        <div className="timeline-description">Proposal was executed by the community</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              { !proposal?.id && (
                <div className="proposal-type-selector">
                  <h4>Proposal Types</h4>
                  <div className="type-buttons">
                    <button className={`type-btn ${type === "parameter-change" ? "active" : ""}`} onClick={() => setType("parameter-change")}>Parameter Change</button>
                    <button className={`type-btn ${type === "funding-request" ? "active" : ""}`} onClick={() => setType("funding-request")}>Funding Request</button>
                    <button className={`type-btn ${type === "contract-upgrade" ? "active" : ""}`} onClick={() => setType("contract-upgrade")}>Contract Upgrade</button>
                  </div>
                </div>
              )}
            </div>

            <div className="voting-info">
              <div className="proposal-card voting-card">
                <div className="card-header"><h3>Voting Progress</h3></div>
                <div className="card-content">
                  {proposal?.executedAt && (
                    <div className={`voting-status-message ${(proposalState || 'executed').toLowerCase().replace(/[^a-z]/g, '')}`}>
                      <i className="fas fa-check-circle" />
                      <span>This proposal was {proposalState || 'Executed'} by the community</span>
                    </div>
                  )}
                  <div className="voting-progress-container">
                    <div
                      className="voting-progress-bar segmented"
                      ref={progressBarRef}
                      onMouseMove={handleProgressMouseMove}
                      style={{
                        ['--yes-width' as any]: progressYesWidth,
                        ['--no-width' as any]: progressNoWidth,
                        ['--threshold-left' as any]: thresholdLeft,
                      }}
                    >
                      <div className="bar-segments">
                        <div className="progress-yes" />
                        <div className="progress-no" />
                      </div>
                      <div className="threshold-line" />
                      {/* <div className="threshold-label">Acceptance Threshold</div> */}
                    </div>
                    {/* <div className="voting-progress-tooltip" id="progress-tooltip" ref={tooltipRef}></div> */}
                    <div className="voting-legend">
                      <span className="legend-item"><span className="legend-dot yes"></span> Exceeding yes (Yes - No)</span>
                      <span className="legend-item"><span className="legend-dot no"></span> No Votes</span>
                      <span className="legend-item"><span className="legend-dot threshold"></span> Acceptance Threshold</span>
                    </div>
                  </div>
                  <div className="voting-stats">
                    {(() => {
                      const totalBn = BigNumber(votingStats?.total || 0)
                      const positiveBn = BigNumber(votingStats?.positive || 0)
                      const negativeBn = BigNumber(votingStats?.negative || 0)
                      const hasTotal = totalBn.isGreaterThan(0)

                      const yesPct = hasTotal
                        ? positiveBn.multipliedBy(100).dividedBy(totalBn)
                        : new BigNumber(0)
                      const noPct = hasTotal
                        ? negativeBn.multipliedBy(100).dividedBy(totalBn)
                        : new BigNumber(0)

                      return (
                        <>
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
                            Exceeding Yes: {formatDmdFromWei(BigNumber.max(0, BigNumber(votingStats?.positive).minus(votingStats?.negative)))} ({formatPercent(parseFloat(String(progressYesWidth)))} | {formatPercent(daoContext.getProposalThreshold(proposal?.rawProposalType))} required)
                          </div>
                          <div className="stat-item participation">
                            Participation:{" "}
                            {formatDmdFromWei(votingStats?.total)} (
                            {formatPercent(
                              BigNumber(votingStats?.total)
                                .dividedBy(
                                  Number(
                                    proposal?.totalStakeSnapshot &&
                                      proposal?.totalStakeSnapshot !== "0"
                                      ? proposal?.totalStakeSnapshot
                                      : stakingContext.totalDaoStake,
                                  ),
                                )
                                .multipliedBy(100),
                            )}{" "}
                            |{" "}
                            {formatPercent(
                              daoContext.getProposalThreshold(
                                proposal?.rawProposalType,
                              ),
                            )}{" "}
                            required)
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  {proposal?.finalizedAt && (
                    <div className="voting-time"><i className="fas fa-clock" /> <span>{`Voting ended on ${timestampToDate(proposal.finalizedAt)}`}</span></div>
                  )}

                  {/* Voting Actions */}
                  {stakingContext.myPool &&
                    (proposal?.state === '2' || (daoContext.daoPhase?.phase === '1' && proposal?.state === '0')) && (
                      <div className="voting-actions" style={{ marginTop: '16px' }}>
                        {/* Already voted notice */}
                        {(myVote?.vote === '0' || myVote?.vote === '1') && Number(myVote?.timestamp || 0) > 0 && (
                          <div className="voted-notice" style={{ marginBottom: '10px' }}>
                            {myVote?.vote === '0' ? (
                              <p>You have already voted against the proposal. Do you want to change your decision?</p>
                            ) : (
                              <p>You have already voted for the proposal. Do you want to change your decision?</p>
                            )}
                            {myVote?.reason && (
                              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                                <strong style={{ fontSize: '0.85rem', opacity: 0.7 }}>Your vote reason:</strong>
                                <p style={{ marginTop: '4px', fontSize: '0.9rem' }}>{myVote.reason}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Vote reason */}
                        {web3Context.userWallet?.myAddr && (
                          <div className="form-group" style={{ marginBottom: '10px' }}>
                            <input
                              type="text"
                              placeholder="Vote Reason (optional)"
                              value={voteReason}
                              onChange={(e) => setVoteReason(e.target.value)}
                            />
                          </div>
                        )}
                        <div className="vote-buttons" style={{ display: 'flex', gap: '10px' }}>
                          {Number(myVote?.timestamp || 0) === 0 ? (
                            <>
                              <button className="primaryBtn vote-yes" onClick={() => handleCastVote(1)}>
                                Vote For <i className="fas fa-thumbs-up" />
                              </button>
                              <button className="primaryBtn vote-no" onClick={() => handleCastVote(0)}>
                                Vote Against <i className="fas fa-thumbs-down" />
                              </button>
                            </>
                          ) : myVote?.vote === '0' ? (
                            <button className="primaryBtn vote-yes" onClick={() => handleCastVote(1)}>
                              Vote For <i className="fas fa-thumbs-up" />
                            </button>
                          ) : (
                            <button className="primaryBtn vote-no" onClick={() => handleCastVote(0)}>
                              Vote Against <i className="fas fa-thumbs-down" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Finalize & Execute Actions */}
                  {proposal?.state === '3' && (
                    <div className="finalize-actions" style={{ marginTop: '16px' }}>
                      <button className="primaryBtn" onClick={() => handleProposalFinalization(proposal?.id)}>
                        Finalize Proposal
                      </button>
                    </div>
                  )}
                  {proposal?.state === '4' && (
                    <div className="execute-actions" style={{ marginTop: '12px' }}>
                      <button className="primaryBtn" onClick={() => handleProposalExecution(proposal?.id)}>
                        Execute Proposal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <ProposalVotes
                proposalId={proposal?.id}
                ready={!!proposal?.id}
                refreshKey={`${proposal?.state ?? ''}-${votingStats?.total?.toString() ?? ''}`}
              />

              <div className="proposal-card discussion-card">
                <div className="card-header"><h3>Discussion</h3></div>
                <div className="card-content">
                    <div className="discussion-links">
                      {proposal?.discussionUrl ? (
                        <a href={proposal.discussionUrl} target="_blank" rel="noreferrer" className="discussion-link">Discussion Link</a>
                      ) : (
                        <a
                          href="https://discord.com/invite/MwqZ2CYcB4"
                          target="_blank"
                          rel="noreferrer"
                          className="discussion-link"
                        >
                          Discuss on Discord
                        </a>
                      )}
                    </div>
                </div>
              </div>

              <div className="proposal-card transaction-card">
                <div className="card-header"><h3>Transaction Details</h3></div>
                <div className="card-content">
                  <div className="transaction-item"><span className="transaction-label">Proposal ID:</span> <span className="transaction-value">{proposal?.id || '921380921831123213...'}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="full-width-sections">
            <div className="bottom-grid">
              {/* <div className="proposal-timeline-section">
                <div className="card-header"><h3>Proposal Timeline</h3></div>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot"><i className="fas fa-plus" /></div>
                    <div className="timeline-content">
                      <div className="timeline-date">{proposal?.timestamp ? timestampToDate(proposal.timestamp) : ''}</div>
                      <div className="timeline-title">Proposal Created</div>
                      <div className="timeline-description">Proposal was submitted to the DMD DAO governance system</div>
                    </div>
                  </div>
                </div>
              </div> */}

              {/* <div className="related-proposals-section">
                <div className="card-header"><h3>Related Proposals</h3></div>
                <div className="related-proposal-item">
                  <div className="related-proposal-status executed" />
                  <div className="related-proposal-content">
                    <div className="related-proposal-title">{proposal?.title || ''}</div>
                    <div className="related-proposal-meta"><span>DMD-58-01</span> <span>Executed: 15 Feb 2025</span></div>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* Dismiss Proposal Modal */}
      <Modal isOpen={dismissProposal} onClose={() => setDismissProposal(false)}>
        <div className="modal-body">
          <h3 style={{ textAlign: 'center' }}>Confirm Dismissal</h3>
          <p style={{ textAlign: 'center', marginTop: '1rem' }}>Are you sure you want to dismiss this proposal?</p>
          <p style={{ textAlign: 'center', color: '#f59e0b' }}>
            ⚠️ This action is irreversible. The proposal fee will not be refunded.
          </p>
          <div className="form-group">
            <label>Dismissal Reason (optional)</label>
            <input
              type="text"
              placeholder="Reason"
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
            />
          </div>
          <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="primaryBtn" onClick={handleDismissProposal}>
              Yes, dismiss
            </button>
            <button className="btn-cancel" onClick={() => setDismissProposal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
