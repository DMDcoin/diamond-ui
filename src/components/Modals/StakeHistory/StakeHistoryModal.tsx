'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Modal from '@/components/Modal';
import { clientApiGet } from '@/lib/apiClient';
import { usePrivacyMode } from '@/contexts/PrivacyMode';
import './StakeHistoryModal.css';
import { toast } from 'react-toastify';
import { BarChart } from '@/components/Charts';
import logger from '@/utils/logger';
import { formatCount, formatDmdFromWei } from '@/utils/format';

interface StakeTransaction {
  id: number;
  block_number: number;
  block_timestamp: string;
  action_type: string;
  pool_address: string;
  staker_address: string;
  to_pool_address: string | null;
  caller_address: string | null;
  amount: string;
  staking_epoch: number;
  is_delegator_stake: boolean;
}

interface StakeHistoryResponse {
  data: StakeTransaction[];
  count: number;
  limit: number;
  offset: number;
}

type StakeHistoryMode = 'node' | 'staker';

interface StakeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  mode: StakeHistoryMode;
  delegatorFilter?: boolean;
}

type ActionFilter = 'all' | string;

const PAGE_SIZE = 200;

const ACTION_TYPE_LABELS: Record<string, string> = {
  PlacedStake: 'Placed Stake',
  WithdrewStake: 'Withdrew Stake',
//   OrderedWithdrawal: 'Ordered Withdrawal',
//   ClaimedOrderedWithdrawal: 'Claimed Withdrawal',
//   MovedStake: 'Moved Stake',
//   GatherAbandonedStakes: 'Gathered Abandoned',
};

const STAKE_IN_TYPES = new Set(['PlacedStake', 'ClaimedOrderedWithdrawal']);
const STAKE_OUT_TYPES = new Set(['WithdrewStake', 'OrderedWithdrawal']);

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getActionClass(actionType: string): string {
  if (STAKE_IN_TYPES.has(actionType)) return 'stake-in';
  if (STAKE_OUT_TYPES.has(actionType)) return 'stake-out';
  if (actionType === 'MovedStake') return 'stake-move';
  return 'stake-neutral';
}

function getActionIcon(actionType: string): string {
  switch (actionType) {
    case 'PlacedStake': return 'fa-arrow-down';
    case 'WithdrewStake': return 'fa-arrow-up';
    case 'OrderedWithdrawal': return 'fa-clock';
    case 'ClaimedOrderedWithdrawal': return 'fa-check-circle';
    case 'MovedStake': return 'fa-exchange-alt';
    case 'GatherAbandonedStakes': return 'fa-broom';
    default: return 'fa-circle';
  }
}

function formatTimestamp(value: string): string {
  try {
    const ts = Number(value);
    const d = !isNaN(ts) && ts > 0 ? new Date(ts * 1000) : new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

const StakeHistoryModal: React.FC<StakeHistoryModalProps> = ({
  isOpen,
  onClose,
  address,
  mode,
  delegatorFilter,
}) => {
  const [transactions, setTransactions] = useState<StakeTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const { isPrivacyMode } = usePrivacyMode();

  const fetchHistory = useCallback(async (page: number, filter: ActionFilter) => {
    if (isPrivacyMode) {
      setError('Stake history is not available in Privacy Mode');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const offset = page * PAGE_SIZE;
      let endpoint = `${mode}/${address}/stake-transactions?limit=${PAGE_SIZE}&offset=${offset}`;
      if (filter !== 'all') {
        endpoint += `&action_type=${filter}`;
      }

      const response = await clientApiGet<StakeHistoryResponse>(endpoint);

      if (!response.ok && !response.rateLimited) {
        toast.error(response.error || `Failed to fetch stake history: ${response.status}`);
        setError(response.error || 'Failed to fetch stake history');
        return;
      }

      setTransactions(response.data.data || []);
      setTotalCount(response.data.count || 0);
    } catch (err) {
      logger.error('Error fetching stake history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stake history');
    } finally {
      setIsLoading(false);
    }
  }, [address, mode, isPrivacyMode]);

  useEffect(() => {
    if (isOpen && address) {
      setCurrentPage(0);
      setActionFilter('all');
      fetchHistory(0, 'all');
    }
  }, [isOpen, address, fetchHistory]);

  const handleFilterChange = (filter: ActionFilter) => {
    setActionFilter(filter);
    setCurrentPage(0);
    fetchHistory(0, filter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchHistory(page, actionFilter);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Apply delegator filter if specified
  const filteredTransactions = useMemo(() => {
    if (delegatorFilter === undefined) return transactions;
    return transactions.filter(tx => tx.is_delegator_stake === delegatorFilter);
  }, [transactions, delegatorFilter]);

  // Aggregate amounts by epoch
  const chartData = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return [];

    const epochMap = new Map<number, { stakeIn: number; stakeOut: number }>();

    for (const tx of filteredTransactions) {
      const epoch = tx.staking_epoch;
      if (!epochMap.has(epoch)) {
        epochMap.set(epoch, { stakeIn: 0, stakeOut: 0 });
      }
      const entry = epochMap.get(epoch)!;
      const padded = tx.amount.padStart(19, '0');
      const whole = padded.slice(0, padded.length - 18) || '0';
      const fracStr = padded.slice(padded.length - 18, padded.length - 16);
      const dmd = Number(whole) + Number(fracStr) / 100;

      if (STAKE_IN_TYPES.has(tx.action_type)) {
        entry.stakeIn += dmd;
      } else if (STAKE_OUT_TYPES.has(tx.action_type)) {
        entry.stakeOut += dmd;
      } else if (tx.action_type === 'MovedStake') {
        entry.stakeOut += dmd;
      }
    }

    return Array.from(epochMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([epoch, vals]) => ({
        name: `Epoch ${epoch}`,
        epoch,
        stakeIn: Math.round(vals.stakeIn * 100) / 100,
        stakeOut: Math.round(vals.stakeOut * 100) / 100,
      }));
  }, [transactions]);

  // Sort transactions latest first
  const sortedTransactions = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return [];
    return [...filteredTransactions].sort((a, b) => b.block_number - a.block_number);
  }, [filteredTransactions]);

  // display count of filtered set
  // instead of the raw server total
  const displayedCount = delegatorFilter === undefined ? totalCount : filteredTransactions.length;

  const title = mode === 'node'
    ? (delegatorFilter === true ? 'Delegated Stake History' : delegatorFilter === false ? 'Validator Stake History' : 'Validator Stake History')
    : 'My Stake History';
  const subtitle = mode === 'node'
    ? (delegatorFilter === true
        ? 'Stake/unstake activity from delegators on this pool'
        : delegatorFilter === false
          ? 'Stake changes for the validator\'s own wallet'
          : 'All stake events on this validator pool')
    : 'Your staking activity across all validators';

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="stake-history-modal">
      <div className="stake-history-container">

        <div className="stake-history-header">
          <h2 className="stake-history-title">
            <i className="fas fa-history"></i>
            {title}
          </h2>
        </div>

        <p className="stake-history-subtitle">{subtitle}</p>

        {/* Action type filter */}
        {!error && (
          <div className="stake-history-filters">
            <button
              className={`filter-button ${actionFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                className={`filter-button ${actionFilter === key ? 'active' : ''} ${getActionClass(key)}`}
                onClick={() => handleFilterChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="stake-history-loading">
            <div className="spinner"></div>
            <p>Loading stake history...</p>
          </div>
        )}

        {error && (
          <div className="stake-history-error">
            <i className="fas fa-exclamation-circle"></i>
            <p>Unavailable</p>
          </div>
        )}

        {!isLoading && !error && displayedCount === 0 && (
          <div className="stake-history-empty">
            <i className="fas fa-inbox"></i>
            <p>No stake history available</p>
          </div>
        )}

        {!isLoading && !error && displayedCount > 0 && (
          <div className="stake-history-dual-view">

            {/* Chart Section */}
            {chartData.length > 0 && (
              <div className="stake-history-chart-section">
                <div className="chart-wrapper">
                  <BarChart
                    data={chartData}
                    xAxisKey="epoch"
                    xAxisType="number"
                    barSize={20}
                    bars={[
                      { dataKey: 'stakeIn', name: 'Stake In (DMD)' },
                      { dataKey: 'stakeOut', name: 'Stake Out (DMD)' },
                    ]}
                    config={{ height: 250 }}
                    xAxisLabel="Epoch"
                    yAxisLabel="DMD"
                    tooltipLabelFormatter={(value) => `Epoch ${value}`}
                    className="chart-fade-in"
                  />
                </div>
              </div>
            )}

            {/* Transaction List */}
            <div className="stake-history-list-section">
              <div className="bs-section-header">
                <h3 className="section-title">
                  <i className="fas fa-list"></i>
                  Transactions
                </h3>
                <span className="event-count">{displayedCount} total</span>
              </div>
              <div className="stake-history-list">
                {sortedTransactions.map((tx, index) => (
                  <div key={`${tx.id}-${index}`} className={`stake-entry ${getActionClass(tx.action_type)}`}>
                    <div className="stake-entry-header">
                      <span className="stake-entry-epoch">
                        <i className="fas fa-layer-group"></i> Epoch {tx.staking_epoch}
                      </span>
                      <span className="stake-entry-time">
                        {formatTimestamp(tx.block_timestamp)}
                      </span>
                    </div>

                    <div className="stake-entry-body">
                      <div className="stake-action-row">
                        <span className={`stake-action-badge ${getActionClass(tx.action_type)}`}>
                          <i className={`fas ${getActionIcon(tx.action_type)}`}></i>
                          {ACTION_TYPE_LABELS[tx.action_type] || tx.action_type}
                        </span>
                        <span className="stake-amount">
                          {formatDmdFromWei(tx.amount)}
                        </span>
                      </div>

                      <div className="stake-addresses">
                        {mode === 'staker' && (
                          <span className="stake-addr" title={tx.pool_address}>
                            <i className="fas fa-server"></i> Pool: {truncateAddr(tx.pool_address)}
                          </span>
                        )}
                        {mode === 'node' && (
                          <span className="stake-addr" title={tx.staker_address}>
                            <i className="fas fa-user"></i> Staker: {truncateAddr(tx.staker_address)}
                            {tx.is_delegator_stake ? <span className="delegator-badge">Delegator</span> : <span className="own-badge">Own</span>}
                          </span>
                        )}
                        {tx.to_pool_address && (
                          <span className="stake-addr" title={tx.to_pool_address}>
                            <i className="fas fa-arrow-right"></i> To: {truncateAddr(tx.to_pool_address)}
                          </span>
                        )}
                      </div>

                      <div className="stake-meta">
                        <span className="stake-block" title={`Block #${tx.block_number}`}>
                          Block #{formatCount(tx.block_number)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="stake-history-pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 0}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="pagination-info">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StakeHistoryModal;
