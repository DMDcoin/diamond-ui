import styles from "./styles.module.css";
import { useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { useStakingContext } from "../../../contexts/StakingContext";
import { Pool } from "../../../contexts/StakingContext/models/model";
import CreateValidatorModal from "../../../components/CreateValidatorModal";

interface PoolDetailsProps {}

const PoolDetails: React.FC<PoolDetailsProps> = ({}) => {
  const { poolAddress } = useParams();
  const { pools } = useStakingContext();
  const [pool, setPool] = useState<Pool | null>(null);
  const [openCreateValidatorModal, setOpenCreateValidatorModal] = useState(false);

  useEffect(() => {
    const pool = pools.find((pool) => pool.stakingAddress === poolAddress);
    setPool(pool as Pool);
  }, [poolAddress, pools]);


  return (
    <section className="section">

      <CreateValidatorModal isOpen={openCreateValidatorModal} onClose={() => setOpenCreateValidatorModal(false)} />

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
                <td>{pool ? pool.totalStake.dividedBy(10**18).toString() : 0} DMD</td>
              </tr>
              <tr>
                <td>Candidate Stake</td>
                <td>{pool ? pool.candidateStake.dividedBy(10**18).toString() : 0} DMD</td>
              </tr>
              <tr>
                <td>Score</td>
                <td>{pool ? pool.score : 0}</td>
              </tr>
              <tr>
                <td>Voting Power</td>
                <td>{pool ? pool.votingPower.toString() : 0} %</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* delegators table */}
        <div className={styles.delegatorStatsContainer}>

          <div>
            <h1>Delegators</h1>
            {
              pool?.isActive && <button className={styles.tableButton}>Lock coin</button>
            }
            {
              pool?.myStake.isGreaterThan(0) && (<button className={styles.tableButton}>Withdraw</button>)
            }
            
          </div>          

          <table className={styles.styledTable}>
            <thead>
              {
                pool && pool.delegators.length ? (
                  <tr>
                    <td></td>
                    <td></td>
                    <td>Wallet</td>
                    <td>Delegated Stake</td>
                  </tr>
                ) : (
                  <tr>
                    <td>No Delegations</td>
                  </tr>
                )
              }
            </thead>
            <tbody>
              {
                pool && pool.delegators.length ? pool.delegators.map(delegator => (
                  <tr>
                    <td>
                    <img src="https://via.placeholder.com/50" alt="Image 1" />
                    </td>
                    <td>Active</td>
                    <td>{delegator.address}</td>
                    <td>{delegator.amount.dividedBy(10**18).toString()} DMD</td>
                  </tr>
                )) : (
                  <tr>
                  </tr>
                )
              }
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
