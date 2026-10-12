'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Modal from '@/components/Modal';
import { clientApiGet } from '@/lib/apiClient';
import { usePrivacyMode } from '@/contexts/PrivacyMode';
import { truncateAddress, formatEpochEndDate } from '@/utils/common';
import { formatApy, formatCount, formatDmd } from '@/utils/format';
import logger from '@/utils/logger';
import type { NodeEpochReward, NodeEpochRewardsResponse } from '@/types/rewards';
import '../RewardsHistory/RewardsHistoryModal.css';

interface NodeRewardsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  validatorAddress: string;
}

const LIMIT = 100;

const NodeRewardsHistoryModal: React.FC<NodeRewardsHistoryModalProps> = ({
  isOpen,
  onClose,
  validatorAddress,
}) => {
  const [rewards, setRewards] = useState<NodeEpochReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const { isPrivacyMode } = usePrivacyMode();

  const fetchRewards = async () => {
    if (isPrivacyMode) {
      setError('Not available in Privacy Mode');
      return;
    }
    if (!validatorAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const addr = validatorAddress.toLowerCase();
      const offset = page * LIMIT;
      const response = await clientApiGet<NodeEpochRewardsResponse>(
        `node/${addr}/epoch-rewards?limit=${LIMIT}&offset=${offset}`
      );

      if (!response.ok) {
        setError(response.error || `Failed to fetch rewards (${response.status})`);
        setRewards([]);
        setTotalCount(0);
      } else {
        setRewards(response.data.data || []);
        setTotalCount(response.data.count || 0);
      }
    } catch (err) {
      logger.error('Error fetching validator rewards history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rewards history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && validatorAddress) {
      fetchRewards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, validatorAddress, page]);

  useEffect(() => {
    if (!isOpen) {
      setPage(0);
      setRewards([]);
      setError(null);
    }
  }, [isOpen]);

  const totalPages = Math.ceil(totalCount / LIMIT);

  const tableRows = useMemo(
    () => [...rewards].sort((a, b) => b.epoch - a.epoch),
    [rewards]
  );

  const escapeCsvField = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const handleExportCsv = async () => {
    if (isPrivacyMode || !validatorAddress || isExporting) return;

    setIsExporting(true);
    setError(null);

    try {
      const addr = validatorAddress.toLowerCase();
      const exportLimit = 200;
      let offset = 0;
      let expectedCount = Infinity;
      const allRewards: NodeEpochReward[] = [];

      while (allRewards.length < expectedCount) {
        const response = await clientApiGet<NodeEpochRewardsResponse>(
          `node/${addr}/epoch-rewards?limit=${exportLimit}&offset=${offset}`
        );

        if (!response.ok) {
          throw new Error(response.error || `Failed to fetch rewards (${response.status})`);
        }

        const batch = response.data.data || [];
        allRewards.push(...batch);
        expectedCount = response.data.count || 0;
        offset += exportLimit;

        if (batch.length === 0) break;
      }

      const rows = [...allRewards].sort((a, b) => b.epoch - a.epoch);
      const header = ['Epoch', 'Date', 'Total (DMD)', 'Owner (DMD)', 'Delegators (DMD)', 'APY (%)', 'Pool stake (DMD)'];
      const lines = [header.join(',')];

      for (const entry of rows) {
        lines.push([
          entry.epoch,
          formatEpochEndDate(entry.epoch_end_time),
          parseFloat(entry.total_pool_reward).toFixed(4),
          parseFloat(entry.owner_reward).toFixed(4),
          parseFloat(entry.delegators_total_reward).toFixed(4),
          parseFloat(entry.epoch_apy).toFixed(2),
          parseFloat(entry.total_staked_snapshot).toFixed(4),
        ].map(escapeCsvField).join(','));
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pool-rewards-${addr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error exporting rewards history:', err);
      setError(err instanceof Error ? err.message : 'Failed to export rewards history');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="rewards-history-modal">
      <div className="rewards-history-container">
        <div className="rewards-history-header">
          <h2 className="rewards-history-title">Rewards History</h2>
          <button
            className="rewards-history-export-btn"
            onClick={handleExportCsv}
            disabled={isPrivacyMode || isLoading || isExporting || totalCount === 0}
          >
            <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        <p className="rewards-history-subtitle">
          Per-epoch pool rewards for {truncateAddress(validatorAddress)}
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
            <div className="rewards-history-list-section">
              <table className="rewards-history-table">
                <thead>
                  <tr>
                    <th>Epoch</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Owner</th>
                    <th>Delegators</th>
                    <th>APY</th>
                    <th>Pool stake</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((entry, i) => (
                    <tr key={`${entry.epoch}-${i}`}>
                      <td>{formatCount(entry.epoch)}</td>
                      <td>{formatEpochEndDate(entry.epoch_end_time)}</td>
                      <td>{formatDmd(entry.total_pool_reward)}</td>
                      <td>{formatDmd(entry.owner_reward)}</td>
                      <td>{formatDmd(entry.delegators_total_reward)}</td>
                      <td>{formatApy(entry.epoch_apy)}</td>
                      <td>{formatDmd(entry.total_staked_snapshot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

export default NodeRewardsHistoryModal;
