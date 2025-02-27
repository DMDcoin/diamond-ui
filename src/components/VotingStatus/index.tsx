import React from 'react';
import styles from './styles.module.css';
import BigNumber from 'bignumber.js';
import { TotalVotingStats } from '../../contexts/DaoContext/types';

interface VotingStatusProps {
  votingStats: TotalVotingStats;
  requiredPercentage: number;
  totalStake: number;
}

const VotingStatus: React.FC<VotingStatusProps> = ({
  votingStats,
  totalStake,
  requiredPercentage,
}) => {
  // Calculate percentages
  const yesPercentage = BigNumber(votingStats.positive).dividedBy(totalStake).multipliedBy(100);
  const noPercentage = BigNumber(votingStats.negative).dividedBy(totalStake).multipliedBy(100);
  const exceedingYesPercentage = votingStats.positive.minus(votingStats.negative).dividedBy(totalStake).multipliedBy(100);

  // Calculate the position of the threshold marker
  const thresholdPosition = noPercentage.plus(requiredPercentage);

  return (
    <div style={{ width: '100%' }}>
      {/* Voting Bar Container */}
      <div className={styles.votingBarContainer}>
        <div className={styles.votingBar}>
          <div
            className={styles.yesVotes}
            style={{ width: `${exceedingYesPercentage}%` }}
          ></div>
          <div
            className={styles.noVotes}
            style={{ width: `${noPercentage}%` }}
          ></div>
        </div>
        <div
          className={styles.thresholdMarker}
          style={{ left: `${thresholdPosition}%` }}
        ></div>
        {/* <p
          className={styles.markerLabel}
          style={{ left: `${thresholdPosition.minus(6)}%` }}
        >
          Required ({requiredPercentage}%)
        </p> */}
        <div className={styles.legend}>
          <div>
            <span style={{ color: '#4CAF50' }}>■</span> Exceeding yes (Yes - No)
          </div>
          <div>
            <span style={{ color: '#f44336' }}>■</span> No Votes
          </div>
          <div>
            <span style={{ color: 'yellow' }}>■</span> Acceptance Threshold
          </div>
        </div>
      </div>

      {/* Table for displaying details */}
      <p style={{ textAlign: 'center' }}>
        <table className={styles.table}>
          <tbody>
            <tr>
              <td>Total Stake</td>
              <td>{BigNumber(totalStake).dividedBy(10**18).toFixed(4)} DMD (100%)</td>
            </tr>
            <tr>
              <td>Yes Votes</td>
              <td>{BigNumber(votingStats.positive).dividedBy(10**18).toFixed(4)} DMD ({yesPercentage.toFixed(4)}%)</td>
            </tr>
            <tr>
              <td>No Votes</td>
              <td>{BigNumber(votingStats.negative).dividedBy(10**18).toFixed(4)} DMD ({noPercentage.toFixed(4)}%)</td>
            </tr>
            <tr>
              <td>Exceeding Yes</td>
              <td>
                {BigNumber(votingStats.positive).minus(votingStats.negative).dividedBy(10**18).toFixed(4)} DMD ({exceedingYesPercentage.toFixed(4)}% | {requiredPercentage}% required)
              </td>
            </tr>
            <tr>
              <td>Participation</td>
              <td>{votingStats.total.dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD ({BigNumber(votingStats.total).dividedBy(totalStake).multipliedBy(100).toFixed(4)}% | {requiredPercentage}% required)</td>
            </tr>
          </tbody>
        </table>
      </p>
    </div>
  );
};

export default VotingStatus;