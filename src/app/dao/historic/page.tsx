"use client";

import React, { useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import "./historic-proposals.css";
import "../../styles/proposal-status.css";
import { useRouter } from "next/navigation";
import { useDaoContext } from '@/contexts/DAO';
import { useWeb3Context } from '@/contexts/Web3';
import { timestampToDate, truncateAddress } from '@/utils/common';
import { formatPercent } from '@/utils/format';
import { markdownToPlainText } from '@/components/MarkdownText';
import ValidatorCell from '@/components/ValidatorCell';
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';

type Proposal = {
  id: string;
  date: string;
  creator: string;
  fullCreatorAddress?: string;
  creatorColor?: string;
  title: string;
  type: string;
  participation: number;
  exceeding: number;
  status: string;
};

export default function HistoricProposalsPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string | null>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const [indexingStatus, setIndexingStatus] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  const router = useRouter();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  function onSort(field: string) {
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
    return daoContext.allDaoProposals.map((p: any) => ({
      id: p.id,
      date: p.timestamp ? timestampToDate(p.timestamp) : (p.date || new Date().toISOString().slice(0,10)),
      creator: truncateAddress(p.proposer || p.proposerAddress || ""),
      fullCreatorAddress: p.proposer || p.proposerAddress || "",
      creatorColor: undefined,
      title: markdownToPlainText(p.title || (p.description ? String(p.description).split('\n')[0] : "")),
      type: (p.proposalType || p.rawProposalType || 'open').toLowerCase(),
      participation: Number(p.participation) || 0,
      exceeding: Number(p.exceedingYes) || 0,
      status: daoContext.getStateString ? daoContext.getStateString(p.state) : (p.state || 'Unknown')
    }));
  }, [daoContext?.allDaoProposals]);

  const creatorNames = useDmdNamesForAddresses(
    daoList.map((p) => p.fullCreatorAddress || "").filter(Boolean)
  );

  const displayed = useMemo(() => {
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

    // Sorting
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

    return list;
  }, [daoList, search, filter, sortField, sortAsc]);

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
                  <th onClick={() => onSort('date')}>Date <i className={`fas ${sortField === 'date' ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`} /></th>
                  <th>Created by</th>
                  <th onClick={() => onSort('title')}>Title <i className={`fas ${sortField === 'title' ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`} /></th>
                  <th>Type</th>
                  <th>Participation</th>
                  <th>Exceeding Yes</th>
                  <th>Result</th>
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
