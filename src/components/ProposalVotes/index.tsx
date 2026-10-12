'use client';

import './ProposalVotes.css';
import Link from 'next/link';
import BigNumber from 'bignumber.js';
import React, { useEffect, useMemo, useState } from 'react';
import { useDaoContext } from '@/contexts/DAO';
import { useWeb3Context } from '@/contexts/Web3';
import { useStakingContext } from '@/contexts/Staking';
import { Pool } from '@/contexts/types/models';
import { ProposalVote } from '@/contexts/types/dao';
import UnstakeModal from '@/components/Modals/Unstake/UnstakeModal';
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses';
import { formatDmdName } from '@/utils/dmdNaming';
import { timestampToDate, timestampToDateTime, truncateAddress } from '@/utils/common';
import { formatDmdFromWei } from '@/utils/format';
import logger from '@/utils/logger';

type VoteFilter = 'all' | 'yes' | 'no';
type VoteSort = 'recent' | 'stake';

interface ProposalVotesProps {
  proposalId?: string;
  ready?: boolean;
  refreshKey?: string | number;
}

const VOTE_YES = '1';

const ProposalVotes: React.FC<ProposalVotesProps> = ({ proposalId, ready = true, refreshKey }) => {
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();

  const [votes, setVotes] = useState<ProposalVote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [stakeSource, setStakeSource] = useState<'snapshot' | 'live'>('live');
  const [filter, setFilter] = useState<VoteFilter>('all');
  const [sort, setSort] = useState<VoteSort>('recent');
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    if (!proposalId || !ready) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    daoContext.getProposalVotes(proposalId)
      .then((result) => {
        if (cancelled) return;
        setVotes(result.votes);
        setStakeSource(result.stakeSource);
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.error(error);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [proposalId, ready, refreshKey, reloadToken]);

  const voterAddresses = useMemo(() => votes.map((vote) => vote.voter), [votes]);
  const nameMap = useDmdNamesForAddresses(voterAddresses);

  const poolMap = useMemo(() => {
    const map: Record<string, Pool> = {};
    stakingContext.pools.forEach((pool) => {
      if (pool.stakingAddress) map[pool.stakingAddress.toLowerCase()] = pool;
    });
    return map;
  }, [stakingContext.pools]);

  const tally = useMemo(() => {
    let yes = 0;
    let no = 0;
    votes.forEach((vote) => {
      if (vote.vote === VOTE_YES) yes += 1;
      else no += 1;
    });
    return { yes, no };
  }, [votes]);

  const myDelegationCount = useMemo(() => votes.reduce((count, vote) => {
    const pool = poolMap[vote.voter.toLowerCase()];
    return pool && BigNumber(pool.myStake || 0).isGreaterThan(0) ? count + 1 : count;
  }, 0), [votes, poolMap]);

  const visibleVotes = useMemo(() => {
    const filtered = votes.filter((vote) => {
      if (filter === 'yes') return vote.vote === VOTE_YES;
      if (filter === 'no') return vote.vote !== VOTE_YES;
      return true;
    });

    if (sort === 'stake') {
      return [...filtered].sort((a, b) => BigNumber(b.stake || 0).comparedTo(BigNumber(a.stake || 0)) ?? 0);
    }
    return filtered;
  }, [votes, filter, sort]);

  if (!proposalId) return null;

  const toggleReason = (voter: string) => {
    setExpandedReasons((current) => ({ ...current, [voter]: !current[voter] }));
  };

  const renderBody = () => {
    if (loading && !loaded) {
      return (
        <div className="proposal-votes-state">
          <span className="proposal-votes-spinner" aria-hidden="true" />
          <span>Loading votes from the DAO contract…</span>
        </div>
      );
    }

    if (failed) {
      return (
        <div className="proposal-votes-state">
          <i className="fas fa-triangle-exclamation" />
          <span>Votes could not be loaded right now.</span>
        </div>
      );
    }

    if (!votes.length) {
      return (
        <div className="proposal-votes-state">
          <i className="fas fa-inbox" />
          <span>No validator has voted on this proposal yet.</span>
        </div>
      );
    }

    if (!visibleVotes.length) {
      return (
        <div className="proposal-votes-state">
          <i className="fas fa-filter" />
          <span>No votes match this filter.</span>
        </div>
      );
    }

    return (
      <ul className="proposal-votes-list">
        {visibleVotes.map((vote) => {
          const key = vote.voter.toLowerCase();
          const isYes = vote.vote === VOTE_YES;
          const name = nameMap[key];
          const pool = poolMap[key];
          const myStake = BigNumber(pool?.myStake || 0);
          const isMyDelegation = myStake.isGreaterThan(0);
          const isMyWallet = !!web3Context.userWallet?.myAddr
            && web3Context.userWallet.myAddr.toLowerCase() === key;
          const reason = vote.reason?.trim();
          const expanded = !!expandedReasons[vote.voter];

          return (
            <li
              key={vote.voter}
              className={`proposal-vote-row${isMyDelegation ? ' is-delegated' : ''}`}
            >
              <div className="proposal-vote-main">
                <span className={`proposal-vote-marker ${isYes ? 'yes' : 'no'}`} aria-hidden="true" />

                <div className="proposal-vote-identity">
                  <Link
                    href={`/validators/${vote.voter}`}
                    className="proposal-vote-name"
                    title={vote.voter}
                  >
                    {name ? formatDmdName(name) : truncateAddress(vote.voter)}
                  </Link>
                  <span className="proposal-vote-sub">
                    {name && <span className="proposal-vote-addr">{truncateAddress(vote.voter)}</span>}
                    <span
                      className="proposal-vote-time"
                      title={timestampToDateTime(Number(vote.timestamp || 0))}
                    >
                      {timestampToDate(vote.timestamp || '0')}
                    </span>
                  </span>
                </div>

                <div className="proposal-vote-weight">
                  <span className="proposal-vote-stake">
                    {formatDmdFromWei(vote.stake, { unit: false })}
                    <span className="proposal-vote-unit">DMD</span>
                  </span>
                  <span className={`proposal-vote-choice ${isYes ? 'yes' : 'no'}`}>
                    <i className={`fas ${isYes ? 'fa-check' : 'fa-xmark'}`} />
                    {isYes ? 'For' : 'Against'}
                  </span>
                </div>
              </div>

              {(isMyDelegation || isMyWallet) && (
                <div className="proposal-vote-delegation">
                  <span className={`proposal-vote-badge${isMyWallet ? ' own' : ''}`}>
                    <i className={`fas ${isMyWallet ? 'fa-user-shield' : 'fa-hand-holding-dollar'}`} />
                    {isMyWallet
                      ? 'Your validator'
                      : `You delegate ${formatDmdFromWei(myStake, { unit: false })} DMD`}
                  </span>
                  {isMyDelegation && !isMyWallet && pool && (
                    <span className="proposal-vote-unstake">
                      <UnstakeModal buttonText="Unstake" pool={pool} />
                    </span>
                  )}
                </div>
              )}

              {reason && (
                <div className={`proposal-vote-reason${expanded ? ' expanded' : ''}`}>
                  <p>{reason}</p>
                  {reason.length > 180 && (
                    <button type="button" onClick={() => toggleReason(vote.voter)}>
                      {expanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="proposal-card votes-card">
      <div className="card-header proposal-votes-header">
        <h3>Votes</h3>
        <div className="proposal-votes-head-meta">
          {loaded && !!votes.length && (
            <span className="proposal-votes-count">
              <span className="yes">{tally.yes} for</span>
              <span className="sep">·</span>
              <span className="no">{tally.no} against</span>
            </span>
          )}
          <button
            type="button"
            className="proposal-votes-refresh"
            title="Refresh votes"
            aria-label="Refresh votes"
            disabled={loading}
            onClick={() => setReloadToken((token) => token + 1)}
          >
            <i className={`fas fa-rotate-right${loading ? ' spinning' : ''}`} />
          </button>
        </div>
      </div>

      <div className="card-content proposal-votes-content">
        {loaded && !!votes.length && (
          <div className="proposal-votes-toolbar">
            <div className="proposal-votes-filters" role="group" aria-label="Filter votes">
              <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
              <button type="button" className={filter === 'yes' ? 'active' : ''} onClick={() => setFilter('yes')}>For</button>
              <button type="button" className={filter === 'no' ? 'active' : ''} onClick={() => setFilter('no')}>Against</button>
            </div>

            <label className="proposal-votes-sort">
              <span className="proposal-votes-sr">Sort votes</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as VoteSort)}>
                <option value="recent">Most Recent</option>
                <option value="stake">Largest Stake</option>
              </select>
            </label>
          </div>
        )}

        {myDelegationCount > 0 && (
          <div className="proposal-votes-notice">
            <i className="fas fa-circle-info" />
            <span>
              You delegate to {myDelegationCount} {myDelegationCount === 1 ? 'validator' : 'validators'} that voted here.
            </span>
          </div>
        )}

        {renderBody()}

        {loaded && !!votes.length && (
          <p className="proposal-votes-footnote">
            Stake shown is the {stakeSource === 'snapshot'
              ? 'DAO epoch snapshot'
              : 'live pool stake'}.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProposalVotes;
