import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import BigNumber from 'bignumber.js';
import { useRouter, useSearchParams } from 'next/navigation';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import StakeModal from '../Modals/Stake/StakeModal';
import UnstakeModal from '../Modals/Unstake/UnstakeModal';
import OrderedStakeTag, { isOrderClaimable } from '../OrderedStakeTag';
import RecoverAbandonedStakesModal from '../Modals/RecoverAbandonedStakes/RecoverAbandonedStakesModal';
import ColumnsFilterModal from '../ColumnsFilter';
import { useWeb3Context } from '../../contexts/Web3';
import { useStakingContext } from '../../contexts/Staking';
import { useTheme } from '../../hooks';
import { truncateAddress } from '../../utils/common';
import { getThemeImagePath } from '../../utils/imageUtils';
import Image from 'next/image';
import InfoTooltip from '../InfoTooltip';
import { useIsPrivacyMode } from '@/contexts';
import type { BatchNodeRewardStats } from '@/types/rewards';
import { getCachedBatchNodeStats } from '@/lib/rewardStatsCache';
import ValidatorCell from '../ValidatorCell';
import { Aep30Bar } from '../Aep30Badge';
import StakeCell from '../StakeCell';
import Rpt30Cell from '../Rpt30Cell';
import { useDmdNamesForAddresses } from '@/hooks/useDmdNamesForAddresses';
import { stripDmdSuffix } from '@/utils/dmdNaming';
import { formatApy, formatCount, formatDmd, formatDmdFromWei, formatPercent } from '@/utils/format';

const SORT_PILLS = [
  { key: 'rpt30',      label: 'Highest RpT30',       icon: 'fa-trophy',        direction: 'descending' },
  { key: 'apy',        label: 'Highest APY',          icon: 'fa-percent',       direction: 'descending' },
  { key: 'totalStake', label: 'Lowest Saturation',    icon: 'fa-gauge',         direction: 'ascending'  },
  { key: 'aep30',      label: 'Most Active',          icon: 'fa-shield',        direction: 'descending' },
] as const;

interface TableField {
  key: string;
  label: string;
  sortAble: boolean;
  updateAble: boolean;
  hide: boolean;
}

const tableFieldsDefault: TableField[] = [
  { key: "isActive", label: "Status", sortAble: true, updateAble: true, hide: false },
  { key: "stakingAddress", label: "Validator", sortAble: false, updateAble: true, hide: false },
  { key: "rpt30", label: "RpT30", sortAble: true, updateAble: true, hide: false },
  { key: "apy", label: "APY", sortAble: true, updateAble: true, hide: false },
  { key: "aep30", label: "AEP30", sortAble: true, updateAble: true, hide: false },
  { key: "totalStake", label: "Stake", sortAble: true, updateAble: true, hide: false },
  { key: "myStake", label: "My Stake", sortAble: true, updateAble: false, hide: false },
  { key: "stakeBtn", label: "", sortAble: false, updateAble: false, hide: false },
  { key: "unstakeClaimBtn", label: "", sortAble: false, updateAble: false, hide: false },
  // Optional / hidden by default
  { key: "score", label: "Score", sortAble: true, updateAble: true, hide: true },
  { key: "votingPower", label: "Voting Power", sortAble: true, updateAble: true, hide: true },
  { key: "connectivityReport", label: "CR", sortAble: true, updateAble: true, hide: true },
  { key: "vos30", label: "VOS30", sortAble: true, updateAble: true, hide: true },
  { key: "miningAddress", label: "Miner address", sortAble: false, updateAble: true, hide: true },
  { key: "miningPublicKey", label: "Public Key", sortAble: false, updateAble: true, hide: true },
];


export default function Validators() {
  const { userWallet } = useWeb3Context();
  const { pools, stakingEpoch, delegatorMinStake, candidateMinStake, abandonedPools, stakesSyncedFor } = useStakingContext();
  const router = useRouter();
  const theme = useTheme();
  const isPrivacyMode = useIsPrivacyMode();

  const isAbandoned = useCallback(
    (pool: { stakingAddress?: string }) => !!pool.stakingAddress && !!abandonedPools[pool.stakingAddress.toLowerCase()],
    [abandonedPools]
  );

  /**
   * Pools holding less than the minimum candidate stake are hidden from the
   * list and its counters, but remain visible to the owner and delegates.
   */
  const visiblePools = useMemo(() => {
    const myAddr = userWallet.myAddr?.toLowerCase();
    return pools.filter(pool =>
      BigNumber(pool.totalStake ?? 0).isGreaterThanOrEqualTo(candidateMinStake) ||
      BigNumber(pool.myStake ?? 0).isGreaterThan(0) ||
      (!!myAddr && pool.stakingAddress?.toLowerCase() === myAddr) ||
      isAbandoned(pool)
    );
  }, [pools, candidateMinStake, userWallet.myAddr, isAbandoned]);

  const abandonedCount = useMemo(
    () => visiblePools.filter(pool => isAbandoned(pool)).length,
    [visiblePools, isAbandoned]
  );

  const isSyncingMyStakes = !!userWallet.myAddr && stakesSyncedFor !== userWallet.myAddr;

  const getImagePath = (filename: string) => {
    return getThemeImagePath(filename, theme);
  };

  // State management
  const [currentPage, setCurrentPage] = useState(0);
  const [filter, setFilter] = useState<'default' | 'valid' | 'active' | 'invalid' | 'stakedOn' | 'abandoned'>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string } | null>(null);
  const [tableFields, setTableFields] = useState<TableField[]>(tableFieldsDefault);
  const [rewardStatsMap, setRewardStatsMap] = useState<Record<string, BatchNodeRewardStats>>({});
  const [isLoadingRewardStats, setIsLoadingRewardStats] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  // Horizontal scroll affordances for the table on narrow viewports
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Fixed-position coordinates for the floating scroll buttons so they stay
  // pinned to the table's edges and centered in the viewport while scrolling.
  const [scrollBtnPos, setScrollBtnPos] = useState<{ left: number; right: number; top: number; inView: boolean }>({
    left: 0,
    right: 0,
    top: 0,
    inView: false,
  });

  const updateScrollAffordance = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < maxScroll - 2);

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // Center the buttons on the portion of the table that is currently visible
    // in the viewport, so they always stay within the table's vertical bounds.
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, vh);
    const EDGE_INSET = 10; // keep the buttons just inside the table edges
    setScrollBtnPos({
      left: rect.left + EDGE_INSET,
      right: Math.max(0, vw - rect.right) + EDGE_INSET,
      top: (visibleTop + visibleBottom) / 2,
      inView: visibleBottom - visibleTop > 60,
    });
  }, []);

  const scrollTable = (direction: 1 | -1) => {
    const el = tableScrollRef.current;
    if (!el) return;
    const amount = Math.max(240, Math.round(el.clientWidth * 0.6));
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  // Persist itemsPerPage from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('validatorsPerPage');
    const n = saved ? parseInt(saved, 10) : NaN;
    if ([5, 10, 25, 50, 100].includes(n)) setItemsPerPage(n);
  }, []);

  const visibleFields = useMemo(() => tableFields.filter(field => !field.hide), [tableFields]);

  // Load table fields from localStorage.
  useEffect(() => {
    const STORAGE_KEY = 'validatorFieldsData_v2';
    localStorage.removeItem('validatorFieldsData');
    const storedTableFields = localStorage.getItem(STORAGE_KEY);
    if (storedTableFields) {
      try {
        const parsed: TableField[] = JSON.parse(storedTableFields);
        // If stored config doesn't match the current set of keys, reset to defaults.
        const storedKeys = new Set(parsed.map(f => f.key));
        const defaultKeys = tableFieldsDefault.map(f => f.key);
        const keysMatch = defaultKeys.length === parsed.length && defaultKeys.every(k => storedKeys.has(k));
        if (!keysMatch) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tableFieldsDefault));
          setTableFields(tableFieldsDefault);
        } else {
          setTableFields(parsed);
        }
      } catch {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tableFieldsDefault));
        setTableFields(tableFieldsDefault);
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tableFieldsDefault));
    }
  }, []);

  // Fetch reward stats for all pools via shared cached layer
  useEffect(() => {
    if (!visiblePools.length || isPrivacyMode) return;
    setIsLoadingRewardStats(true);
    const addresses = visiblePools.map(p => p.stakingAddress.toLowerCase());
    getCachedBatchNodeStats(addresses)
      .then(results => setRewardStatsMap(results))
      .catch(() => {})
      .finally(() => setIsLoadingRewardStats(false));
  }, [visiblePools, isPrivacyMode]);

  // Apply filter from URL search params (e.g. ?filter=stakedOn)
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      const param = searchParams?.get('filter');
      if (param && ['default', 'valid', 'active', 'invalid', 'stakedOn', 'abandoned'].includes(param)) {
        setFilter(param as typeof filter);
        setCurrentPage(0);
      }

      // Sorting with URL params, e.g. ?sort=myStake&direction=descending
      const rawSortKey = searchParams?.get('sort');
      const sortKey = rawSortKey === 'saturation' ? 'totalStake' : rawSortKey;
      const dirParam = searchParams?.get('direction') || searchParams?.get('dir');
      const direction = dirParam === 'descending' || dirParam === 'asc' || dirParam === 'desc' || dirParam === 'ascending'
        ? (dirParam === 'asc' ? 'ascending' : dirParam === 'desc' ? 'descending' : dirParam)
        : undefined;

      if (sortKey && tableFieldsDefault.some(tf => tf.key === sortKey && tf.sortAble)) {
        setSortConfig({ key: sortKey, direction: direction || 'descending' });
      }
    } catch (e) {}
  }, [searchParams]);

  // Update localStorage when table fields change
  useEffect(() => {
    localStorage.setItem('validatorFieldsData_v2', JSON.stringify(tableFields));
  }, [tableFields]);

  // Keep horizontal scroll buttons in sync with the table's scroll state
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const rafIds: number[] = [];
    rafIds.push(requestAnimationFrame(() => {
      updateScrollAffordance();
      rafIds.push(requestAnimationFrame(() => updateScrollAffordance()));
    }));

    el.addEventListener('scroll', updateScrollAffordance, { passive: true });
    window.addEventListener('scroll', updateScrollAffordance, { passive: true });
    window.addEventListener('resize', updateScrollAffordance);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateScrollAffordance());
      ro.observe(el);
      const innerTable = el.querySelector('table');
      if (innerTable) ro.observe(innerTable);
    }

    return () => {
      rafIds.forEach(id => cancelAnimationFrame(id));
      el.removeEventListener('scroll', updateScrollAffordance);
      window.removeEventListener('scroll', updateScrollAffordance);
      window.removeEventListener('resize', updateScrollAffordance);
      if (ro) ro.disconnect();
    };
  }, [updateScrollAffordance, tableFields, visiblePools, filter, itemsPerPage, currentPage, searchTerm, sortConfig]);

  // Handle filter changes
  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(event.target.value as typeof filter);
    setCurrentPage(0);
  };

  // Handle search changes
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(0);
  };

  // Copy data to clipboard
  const copyData = useCallback((e: React.MouseEvent<HTMLDivElement>, data: string, msg: string) => {
    e.stopPropagation();
    copy(data);
    toast.success(msg);
  }, []);

  const dmdNames = useDmdNamesForAddresses(visiblePools.map(p => p.stakingAddress).filter(Boolean));

  // Filter and process pools
  let poolsCopy = [...visiblePools];

  if (filter === 'valid') {
    poolsCopy = poolsCopy.filter(pool => pool.isToBeElected && !pool.isActive);
  } else if (filter === 'active') {
    poolsCopy = poolsCopy.filter(pool => pool.isActive);
  } else if (filter === 'invalid') {
    poolsCopy = poolsCopy.filter(pool => !pool.isActive && !pool.isToBeElected);
  } else if (filter === 'stakedOn') {
    poolsCopy = poolsCopy.filter(pool => BigNumber(pool.myStake).isGreaterThan(0));
  } else if (filter === 'abandoned') {
    poolsCopy = poolsCopy.filter(pool => isAbandoned(pool));
  }

  if (searchTerm.trim() !== '') {
    const query = searchTerm.trim().toLowerCase();
    // Names are stored bare but shown with the .dmd suffix, so accept either.
    const nameQuery = stripDmdSuffix(query);
    poolsCopy = poolsCopy.filter(pool => {
      const name = pool.stakingAddress ? dmdNames[pool.stakingAddress.toLowerCase()] : null;
      return (
        pool.stakingAddress.toLowerCase().includes(query) ||
        (pool.miningAddress && pool.miningAddress.toLowerCase().includes(query)) ||
        (!!name && !!nameQuery && name.toLowerCase().includes(nameQuery))
      );
    });
  }

  // Apply sorting
  if (sortConfig !== null) {
    if (['rpt30', 'apy', 'aep30', 'vos30', 'totalStake'].includes(sortConfig.key)) {
      const getVal = (pool: any): number => {
        const stats = rewardStatsMap[pool.stakingAddress.toLowerCase()];
        if (sortConfig.key === 'totalStake') {
          return BigNumber(pool.totalStake || 0).dividedBy(10 ** 18).toNumber();
        }
        if (!stats) return -Infinity;
        if (sortConfig.key === 'rpt30') return stats.rpt30;
        if (sortConfig.key === 'apy') return stats.estimated_apy;
        if (sortConfig.key === 'aep30') return stats.aep30;
        if (sortConfig.key === 'vos30') return stats.vos30;
        return 0;
      };
      poolsCopy.sort((a, b) =>
        sortConfig.direction === 'ascending' ? getVal(a) - getVal(b) : getVal(b) - getVal(a)
      );
    } else {
      poolsCopy.sort((a: any, b: any) => {
        let keyA, keyB;

        if (sortConfig.key === 'myStake' || sortConfig.key === 'score' || sortConfig.key === 'connectivityReport') {
          keyA = parseFloat(a[sortConfig.key] || '0');
          keyB = parseFloat(b[sortConfig.key] || '0');
        } else {
          keyA = a[sortConfig.key];
          keyB = b[sortConfig.key];
        }

        if (keyA < keyB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (keyA > keyB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
  }

  const abandonedRows = poolsCopy.filter(pool => isAbandoned(pool));
  if (abandonedRows.length && abandonedRows.length !== poolsCopy.length) {
    poolsCopy = [...abandonedRows, ...poolsCopy.filter(pool => !isAbandoned(pool))];
  }

  // Pagination
  const pageCount = Math.ceil(poolsCopy.length / itemsPerPage);
  const offset = currentPage * itemsPerPage;
  const currentItems = poolsCopy.slice(offset, offset + itemsPerPage);

  // Handle page changes
  const handlePageClick = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  // Handle sorting
  const requestSort = (key: string) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Handle row click navigation
  const handleRowClick = (stakingAddress: string) => {
    // For own validator, navigate to profile page
    if (userWallet.myAddr && stakingAddress.toLowerCase() === userWallet.myAddr.toLowerCase()) {
      router.push('/profile');
    } else {
      router.push(`/validators/${stakingAddress}`);
    }
  };

  // Get sort class names
  const getClassNamesFor = (column: string) => {
    if (!sortConfig) {
      return;
    }
    return sortConfig.key === column ? sortConfig.direction : undefined;
  };

  // Get tooltip text
  const getTooltipText = (key: string) => {
    switch (key) {
      case 'isActive':
          return "Active candidate is part of the active set; Valid - is not part of the active set, but can be elected; Invalid - a candidate who is flagged unavailable on the blockchain or has not enough stake.";
      case 'totalStake':
          return "Total delegated DMD (self-staked DMD + delegates' stake), with the bar showing how full the pool is against the 50,000 DMD maximum.";
      case 'votingPower':
          return "Value that approximates a node’s influence in the DAO participation.";
      case 'score':
          return "Combined score value, based on the results of generating the shared key, the stability of the validator connection and misbehaviour reports from other validators.";
      case 'connectivityReport':
          return "Connectivity report value, based on how many other active validators did report bad connectivity towards that node.";
      case 'rpt30':
          return "Historical staking rewards earned per 1000 DMD staked with this validator during the last 30 days. This value excludes the validator owner reward share and represents delegator-focused profitability.";
      case 'apy':
          return "Historical annualized return based on delegator rewards earned during the last 30 days. This value excludes the validator owner reward share and does not guarantee future rewards.";
      case 'aep30':
          return "Percentage of epochs during the last 30 days where this validator was part of the active validator set.";
      case 'vos30':
          return "Total validator owner rewards earned during the last 30 days from the 20% validator owner share.";
      default:
          return "";
    }
  };

  // Render page numbers
  const renderPageNumbers = () => {
    const pageNumbers: React.ReactElement[] = [];
    const WINDOW = 2;
    let prevSkipped = false;
    for (let i = 0; i < pageCount; i++) {
      const isFirst = i === 0;
      const isLast = i === pageCount - 1;
      const near = Math.abs(i - currentPage) <= WINDOW;
      if (!isFirst && !isLast && !near) {
        if (!prevSkipped) {
          pageNumbers.push(<li key={`ell-${i}`} className="pagination-btn pagination-ellipsis" style={{ cursor: 'default', pointerEvents: 'none' }}>…</li>);
          prevSkipped = true;
        }
        continue;
      }
      prevSkipped = false;
      pageNumbers.push(
        <li
          key={i}
          className={currentPage === i ? 'pagination-btn active' : 'pagination-btn'}
          onClick={() => handlePageClick(i)}
        >
          {i + 1}
        </li>
      );
    }
    return pageNumbers;
  };

  // Render table headers
  const renderHeaders = () => {
    return (
      <thead>
        <tr>
          {visibleFields.map((column, index) => {
            // Hide wallet-specific columns when wallet is not connected
            if ((column.key === 'myStake' || column.key === 'stakeBtn' || column.key === 'unstakeClaimBtn') && !userWallet.myAddr) {
              return null;
            }
            const isActionCol = column.key === 'stakeBtn' || column.key === 'unstakeClaimBtn';
            return (
              <th
                key={index}
                className={[getClassNamesFor(column.key), isActionCol ? 'vl-action-cell' : ''].filter(Boolean).join(' ') || undefined}
                onClick={() => column.sortAble && requestSort(column.key)}
                style={{ cursor: column.sortAble ? 'pointer' : 'default' }}
              >
                {column.label}
                {column.sortAble && column.key && column.key !== 'stakingAddress' && column.key !== 'stakeBtn' && column.key !== 'unstakeClaimBtn' && (
                  <>
                    {column.key !== 'myStake' && (
                      <InfoTooltip content={getTooltipText(column.key)}>
                        <i className="fas fa-info-circle" />
                      </InfoTooltip>
                    )}
                    <i className="fas fa-sort"></i>
                  </>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    );
  };

  // Render table rows
  const renderRows = (currentItems: any[]) => {
    return currentItems.map((pool, index) => {
      const abandoned = isAbandoned(pool);
      const isClaimable = isOrderClaimable(pool, stakingEpoch);

      return (
      <tr 
        key={index} 
        className={`validators-table-row${abandoned ? ' vl-row--abandoned' : ''}`}
        onClick={() => handleRowClick(pool.stakingAddress)}
        style={{ cursor: 'pointer' }}
      >
        {visibleFields.map((column, colIndex) => {
          // Hide wallet-specific columns when wallet is not connected
          if ((column.key === 'myStake' || column.key === 'stakeBtn' || column.key === 'unstakeClaimBtn') && !userWallet.myAddr) {
            return null;
          }
          
          if (column.key === 'isActive') {
            return (
              <td key={colIndex}>
                <span className={`status-badge ${abandoned ? 'status-abandoned' : pool.isActive ? 'status-active' : (pool.isToBeElected || pool.isPendingValidator) ? 'status-valid' : 'status-invalid'}`}>
                  {abandoned
                    ? 'Abandoned'
                    : typeof pool.isActive === 'boolean'
                      ? pool.isActive ? 'Active' : (pool.isToBeElected || pool.isPendingValidator) ? "Valid" : "Invalid"
                      : 'Loading...'}
                </span>
              </td>
            );
          } else if (column.key === 'stakingAddress') {
            return (
              <td key={colIndex} className="wallet-address">
                {pool.stakingAddress ? (
                  <ValidatorCell
                    address={pool.stakingAddress}
                    name={dmdNames[pool.stakingAddress.toLowerCase()]}
                    onClick={(e) => { e.stopPropagation(); copyData(e, pool.stakingAddress, 'Copied staking address'); }}
                    onCopy={(addr) => { copy(addr); toast.success('Copied staking address'); }}
                  />
                ) : (
                  <div>Loading...</div>
                )}
              </td>
            );
          } else if (column.key === 'miningAddress') {
            return (
              <td key={colIndex} className="miner-address">
                {pool.miningAddress ? (
                  <div onClick={(e) => copyData(e, pool.miningAddress, "Copied mining address")}>
                    {truncateAddress(pool.miningAddress)}
                  </div>
                ) : (
                  <div>Loading...</div>
                )}
              </td>
            );
          } else if (column.key === 'miningPublicKey') {
            return (
              <td key={colIndex} className="public-key">
                {pool.miningPublicKey ? (
                  <div onClick={(e) => copyData(e, pool.miningPublicKey, "Copied public key")}>
                    {truncateAddress(pool.miningPublicKey)}
                  </div>
                ) : (
                  <div>Loading...</div>
                )}
              </td>
            );
          } else if (column.key === 'rpt30') {
            const stats = rewardStatsMap[pool.stakingAddress.toLowerCase()];
            return (
              <td key={colIndex}>
                {isPrivacyMode ? '—' : isLoadingRewardStats ? '...' : stats ? (
                  <Rpt30Cell rpt30={stats.rpt30} rpt30_delta={stats.rpt30_delta} />
                ) : '—'}
              </td>
            );
          } else if (column.key === 'apy') {
            const stats = rewardStatsMap[pool.stakingAddress.toLowerCase()];
            return (
              <td key={colIndex}>
                {isPrivacyMode ? '—' : isLoadingRewardStats ? '...' : stats ? (
                  <div>
                    <div>{formatApy(stats.estimated_apy)}</div>
                    <div className="vl-apy-sub">estimated</div>
                  </div>
                ) : '—'}
              </td>
            );
          } else if (column.key === 'aep30') {
            const stats = rewardStatsMap[pool.stakingAddress.toLowerCase()];
            return (
              <td key={colIndex}>
                {isPrivacyMode ? '—' : isLoadingRewardStats ? '...' : stats ? (
                  <Aep30Bar aep30={stats.aep30} />
                ) : '—'}
              </td>
            );
          } else if (column.key === 'vos30') {
            const stats = rewardStatsMap[pool.stakingAddress.toLowerCase()];
            return (
              <td key={colIndex}>
                {isPrivacyMode ? '—' : isLoadingRewardStats ? '...' : stats ? formatDmd(stats.vos30) : '—'}
              </td>
            );
          } else if (column.key === 'totalStake') {
            return (
              <td key={colIndex}>
                {pool.totalStake !== undefined && pool.totalStake !== null
                  ? <StakeCell totalStakeWei={pool.totalStake} />
                  : 'Loading...'}
              </td>
            );
          } else if (column.key === 'votingPower') {
            return (
              <td key={colIndex}>
                {pool.votingPower && pool.votingPower.toString() !== 'NaN' && pool.votingPower.toString() !== 'Infinity'
                  ? formatPercent(pool.votingPower)
                  : 'Loading...'}
              </td>
            );
          } else if (column.key === 'score') {
            return (
              <td key={colIndex}>
                {pool.score !== undefined && pool.score !== null ? formatCount(pool.score) : 'Loading...'}
              </td>
            );
          } else if (column.key === 'connectivityReport') {
            return (
              <td key={colIndex}>
                <span className={`cr-value ${pool.isFaultyValidator ? 'cr-danger' : (Number(pool.connectivityReport) > 0 ? 'cr-warning' : 'cr-zero')}`}>
                  {pool.connectivityReport !== undefined && pool.connectivityReport !== null ? formatCount(pool.connectivityReport) : 'Loading...'}
                </span>
              </td>
            );
          } else if (column.key === 'myStake') {
            return (
              <td key={colIndex}>
                <div>
                  {isSyncingMyStakes
                    ? '...'
                    : pool.myStake !== undefined && pool.myStake !== null ? formatDmdFromWei(pool.myStake) : 'Loading...'}
                </div>
                {!isSyncingMyStakes && <OrderedStakeTag pool={pool} />}
              </td>
            );
          } else if (column.key === 'stakeBtn') {
            return (
              <td key={colIndex} className="vl-action-cell" onClick={(e) => e.stopPropagation()}>
                {(pool.isActive || pool.isToBeElected || pool.isPendingValidator) && BigNumber(pool.totalStake ?? 0).isLessThan(BigNumber(50000).multipliedBy(10**18)) && BigNumber(50000).multipliedBy(10**18).minus(BigNumber(pool.totalStake ?? 0)).isGreaterThanOrEqualTo(delegatorMinStake) && (
                  <StakeModal buttonText="Stake" pool={pool} />
                )}
              </td>
            );
          } else if (column.key === 'unstakeClaimBtn') {
            return (
              <td key={colIndex} className="vl-action-cell" onClick={(e) => e.stopPropagation()}>
                {!isSyncingMyStakes && (BigNumber(pool.myStake ?? 0).isGreaterThan(0) || isClaimable) && (
                  <UnstakeModal buttonText="Unstake" pool={pool} />
                )}
              </td>
            );
          } else {
            return <td key={colIndex}></td>;
          }
        })}
      </tr>
      );
    });
  };
  return (
    <>
      {/* Validators Metrics Section */}
      <section className="validators-metrics">
        <div className="container">
          <div className="metrics-grid">
            <div className="metric-card fade-in">
              <div className="metric-icon">
                <Image src={getImagePath("top-validators.png")} alt="" width={100} height={100} />
              </div>
              <div className='metric-content'>
                <p className="metric-value">{visiblePools.length}</p>
                <h3>Total Validators</h3>
              </div>
              <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
            </div>
            <div className="metric-card fade-in">
              <div className="metric-icon">
                <Image src={getImagePath("active-validators.png")} alt="" width={100} height={100} />
              </div>
              <div className='metric-content'>
                <p className="metric-value">{visiblePools.filter((p) => p.isActive).length}</p>
                <h3>Active Validators</h3>
              </div>
              <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
            </div>
            <div className="metric-card fade-in">
              <div className="metric-icon">
                <Image src={getImagePath("valid-validators.png")} alt="" width={100} height={100} />
              </div>
              <div className='metric-content'>
                <p className="metric-value">{visiblePools.filter((p) => p.isToBeElected && !p.isActive).length}</p>
                <h3>Valid Validators</h3>
              </div>
              <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
            </div>
            <div className="metric-card fade-in">
              <div className="metric-icon">
                <Image src={getImagePath("invalid-validators.png")} alt="" width={100} height={100} />
              </div>
              <div className='metric-content'>
                <p className="metric-value">{visiblePools.filter((p) => !p.isActive && !p.isToBeElected).length}</p>
                <h3>Invalid Validators</h3>
              </div>
              <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
            </div>
          </div>
        </div>
      </section>

      {/* Validators Table Section */}
      <section className="validators-table-section">
        <div className="container">
          <div className="validators-controls">
            <div className="search-filter-group">
              <div className="search-container">
                <input 
                  type="text" 
                  placeholder="Search by address or name"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                <button className="search-btn">
                  <i className="fas fa-search"></i>
                </button>
              </div>
              <div className="filter-container">
                <select value={filter} onChange={handleFilterChange}>
                  <option value="default">All Statuses</option>
                  <option value="valid">Valid Candidates</option>
                  <option value="active">Active Candidates</option>
                  <option value="invalid">Invalid Candidates</option>
                  {abandonedCount > 0 && (
                    <option value="abandoned">Abandoned Candidates</option>
                  )}
                  {userWallet.myAddr && (
                    <option value="stakedOn">Candidates I've staked on</option>
                  )}
                </select>
              </div>
            </div>
            {abandonedCount > 0 && (
              <div className="vl-recover-container">
                <RecoverAbandonedStakesModal
                  buttonText="Transfer Abandoned Funds"
                  tooltip="Transfer eligible abandoned validator funds to the DMD treasury after the 10-year abandonment period."
                />
              </div>
            )}
            <div className="customize-container">
              <ColumnsFilterModal
                buttonText="Customize"
                tableFields={tableFields}
                setTableFields={setTableFields}
                defaultFields={tableFieldsDefault}
              />
            </div>
            <div className="vl-quick-sort-pills">
              {SORT_PILLS.map(pill => {
                const active = sortConfig?.key === pill.key;
                return (
                  <button
                    key={pill.key}
                    className={`vl-pill${active ? ' vl-pill--active' : ''}`}
                    onClick={() => setSortConfig(active ? null : { key: pill.key, direction: pill.direction })}
                  >
                    <i className={`fas ${pill.icon}`} aria-hidden="true"></i>
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="validators-table-wrapper">
            <button
              type="button"
              className={`vl-table-scroll-btn vl-table-scroll-btn--left${canScrollLeft && scrollBtnPos.inView ? '' : ' vl-table-scroll-btn--hidden'}`}
              style={{ left: `${scrollBtnPos.left}px`, top: `${scrollBtnPos.top}px` }}
              onClick={() => scrollTable(-1)}
              aria-label="Scroll table left"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              type="button"
              className={`vl-table-scroll-btn vl-table-scroll-btn--right${canScrollRight && scrollBtnPos.inView ? '' : ' vl-table-scroll-btn--hidden'}`}
              style={{ right: `${scrollBtnPos.right}px`, top: `${scrollBtnPos.top}px` }}
              onClick={() => scrollTable(1)}
              aria-label="Scroll table right"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            <div className="validators-table-container" ref={tableScrollRef}>
              <table className="validators-table">
                {renderHeaders()}
                <tbody>
                  {renderRows(currentItems)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination footer */}
          <div className="vl-pagination-footer">
            <span className="vl-pagination-info">
              {poolsCopy.length === 0
                ? 'No results'
                : `Showing ${offset + 1}–${Math.min(offset + itemsPerPage, poolsCopy.length)} of ${poolsCopy.length}`}
            </span>
            {pageCount > 1 && (
              <div className="pagination">
                <button
                  className={`pagination-btn ${currentPage === 0 ? 'disabled' : ''}`}
                  onClick={() => { if (currentPage !== 0) handlePageClick(currentPage - 1); }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                {renderPageNumbers()}
                <button
                  className={`pagination-btn ${currentPage === pageCount - 1 ? 'disabled' : ''}`}
                  onClick={() => { if (currentPage !== pageCount - 1) handlePageClick(currentPage + 1); }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
            <div className="vl-per-page">
              <label>Rows:</label>
              <select
                value={itemsPerPage}
                onChange={e => {
                  const n = parseInt(e.target.value, 10);
                  setItemsPerPage(n);
                  localStorage.setItem('validatorsPerPage', String(n));
                  setCurrentPage(0);
                }}
              >
                {[5, 10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
