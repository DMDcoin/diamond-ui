'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Modal from '@/components/Modal';
import { clientApiGet } from '@/lib/apiClient';
import { usePrivacyMode } from '@/contexts/PrivacyMode';
import { BarChart } from '@/components/Charts';
import { truncateAddress, formatEpochEndDate } from '@/utils/common';
import { formatCount, formatDmd } from '@/utils/format';
import logger from '@/utils/logger';
import type { StakerRewardEntry } from '@/types/rewards';
import './RewardsHistoryModal.css';

interface RewardsHistoryResponse {
  data: StakerRewardEntry[];
  count: number;
  limit: number;
  offset: number;
}

interface RewardsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakerAddress: string;
}

const LIMIT = 100;

const RewardsHistoryModal: React.FC<RewardsHistoryModalProps> = ({
  isOpen,
  onClose,
  stakerAddress,
}) => {
  const [rewards, setRewards] = useState<StakerRewardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { isPrivacyMode } = usePrivacyMode();

  const fetchRewards = async () => {
    if (isPrivacyMode) {
      setError('Not available in Privacy Mode');
      return;
    }
    if (!stakerAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const offset = page * LIMIT;
      const endpoint = `staker/${stakerAddress}/rewards?limit=${LIMIT}&offset=${offset}`;
      const response = await clientApiGet<RewardsHistoryResponse>(endpoint);

      if (!response.ok) {
        setError(response.error || `Failed to fetch rewards (${response.status})`);
        setRewards([]);
        setTotalCount(0);
      } else {
        setRewards(response.data.data || []);
        setTotalCount(response.data.count || 0);
      }
    } catch (err) {
      logger.error('Error fetching rewards history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rewards history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && stakerAddress) {
      fetchRewards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stakerAddress, page]);

  // Reset page when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPage(0);
      setRewards([]);
      setError(null);
    }
  }, [isOpen]);

  const chartData = useMemo(() => {
    return rewards
      .filter(r => r.epoch_end_time != null)
      .map(r => ({
        name: `Epoch ${r.epoch}`,
        epoch: r.epoch,
        reward: parseFloat(r.reward_amount),
        pool: truncateAddress(r.pool_address),
        timestamp: r.epoch_end_time!,
      }))
      .sort((a, b) => a.epoch - b.epoch);
  }, [rewards]);

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="rewards-history-modal">
      <div className="rewards-history-container">
        <div className="rewards-history-header">
          <h2 className="rewards-history-title">Rewards History</h2>
        </div>

        <p className="rewards-history-subtitle">
          Per-epoch rewards earned across all staked validators
        </p>

        {isLoading && (
          <div className="rewards-history-loading">
            <div className="spinner"></div>
            <p>Loading rewards...</p>
          </div>
        )}

        {error && (
          <div className="rewards-history-error">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && rewards.length === 0 && (
          <div className="rewards-history-empty">
            <p>No rewards history available</p>
          </div>
        )}

        {!isLoading && !error && rewards.length > 0 && (
          <div className="rewards-history-dual-view">
            {/* Chart */}
            {chartData.length > 0 && (
              <div className="rewards-history-chart-section">
                <div className="chart-wrapper">
                  <BarChart
                    data={chartData}
                    xAxisKey="epoch"
                    bars={[
                      {
                        dataKey: 'reward',
                        name: 'Reward (DMD)',
                      },
                    ]}
                    config={{ height: 250 }}
                    xAxisLabel="Epoch"
                    yAxisLabel="DMD"
                    className="chart-fade-in"
                  />
                </div>
              </div>
            )}

            {/* Table */}
            <div className="rewards-history-list-section">
              <table className="rewards-history-table">
                <thead>
                  <tr>
                    <th>Epoch</th>
                    <th>Pool</th>
                    <th>Reward</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((entry, i) => (
                    <tr key={`${entry.pool_address}-${entry.epoch}-${i}`}>
                      <td>{formatCount(entry.epoch)}</td>
                      <td>{truncateAddress(entry.pool_address)}</td>
                      <td>{formatDmd(entry.reward_amount)}</td>
                      <td>{formatEpochEndDate(entry.epoch_end_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="rewards-history-pagination">
                <button
                  className="pagination-btn"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="pagination-info">
                  Page {page + 1} of {totalPages} ({totalCount} total)
                </span>
                <button
                  className="pagination-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
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

export default RewardsHistoryModal;
