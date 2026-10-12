'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useWeb3Context } from '@/contexts/Web3';
import Modal from '@/components/Modal';
import DmdNameSearch from './DmdNameSearch';
import RegisterNameModal from './RegisterNameModal';
import DateField from './DateField';
import SelectField from './SelectField';
import { getNamesDirectory, getBlacklistedNames, getWalletDmdName } from '@/services/dmdNaming';
import { formatDmdDate, formatDmdName, shortenAddress } from '@/utils/dmdNaming';
import ReportNameModal from './ReportNameModal';
import { useHiddenNames } from '@/hooks/useHiddenNames';
import serverHiddenNames from '@/config/hidden-names.json';
import type { DmdDirectoryEntry, DmdDirectoryQuery, DmdNameAvailabilityResult, OwnedDmdNameStatus } from '@/types/dmdNaming';

const SERVER_HIDDEN_NAMES = new Set<string>(serverHiddenNames as string[]);

const STATUS_LABELS: Record<OwnedDmdNameStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  'expiring-soon': 'Expiring soon',
  expired: 'Expired',
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const INDEX_RETRY_MS = 8000;

const SORT_OPTIONS: { value: string; sortBy: NonNullable<DmdDirectoryQuery['sortBy']>; order: NonNullable<DmdDirectoryQuery['order']>; label: string }[] = [
  { value: 'createdAt:desc', sortBy: 'createdAt', order: 'desc', label: 'Created (newest)' },
  { value: 'createdAt:asc', sortBy: 'createdAt', order: 'asc', label: 'Created (oldest)' },
  { value: 'expiresAt:asc', sortBy: 'expiresAt', order: 'asc', label: 'Expires (soonest)' },
  { value: 'name:asc', sortBy: 'name', order: 'asc', label: 'Name (A-Z)' },
];

type DraftFilters = {
  statusActive: boolean;
  statusInactive: boolean;
  createdFrom: string;
  createdTo: string;
  expiresFrom: string;
  expiresTo: string;
};

const DEFAULT_FILTERS: DraftFilters = {
  statusActive: true,
  statusInactive: true,
  createdFrom: '',
  createdTo: '',
  expiresFrom: '',
  expiresTo: '',
};

function toStartOfDaySeconds(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
}

function toEndOfDaySeconds(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  return Math.floor(new Date(`${dateStr}T23:59:59Z`).getTime() / 1000);
}

export default function DmdNamesDirectory() {
  const { contractsManager, web3Initialized, userWallet } = useWeb3Context();

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [reportName, setReportName] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(DEFAULT_FILTERS);
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0].value);
  const sortOption = SORT_OPTIONS.find((opt) => opt.value === sortValue) ?? SORT_OPTIONS[0];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [entries, setEntries] = useState<DmdDirectoryEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blacklisted, setBlacklisted] = useState<Set<string>>(new Set());
  const { hideName, unhideName, isLocallyHidden } = useHiddenNames();

  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerAvailability, setRegisterAvailability] = useState<DmdNameAvailabilityResult | null>(null);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const indexCatchUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadRegisteredName = useCallback(() => {
    const contract = contractsManager.diamondRegistryContract;
    if (!web3Initialized || !contract || !userWallet.myAddr) {
      setRegisteredName(null);
      return;
    }
    getWalletDmdName(contract, userWallet.myAddr).then(setRegisteredName);
  }, [contractsManager.diamondRegistryContract, web3Initialized, userWallet.myAddr]);

  useEffect(() => {
    reloadRegisteredName();
  }, [reloadRegisteredName]);

  useEffect(() => {
    getBlacklistedNames().then(setBlacklisted);
  }, []);

  const load = useCallback((options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setEntries(null);
    }
    setError(null);

    if (!appliedFilters.statusActive && !appliedFilters.statusInactive) {
      setEntries([]);
      setTotal(0);
      return;
    }

    const status = appliedFilters.statusActive && !appliedFilters.statusInactive
      ? 'active'
      : !appliedFilters.statusActive && appliedFilters.statusInactive
        ? 'inactive'
        : undefined;

    getNamesDirectory({
      q: appliedSearch || undefined,
      status: status as OwnedDmdNameStatus | undefined,
      createdFrom: toStartOfDaySeconds(appliedFilters.createdFrom),
      createdTo: toEndOfDaySeconds(appliedFilters.createdTo),
      expiresFrom: toStartOfDaySeconds(appliedFilters.expiresFrom),
      expiresTo: toEndOfDaySeconds(appliedFilters.expiresTo),
      sortBy: sortOption.sortBy,
      order: sortOption.order,
      page,
      pageSize,
    })
      .then((res) => {
        setEntries(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        if (options?.silent) return;
        setEntries([]);
        setError('Unable to load the DMD Names directory right now. Please try again later.');
      });
  }, [appliedSearch, appliedFilters, sortOption, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    if (indexCatchUpTimer.current) clearTimeout(indexCatchUpTimer.current);
  }, []);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === appliedSearch) return;

    const timer = setTimeout(() => {
      setAppliedSearch(trimmed);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, appliedSearch]);

  const openRegister = (name: string, availability: DmdNameAvailabilityResult) => {
    setRegisterName(name);
    setRegisterAvailability(availability);
    setRegisterOpen(true);
  };

  const handleRegistered = () => {
    reloadRegisteredName();
    setSearchResetKey((key) => key + 1);
    load();

    if (indexCatchUpTimer.current) clearTimeout(indexCatchUpTimer.current);
    indexCatchUpTimer.current = setTimeout(() => load({ silent: true }), INDEX_RETRY_MS);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
    setFilterOpen(false);
  };

  const resetDraft = () => {
    setDraftFilters(DEFAULT_FILTERS);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
    setFilterOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <div className="dmd-directory">
      <div className="dmd-names-search-card">
        <DmdNameSearch key={searchResetKey} variant="page" showExamples onRegisterName={openRegister} />
      </div>

      <div className="dmd-directory-toolbar">
        <div className="dmd-directory-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search DMD name or owner address"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toLowerCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setAppliedSearch(searchInput.trim());
                setPage(1);
              }
            }}
          />
        </div>
        <button
          type="button"
          className="btn-secondary dmd-directory-filter-toggle"
          onClick={() => { setDraftFilters(appliedFilters); setFilterOpen(true); }}
        >
          <i className="fas fa-filter"></i> Filter
        </button>
      </div>

      <div className="dmd-owned-table-wrapper dmd-directory-table-wrapper">
        <table className="dmd-owned-table">
          <thead>
            <tr>
              <th>DMD Name</th>
              <th>Current Owner</th>
              <th>Status</th>
              <th>Created On</th>
              <th>Expires On</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries === null && !error && (
              <tr><td colSpan={6} className="dmd-owned-loading">Loading DMD names…</td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="dmd-owned-error">{error}</td></tr>
            )}
            {entries !== null && !error && entries.length === 0 && (
              <tr><td colSpan={6} className="dmd-owned-empty">No DMD names found.</td></tr>
            )}
            {entries?.map((entry) => {
              const isModerated = blacklisted.has(entry.name) || SERVER_HIDDEN_NAMES.has(entry.name);
              const isUserHidden = isLocallyHidden(entry.name);
              const isHidden = isModerated || isUserHidden;
              return (
                <tr key={entry.name}>
                  <td className="dmd-owned-name-cell">
                    {isHidden ? (
                      <span title={isModerated ? 'This name is hidden pending DAO moderation' : 'You have hidden this name locally'}>
                        {shortenAddress(entry.ownerAddress)}
                      </span>
                    ) : (
                      <Link href={`/names/${entry.name}`}>{formatDmdName(entry.name)}</Link>
                    )}
                  </td>
                  <td>{shortenAddress(entry.ownerAddress)}</td>
                  <td>
                    <span className={`dmd-status-pill dmd-status-pill--${entry.status}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                  </td>
                  <td>{formatDmdDate(entry.createdAt)}</td>
                  <td>{formatDmdDate(entry.expiresAt)}</td>
                  <td className="dmd-owned-actions-cell">
                    {!isModerated && (
                      <div className="dmd-owned-actions-inner">
                        <button
                          type="button"
                          className="dmd-table-btn"
                          title={isUserHidden ? 'Unhide this name for yourself' : 'Hide this name for yourself'}
                          onClick={() => (isUserHidden ? unhideName(entry.name) : hideName(entry.name))}
                        >
                          <i className={`fas ${isUserHidden ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                        </button>
                        <button
                          type="button"
                          className="dmd-table-btn"
                          title="Report this name"
                          onClick={() => setReportName(entry.name)}
                        >
                          <i className="fas fa-flag"></i>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="dmd-modal dmd-directory-filter-modal">
          <h2><i className="fas fa-filter"></i> Filter DMD Names</h2>

          <div className="dmd-directory-filter-group">
            <h4>Status</h4>
            <label>
              <input
                type="checkbox"
                checked={draftFilters.statusActive}
                onChange={(e) => setDraftFilters((f) => ({ ...f, statusActive: e.target.checked }))}
              />
              Active
            </label>
            <label>
              <input
                type="checkbox"
                checked={draftFilters.statusInactive}
                onChange={(e) => setDraftFilters((f) => ({ ...f, statusInactive: e.target.checked }))}
              />
              Inactive
            </label>
          </div>

          <div className="dmd-directory-filter-group">
            <h4>Created on</h4>
            <div className="dmd-directory-filter-daterow">
              <label>From
                <DateField
                  value={draftFilters.createdFrom}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, createdFrom: v }))}
                />
              </label>
              <label>To
                <DateField
                  value={draftFilters.createdTo}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, createdTo: v }))}
                />
              </label>
            </div>
          </div>

          <div className="dmd-directory-filter-group dmd-directory-filter-group--last">
            <h4>Expires on</h4>
            <div className="dmd-directory-filter-daterow">
              <label>From
                <DateField
                  value={draftFilters.expiresFrom}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, expiresFrom: v }))}
                />
              </label>
              <label>To
                <DateField
                  value={draftFilters.expiresTo}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, expiresTo: v }))}
                />
              </label>
            </div>
          </div>

          <div className="dmd-modal-actions">
            <button type="button" className="btn-secondary" onClick={resetDraft}>Reset</button>
            <button type="button" className="btn-secondary" onClick={clearFilters}>Clear all</button>
            <button type="button" className="btn-primary" onClick={applyFilters}>Apply filters</button>
          </div>
        </div>
      </Modal>

      <div className="dmd-directory-footer">
        <span className="dmd-directory-showing">
          {total === 0 ? 'No names found' : `Showing ${rangeStart} to ${rangeEnd} of ${total} names`}
        </span>

        <div className="dmd-directory-sort">
          <label>Sort by</label>
          <SelectField
            value={sortValue}
            onChange={(v) => { setSortValue(v); setPage(1); }}
            options={SORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>

        <div className="dmd-directory-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <SelectField
            value={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
            options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: `${size}/page` }))}
          />
        </div>
      </div>

      <RegisterNameModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        name={registerName}
        availability={registerAvailability}
        currentName={registeredName}
        onComplete={handleRegistered}
      />

      <ReportNameModal
        isOpen={!!reportName}
        onClose={() => setReportName(null)}
        name={reportName ?? ''}
      />
    </div>
  );
}
