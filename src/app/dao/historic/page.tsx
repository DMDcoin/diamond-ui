"use client";

import React, { useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import BigNumber from 'bignumber.js';
import "./historic-proposals.css";
import "../../styles/proposal-status.css";
import { useRouter } from "next/navigation";
import { useDaoContext } from '@/contexts/DAO';
import { useWeb3Context } from '@/contexts/Web3';
import { timestampToDate, truncateAddress } from '@/utils/common';
import { formatDmdFromWei, formatPercent } from '@/utils/format';
import { formatDmdName } from '@/utils/dmdNaming';
import { markdownToPlainText } from '@/components/MarkdownText';
import ValidatorCell from '@/components/ValidatorCell';
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';

type Proposal = {
  id: string;
  date: string;
  timestamp: number | null;
  creator: string;
  fullCreatorAddress?: string;
  creatorColor?: string;
  title: string;
  type: string;
  requestedWei: BigNumber | null;
  participation: number;
  exceeding: number;
  status: string;
};

type SortField = 'date' | 'creator' | 'title' | 'type' | 'requested' | 'participation' | 'exceeding' | 'status';

type SortValue = string | number | BigNumber;

const COLUMNS: { field: SortField; label: string; alignRight?: boolean }[] = [
  { field: 'date', label: 'Date' },
  { field: 'creator', label: 'Created by' },
  { field: 'title', label: 'Title' },
  { field: 'type', label: 'Type' },
  { field: 'requested', label: 'Requested DMD', alignRight: true },
  { field: 'participation', label: 'Participation' },
  { field: 'exceeding', label: 'Exceeding Yes' },
  { field: 'status', label: 'Result' },
];

const textCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const isEmptyCalldata = (calldata: unknown) =>
  calldata === null || calldata === undefined || calldata === '' || calldata === '0x';

const getRequestedWei = (proposal: any): BigNumber | null => {
  const { targets, values, calldatas } = proposal || {};
  if (!Array.isArray(targets) || !Array.isArray(values) || !Array.isArray(calldatas)) return null;
  if (!targets.length || values.length !== targets.length || calldatas.length !== targets.length) return null;
  let total = new BigNumber(0);
  for (let i = 0; i < values.length; i++) {
    const value = new BigNumber(values[i]);
    if (!value.isFinite() || value.isNegative()) return null;
    if (isEmptyCalldata(calldatas[i])) total = total.plus(value);
  }
  return total;
};

const formatRequested = (requestedWei: BigNumber | null) => {
  if (!requestedWei) return 'Unavailable';
  if (requestedWei.isZero()) return '—';
  return formatDmdFromWei(requestedWei, { unit: false });
};

const compareSortValues = (a: SortValue, b: SortValue) => {
  if (BigNumber.isBigNumber(a) && BigNumber.isBigNumber(b)) return a.comparedTo(b);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return textCollator.compare(String(a), String(b));
};

const compareNewestFirst = (a: Proposal, b: Proposal) =>
  (b.timestamp ?? 0) - (a.timestamp ?? 0) || textCollator.compare(a.id, b.id);

export default function HistoricProposalsPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const [indexingStatus, setIndexingStatus] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  const router = useRouter();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  function onSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  // Map DAO context proposals to page Proposal shape
  const daoList = useMemo(() => {
    if (!daoContext || !daoContext.allDaoProposals) return [] as Proposal[];
    return daoContext.allDaoProposals.map((p: any): Proposal => {
      const timestamp = Number(p.timestamp);
      return {
        id: p.id,
        date: p.timestamp ? timestampToDate(p.timestamp) : (p.date || new Date().toISOString().slice(0,10)),
        timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null,
        creator: truncateAddress(p.proposer || p.proposerAddress || ""),
        fullCreatorAddress: p.proposer || p.proposerAddress || "",
        creatorColor: undefined,
        title: markdownToPlainText(p.title || (p.description ? String(p.description).split('\n')[0] : "")),
        type: (p.proposalType || p.rawProposalType || 'open').toLowerCase(),
        requestedWei: getRequestedWei(p),
        participation: Number(p.participation) || 0,
        exceeding: Number(p.exceedingYes) || 0,
        status: daoContext.getStateString ? daoContext.getStateString(p.state) : (p.state || 'Unknown')
      };
    });
  }, [daoContext?.allDaoProposals]);

  const creatorNames = useDmdNamesForAddresses(
    daoList.map((p) => p.fullCreatorAddress || "").filter(Boolean)
  );

  const displayed = useMemo(() => {
    const getSortValue = (p: Proposal, field: SortField): SortValue | null => {
      switch (field) {
        case 'date':
          return p.timestamp;
        case 'creator': {
          const address = p.fullCreatorAddress || '';
          if (!address) return null;
          const name = creatorNames[address.toLowerCase()];
          return name ? formatDmdName(name) : address;
        }
        case 'title':
          return p.title.trim() || null;
        case 'type':
          return p.type || null;
        case 'requested':
          return p.requestedWei && p.requestedWei.isGreaterThan(0) ? p.requestedWei : null;
        case 'participation':
          return Number.isFinite(p.participation) ? p.participation : null;
        case 'exceeding':
          return Number.isFinite(p.exceeding) ? p.exceeding : null;
        case 'status':
          return p.status && p.status !== 'Unknown' ? p.status : null;
      }
    };

    const getMissingRank = (p: Proposal, field: SortField) =>
      field === 'requested' && !p.requestedWei ? 1 : 0;

    let list: Proposal[] = daoList.slice();

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.creator.toLowerCase().includes(q));
    }

    // Type filter
    if (filter !== "all") {
      list = list.filter((p) => p.type.toLowerCase() === filter.toLowerCase());
    }

    list.sort((a, b) => {
      const valueA = getSortValue(a, sortField);
      const valueB = getSortValue(b, sortField);
      if (valueA === null || valueB === null) {
        if (valueA !== null) return -1;
        if (valueB !== null) return 1;
        return getMissingRank(a, sortField) - getMissingRank(b, sortField) || compareNewestFirst(a, b);
      }
      const order = compareSortValues(valueA, valueB);
      if (order) return sortAsc ? order : -order;
      return compareNewestFirst(a, b);
    });

    return list;
  }, [daoList, search, filter, sortField, sortAsc, creatorNames]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, sortField, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayed.slice(start, start + PAGE_SIZE);
  }, [displayed, currentPage]);

  // When web3 is ready, fetch historic proposals if not already loaded
  useEffect(() => {
    // Fetch historic proposals and manage local loading/error state
    async function fetchHistoric() {
      if (!web3Context?.web3Initialized || !daoContext) return;
      if (daoContext.allDaoProposals && daoContext.allDaoProposals.length > 0) return;

      setLoading(true);
      setError(null);
      try {
        web3Context.showLoader(true, "Fetching historic proposals");
        await daoContext.getHistoricProposals();
      } catch (err: any) {
        setError(err?.message || 'Failed to load historic proposals');
      } finally {
        setLoading(false);
        web3Context.showLoader(false, "");
      }
    }

    fetchHistoric();
  }, [web3Context?.web3Initialized, daoContext]);

  // Compute indexing status (percentage of fetched proposals with non-empty state)
  useEffect(() => {
    if (!daoContext || !daoContext.allDaoProposals) return;
    const totalProposals = daoContext.allDaoProposals.length;
    if (totalProposals === 0) {
      setIndexingStatus(null);
      return;
    }
    const totalFetched = daoContext.allDaoProposals.filter((proposal: any) => proposal.state !== '').length;
    const indexingPercentage = Math.round((totalFetched / totalProposals) * 100);
    if (indexingPercentage === 100) {
      setIndexingStatus(null);
    } else {
      setIndexingStatus(`Indexing: ${indexingPercentage}% complete`);
    }
  }, [daoContext?.allDaoProposals]);

  return (
    <div className="historic-page">
      <section className="historic-hero">
        <div className="cosmic-grid" />
        <div className="cosmic-elements">
          <div className="diamond diamond-1" />
          <div className="diamond diamond-2" />
          <div className="diamond diamond-3" />
          <div className="glow glow-1" />
          <div className="glow glow-2" />
        </div>
        <div className="container">
            <div className="historic-hero-content">
            <h1>Historic Proposals</h1>
            <p>Browse and analyze all past governance proposals and their outcomes.</p>
          </div>
          <Link href="/dao" className="btn-outline">← Back to Governance</Link>
        </div>
      </section>

      <section className="historic-controls">
        <div className="container">
          <div className="search-filter-container">
            <div className="search-filter-group">
              <div className="search-container">
                <input id="proposal-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proposals..." />
                <button className="search-btn"><i className="fas fa-search" /></button>
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
            <div className="historic-stats">
              <div className="stat-item">
                <span className="stat-label">Total Proposals:</span>
                <span className="stat-value">{daoList.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Accepted:</span>
                <span className="stat-value accepted">{daoList.filter(p => p.status.toLowerCase() === 'accepted' || p.status.toLowerCase() === 'executed').length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Declined:</span>
                <span className="stat-value declined">{daoList.filter(p => p.status.toLowerCase() === 'declined').length}</span>
              </div>
            </div>
            <div className="controls-status">
              {loading && <div className="loader-text">Loading proposals...</div>}
              {error && <div className="error-text">{error}</div>}
              {!loading && !error && indexingStatus && <div className="indexing-status">{indexingStatus}</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="historic-proposals">
        <div className="container">
          <div className="proposals-table-container">
            <table className="proposals-table">
              <thead>
                <tr>
                  {COLUMNS.map((column) => {
                    const active = sortField === column.field;
                    return (
                      <th
                        key={column.field}
                        scope="col"
                        tabIndex={0}
                        className={`sortable${active ? ' sorted' : ''}${column.alignRight ? ' align-right' : ''}`}
                        aria-sort={active ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                        onClick={() => onSort(column.field)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSort(column.field);
                          }
                        }}
                      >
                        {column.label} <i className={`fas ${active ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`} aria-hidden="true" />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paged.map((p, idx) => (
                  <tr key={p.id} className={idx % 2 === 1 ? 'alt-row' : ''} onClick={() => startTransition(() => router.push(`/dao/details/${p.id}`))} style={{ cursor: 'pointer' }}>
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
                    <td className="requested-dmd">{formatRequested(p.requestedWei)}</td>
                    <td>
                      <div className="participation-bar">
                        <div className="participation-progress" style={{ width: `${p.participation}%` }} />
                        <span className="participation-value">{formatPercent(p.participation)}</span>
                      </div>
                    </td>
                    <td><span className={`exceeding-value ${p.exceeding >= 0 ? 'positive' : 'negative'}`}>{formatPercent(p.exceeding, { sign: true })}</span></td>
                    <td><span className={`proposal-status ${p.status.toLowerCase()}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {displayed.length > PAGE_SIZE && (
          <div className="pagination">
            <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
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
                  {start > 1 && <button className="pagination-btn" onClick={() => setCurrentPage(1)}>1</button>}
                  {start > 2 && <span className="pagination-ellipsis">...</span>}
                  {pages.map((pg) => (
                    <button key={pg} className={`pagination-btn ${pg === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(pg)}>{pg}</button>
                  ))}
                  {end < pageCount - 1 && <span className="pagination-ellipsis">...</span>}
                  {end < pageCount && <button className="pagination-btn" onClick={() => setCurrentPage(pageCount)}>{pageCount}</button>}
                </>
              );
            })()}

            <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>
              <i className="fas fa-chevron-right" />
            </button>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
