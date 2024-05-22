import styles from "./styles.module.css";
import { useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { useStakingContext } from "../../../contexts/StakingContext";
import { Pool } from "../../../contexts/StakingContext/models/model";

interface PoolDetailsProps {}

const PoolDetails: React.FC<PoolDetailsProps> = ({}) => {
  const { poolAddress } = useParams();
  const { pools } = useStakingContext();
  const [pool, setPool] = useState<Pool | null>(null);

  useEffect(() => {
    const pool = pools.find((pool) => pool.stakingAddress === poolAddress);
    console.log(pool);
    setPool(pool as Pool);
  }, [poolAddress]);

  return (
    <section className="section">
      <div className="sectionContainer">
        {/* image address status */}
        <div className={styles.infoContainer}>
          <img src="https://via.placeholder.com/50" alt="Image 1" />
          <p>{poolAddress}</p>
          <p>{pool?.isAvailable ? "Active" : "Banned"}</p>
        </div>

        {/* stats table */}
        <div className={styles.statsContainer}>
          <h1>Statistics</h1>

          <table className={styles.styledTable}>
            <thead>
            </thead>
            <tbody>
              <tr>
                <td>Total Stake</td>
                <td>0</td>
              </tr>
              <tr>
                <td>Candidate Stake</td>
                <td>0</td>
              </tr>
              <tr>
                <td>Score</td>
                <td>0</td>
              </tr>
              <tr>
                <td>Voting Power</td>
                <td>{pool?.votingPower.toString()} %</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* delegators table */}
        <div className={styles.delegatorStatsContainer}>
          <h1>Delegators</h1>

          <table className={styles.styledTable}>
            <thead>
              <tr>
                <td></td>
                <td></td>
                <td>Wallet</td>
                <td>Delegated Stake</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                <img src="https://via.placeholder.com/50" alt="Image 1" />
                </td>
                <td>Active</td>
                <td>0x0000000...</td>
                <td>100 DMD</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* dao participation table */}
        <div className={styles.daoParticipationContainer}>
          <h1>Validator Candidate DAO Participation</h1>

          <table className={styles.styledTable}>
            <thead>
              <tr>
                <td>Date</td>
                <td>Proposal title</td>
                <td>Proposal type</td>
                <td>Voting result</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>01/01/2021</td>
                <td>Make a...</td>
                <td>Open proposl</td>
                <td>Accepted</td>
                <td><button className={styles.tableButton}>Details</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default PoolDetails;
