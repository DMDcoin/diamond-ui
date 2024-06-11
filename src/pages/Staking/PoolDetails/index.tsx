import styles from "./styles.module.css";
import { useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import StakeModal from "../../../components/Modals/StakeModal";
import { useWeb3Context } from "../../../contexts/Web3Context";
import UnstakeModal from "../../../components/Modals/UnstakeModal";
import { useStakingContext } from "../../../contexts/StakingContext";
import { Pool } from "../../../contexts/StakingContext/models/model";
import BigNumber from "bignumber.js";
import Navigation from "../../../components/Navigation";


interface PoolDetailsProps {}

const PoolDetails: React.FC<PoolDetailsProps> = ({}) => {
  const { poolAddress } = useParams();
  const { userWallet } = useWeb3Context();
  const { pools, getOrderedUnstakeAmount, claimOrderedUnstake } = useStakingContext();

  const [pool, setPool] = useState<Pool | null>(null);
  const [claimableUnstakeAmount, setClaimableUnstakeAmount] = useState(BigNumber(0));

  useEffect(() => {
    const pool = pools.find((pool) => pool.stakingAddress === poolAddress);
    setPool(pool as Pool);
    console.log(pool?.isAvailable, "Available.");

    if (pool) {
      getOrderedUnstakeAmount(pool).then((amount: BigNumber) => {
        setClaimableUnstakeAmount(amount);
      });
    }
  }, [poolAddress, pools, userWallet.myAddr]);

  const handleClaimUnstake = () => {
    claimOrderedUnstake(pool as Pool, claimableUnstakeAmount).then(() => {
      setClaimableUnstakeAmount(BigNumber(0));
    });
  }

  return (
    <section className="section">

      

      <div className={styles.detailsSectionContainer + " sectionContainer"}>

      <Navigation start="/staking" />


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
                <td>{pool ? BigNumber(pool.totalStake).dividedBy(10**18).toString() : 0} DMD</td>
              </tr>
              <tr>
                <td>Candidate Stake</td>
                <td>{pool ? BigNumber(pool.candidateStake).dividedBy(10**18).toFixed(2) : 0} DMD</td>
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
              pool?.isActive && userWallet.myAddr && (<StakeModal buttonText="Stake" pool={pool} />)
            }
            {
              pool && BigNumber(pool.myStake).isGreaterThan(0) && userWallet.myAddr && (<UnstakeModal buttonText="Unstake" pool={pool} />)
            }
            {
              BigNumber(claimableUnstakeAmount).isGreaterThan(0) && userWallet.myAddr && (
                <button className={styles.tableButton} onClick={handleClaimUnstake}>Claim Unstake</button>
              )
            }
          </div>          

          <table className={styles.styledTable}>
            <thead>
              {
                pool && pool.delegators.length ? (
                  <tr>
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
                pool && pool.delegators.length ? pool.delegators.map((delegator, i) => (
                  <tr key={i}>
                    <td>
                    <img src="https://via.placeholder.com/50" alt="Image 1" />
                    </td>
                    <td>{delegator.address}</td>
                    <td>{BigNumber(delegator.amount).dividedBy(10**18).toFixed(2)} DMD</td>
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
