'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import InfoTooltip from '@/components/InfoTooltip';
import PrivacyModeGuard from '@/components/PrivacyModeGuard';
import RowActions, { type RowAction } from './RowActions';
import { useWeb3Context } from '@/contexts/Web3';
import { useTheme } from '@/hooks';
import { useRichList } from '@/hooks/useRichList';
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses';
import { truncateAddress } from '@/utils/common';
import { getThemeImagePath } from '@/utils/imageUtils';
import { formatDmdName, stripDmdSuffix } from '@/utils/dmdNaming';
import { formatCount, formatDmdFromWei, formatPercent } from '@/utils/format';
import { shareOfSupply } from '@/utils/holdings';
import config from '@/lib/config';
import type { RichListEntry } from '@/types/richList';
import '../SharedStats/SharedStats.css';
import './RichList.css';

type SortKey = 'rank' | 'wallet' | 'ownStake' | 'delegatedOut' | 'total' | 'share';
type SortDirection = 'ascending' | 'descending';

interface Column {
  key: string;
  label: string;
  tooltip?: string;
  sortKey?: SortKey;
}

const COLUMNS: Column[] = [
  { key: 'rank', label: '#', sortKey: 'rank' },
  { key: 'address', label: 'Address / Name' },
  { key: 'wallet', label: 'Wallet Balance', tooltip: 'DMD held on the address itself.', sortKey: 'wallet' },
  { key: 'ownStake', label: 'Own Stake', tooltip: 'DMD the address has staked on its own validator pool, as the pool owner.', sortKey: 'ownStake' },
  { key: 'delegatedOut', label: 'Delegated Out', tooltip: 'DMD the address has staked on validator pools owned by other addresses.', sortKey: 'delegatedOut' },
  { key: 'total', label: 'Total Holdings', tooltip: 'Wallet balance + own stake + delegated out.', sortKey: 'total' },
  { key: 'share', label: 'Share of Supply', tooltip: 'Total holdings as a percentage of the total DMD supply.', sortKey: 'share' },
  { key: 'actions', label: '' },
];

const TOP_N_OPTIONS = [50, 100, 500];
const DEFAULT_TOP_N = 100;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const PER_PAGE_STORAGE_KEY = 'richListPerPage';
const STALE_AFTER_MS = 30 * 60 * 1000;
const SKELETON_ROWS = 8;
const PAGE_WINDOW = 2;
const ZERO = BigInt(0);
const EMPTY_ENTRIES: RichListEntry[] = [];

const sortValue = (entry: RichListEntry, key: SortKey): bigint =>
  key === 'rank' || key === 'share' ? entry.total : entry[key];

export default function RichList() {
  const router = useRouter();
  const theme = useTheme();
  const { userWallet } = useWeb3Context();
  const { data, isLoading, error, isHidden, retry } = useRichList();

  const [searchTerm, setSearchTerm] = useState('');
  const [topN, setTopN] = useState(DEFAULT_TOP_N);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'total',
    direction: 'descending',
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(PER_PAGE_STORAGE_KEY));
      if (PAGE_SIZE_OPTIONS.includes(saved)) setItemsPerPage(saved);
    } catch {}
  }, []);

  const entries = data?.entries ?? EMPTY_ENTRIES;
  const totalSupply = data?.totalSupply ?? ZERO;
  const dmdNames = useDmdNamesForAddresses(entries.map((entry) => entry.address));
  const nameOf = (address: string) => dmdNames[address.toLowerCase()] ?? null;

  const query = searchTerm.trim().toLowerCase();
  const nameQuery = stripDmdSuffix(query);
  const visible = query
    ? entries.filter((entry) => {
        const name = nameOf(entry.address);
        return (
          entry.address.toLowerCase().includes(query) ||
          (!!name && !!nameQuery && name.toLowerCase().includes(nameQuery))
        );
      })
    : entries.slice(0, topN);

  const direction = sortConfig.direction === 'ascending' ? 1 : -1;
  const sorted = [...visible].sort((a, b) => {
    const aValue = sortValue(a, sortConfig.key);
    const bValue = sortValue(b, sortConfig.key);
    if (aValue !== bValue) return aValue > bValue ? direction : -direction;
    return a.rank - b.rank;
  });

  const pageCount = Math.ceil(sorted.length / itemsPerPage);
  const page = Math.min(currentPage, Math.max(pageCount - 1, 0));
  const offset = page * itemsPerPage;
  const currentItems = sorted.slice(offset, offset + itemsPerPage);

  const topShare = (count: number) => {
    if (!data) return null;
    const sum = data.entries.slice(0, count).reduce((acc, entry) => acc + entry.total, ZERO);
    return shareOfSupply(sum, data.totalSupply);
  };

  const stats: { key: string; label: string; icon: string; sub?: string; value: string | null }[] = [
    { key: 'supply', label: 'Total DMD Supply', icon: 'rewards.png', value: data ? formatDmdFromWei(data.totalSupply) : null },
    { key: 'holders', label: 'Unique Holders', icon: 'community-size.png', value: data ? formatCount(data.holders) : null },
    { key: 'top10', label: 'Top 10 Holders', icon: 'valid-validators.png', sub: 'of total supply', value: data ? formatPercent(topShare(10)) : null },
    { key: 'top50', label: 'Top 50 Holders', icon: 'analytics.png', sub: 'of total supply', value: data ? formatPercent(topShare(50)) : null },
  ];

  const isStale = !!data && Date.now() - data.generatedAt > STALE_AFTER_MS;

  const copyAddress = (address: string) => {
    copy(address);
    toast.success('Copied address');
  };

  const openExplorer = (address: string) => {
    window.open(`${config.explorerUrl}address/${address}`, '_blank', 'noopener,noreferrer');
  };

  const openEntry = (entry: RichListEntry) => {
    const myAddr = userWallet.myAddr?.toLowerCase();
    if (myAddr && entry.address.toLowerCase() === myAddr) {
      router.push('/profile');
    } else if (entry.isPool) {
      router.push(`/validators/${entry.address}`);
    } else {
      openExplorer(entry.address);
    }
  };

  const actionsFor = (entry: RichListEntry): RowAction[] => {
    const actions: RowAction[] = [
      { key: 'copy', label: 'Copy address', icon: 'fa-copy', onSelect: () => copyAddress(entry.address) },
      { key: 'explorer', label: 'View on explorer', icon: 'fa-external-link-alt', onSelect: () => openExplorer(entry.address) },
    ];
    if (entry.isPool) {
      actions.push({
        key: 'validator',
        label: 'View validator',
        icon: 'fa-server',
        onSelect: () => router.push(`/validators/${entry.address}`),
      });
    }
    return actions;
  };

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending',
    }));
    setCurrentPage(0);
  };

  const renderAmount = (value: bigint, className = 'rl-num') => (
    <td className={value === ZERO ? `${className} rl-zero` : className}>{formatDmdFromWei(value)}</td>
  );

  const renderStateRow = (content: React.ReactNode) => (
    <tr className="rl-state-row">
      <td colSpan={COLUMNS.length} className="rl-state-cell">{content}</td>
    </tr>
  );

  const renderBody = () => {
    if (isLoading) {
      return Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} className="rl-skeleton-row" aria-hidden="true">
          {COLUMNS.map((column) => (
            <td key={column.key}>
              {column.key !== 'actions' && <span className="rl-skeleton rl-skeleton--cell" />}
            </td>
          ))}
        </tr>
      ));
    }

    if (error && !data) {
      return renderStateRow(
        <>
          <span>The rich list could not be loaded.</span>
          <button type="button" className="btn-secondary rl-retry" onClick={retry}>
            <i className="fas fa-redo" aria-hidden="true"></i> Retry
          </button>
        </>
      );
    }

    if (currentItems.length === 0) {
      return renderStateRow(query ? 'No addresses match your search.' : 'No holders to show.');
    }

    return currentItems.map((entry) => {
      const name = nameOf(entry.address);
      return (
        <tr
          key={entry.address}
          className="rl-row"
          tabIndex={0}
          onClick={() => openEntry(entry)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target === e.currentTarget) openEntry(entry);
          }}
        >
          <td className="rl-rank">{entry.rank}</td>
          <td className="wallet-address">
            <div className="dmd-validator-cell">
              <span className="dmd-validator-cell__addr dmd-validator-cell__addr-row">
                {truncateAddress(entry.address)}
                <button
                  type="button"
                  className="dmd-validator-cell__copy"
                  title="Copy address"
                  aria-label="Copy address"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyAddress(entry.address);
                  }}
                >
                  <i className="fas fa-copy" aria-hidden="true"></i>
                </button>
              </span>
              {name && <span className="dmd-validator-cell__sub">{formatDmdName(name)}</span>}
            </div>
          </td>
          {renderAmount(entry.wallet)}
          {renderAmount(entry.ownStake)}
          {renderAmount(entry.delegatedOut)}
          {renderAmount(entry.total, 'rl-num rl-total')}
          <td className="rl-num">{formatPercent(shareOfSupply(entry.total, totalSupply))}</td>
          <td className="vl-action-cell" onClick={(e) => e.stopPropagation()}>
            <RowActions label={`Actions for ${entry.address}`} actions={actionsFor(entry)} />
          </td>
        </tr>
      );
    });
  };

  const renderPageNumbers = () => {
    const items: React.ReactElement[] = [];
    let prevSkipped = false;
    for (let i = 0; i < pageCount; i++) {
      const isEdge = i === 0 || i === pageCount - 1;
      if (!isEdge && Math.abs(i - page) > PAGE_WINDOW) {
        if (!prevSkipped) {
          items.push(<span key={`ellipsis-${i}`} className="pagination-btn pagination-ellipsis">…</span>);
          prevSkipped = true;
        }
        continue;
      }
      prevSkipped = false;
      items.push(
        <button
          key={i}
          type="button"
          className={page === i ? 'pagination-btn active' : 'pagination-btn'}
          aria-current={page === i ? 'page' : undefined}
          onClick={() => setCurrentPage(i)}
        >
          {i + 1}
        </button>
      );
    }
    return items;
  };

  return (
    <>
      <section className="validators-metrics rich-list-metrics">
        <div className="container">
          <div className="metrics-grid">
            {stats.map((stat) => (
              <div key={stat.key} className="metric-card rl-metric-card fade-in">
                <div className="metric-icon">
                  <Image src={getThemeImagePath(stat.icon, theme)} alt="" width={100} height={100} />
                </div>
                <div className="metric-content">
                  {stat.value !== null || isHidden || error ? (
                    <p className="metric-value">{isHidden ? '—' : stat.value ?? '—'}</p>
                  ) : (
                    <span className="rl-skeleton rl-skeleton--stat" role="status" aria-label={`Loading ${stat.label}`} />
                  )}
                  <h3>{stat.label}</h3>
                  {stat.sub && <span className="rl-metric-sub">{stat.sub}</span>}
                </div>
                <Image className="ellipse-bottom" src={getThemeImagePath('ellipse-bottom.png', theme)} alt="" width={0} height={0} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="validators-table-section">
        <div className="container">
          <div className="validators-controls">
            <div className="search-filter-group">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search by address or DMD name..."
                  aria-label="Search by address or DMD name"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0);
                  }}
                />
                <button type="button" className="search-btn" tabIndex={-1} aria-hidden="true">
                  <i className="fas fa-search"></i>
                </button>
              </div>
              <div className="filter-container">
                <select
                  value={topN}
                  aria-label="Number of holders"
                  disabled={!!query}
                  onChange={(e) => {
                    setTopN(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                >
                  {TOP_N_OPTIONS.map((n) => (
                    <option key={n} value={n}>Top {n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <PrivacyModeGuard placeholder="skeleton" className="rl-privacy-placeholder">
            <div className="validators-table-wrapper">
              <div className="validators-table-container">
                <table className="validators-table rl-table">
                  <thead>
                    <tr>
                      {COLUMNS.map((column) => {
                        const sortKey = column.sortKey;
                        const isSorted = !!sortKey && sortConfig.key === sortKey;
                        return (
                          <th
                            key={column.key}
                            className={column.key === 'actions' ? 'vl-action-cell' : undefined}
                            aria-sort={isSorted ? sortConfig.direction : undefined}
                            onClick={sortKey ? () => requestSort(sortKey) : undefined}
                            style={{ cursor: sortKey ? 'pointer' : 'default' }}
                          >
                            {column.label}
                            {column.tooltip && (
                              <InfoTooltip content={column.tooltip}>
                                <i className="fas fa-info-circle" />
                              </InfoTooltip>
                            )}
                            {sortKey && (
                              <i
                                className={`fas ${isSorted ? (sortConfig.direction === 'ascending' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}
                                aria-hidden="true"
                              ></i>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>{renderBody()}</tbody>
                </table>
              </div>
            </div>

            {data && (
              <div className="vl-pagination-footer">
                <span className="vl-pagination-info">
                  {sorted.length === 0
                    ? 'No results'
                    : `Showing ${offset + 1}–${Math.min(offset + itemsPerPage, sorted.length)} of ${formatCount(sorted.length)} addresses`}
                </span>
                {pageCount > 1 && (
                  <div className="pagination">
                    <button
                      type="button"
                      className={`pagination-btn ${page === 0 ? 'disabled' : ''}`}
                      aria-label="Previous page"
                      disabled={page === 0}
                      onClick={() => setCurrentPage(page - 1)}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    {renderPageNumbers()}
                    <button
                      type="button"
                      className={`pagination-btn ${page === pageCount - 1 ? 'disabled' : ''}`}
                      aria-label="Next page"
                      disabled={page === pageCount - 1}
                      onClick={() => setCurrentPage(page + 1)}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
                <div className="vl-per-page">
                  <label htmlFor="rl-per-page">Rows:</label>
                  <select
                    id="rl-per-page"
                    value={itemsPerPage}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setItemsPerPage(n);
                      setCurrentPage(0);
                      try {
                        localStorage.setItem(PER_PAGE_STORAGE_KEY, String(n));
                      } catch {}
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </PrivacyModeGuard>

          <div className="rl-footnote">
            {data && (
              <span className="rl-freshness">
                Data as of block #{formatCount(data.blockNumber)} · {new Date(data.blockTimestamp * 1000).toLocaleString()}
                {isStale && (
                  <span className="rl-stale-badge">
                    <i className="fas fa-exclamation-triangle" aria-hidden="true"></i> Stale
                  </span>
                )}
              </span>
            )}
            <span>Total Holdings = Wallet Balance + Own Stake + Delegated Out.</span>
          </div>
        </div>
      </section>
    </>
  );
}
