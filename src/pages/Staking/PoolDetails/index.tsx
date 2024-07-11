import BigNumber from "bignumber.js";
import styles from "./styles.module.css";
import Navigation from "../../../components/Navigation";
import { useNavigate, useParams } from "react-router-dom";
import { useDaoContext } from "../../../contexts/DaoContext";
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import StakeModal from "../../../components/Modals/StakeModal";
import { useWeb3Context } from "../../../contexts/Web3Context";
import UnstakeModal from "../../../components/Modals/UnstakeModal";
import React, { startTransition, useEffect, useState } from "react";
import { useStakingContext } from "../../../contexts/StakingContext";
import { Pool } from "../../../contexts/StakingContext/models/model";

interface PoolDetailsProps {}

const PoolDetails: React.FC<PoolDetailsProps> = ({}) => {
  const navigate = useNavigate();
  const { poolAddress } = useParams();
  const { userWallet } = useWeb3Context();
  const { allDaoProposals, getStateString } = useDaoContext();
  const { pools, stakingEpoch, claimOrderedUnstake } = useStakingContext();

  const [pool, setPool] = useState<Pool | null>(null);

  useEffect(() => {
    const pool = pools.find((pool) => pool.stakingAddress === poolAddress);
    setPool(pool as Pool);    
  }, [poolAddress, pools, userWallet.myAddr]);

  return (
    <section className="section">

      <div className={styles.detailsSectionContainer + " sectionContainer"}>

      <Navigation start="/staking" />

        {/* image address status */}
        <div className={styles.infoContainer}>
          <Jazzicon diameter={40} seed={jsNumberForAddress(pool?.stakingAddress || '')} />
          <p>{poolAddress}</p>
          <p className={pool?.isCurrentValidator ? styles.poolActive : (Number(pool?.bannedUntil ?? 0) > Math.floor(new Date().getTime() / 1000) ? styles.poolBanned : styles.poolActive)}>
            {pool?.isCurrentValidator ? "Active" : pool?.isActive ? "Valid" : (Number(pool?.bannedUntil ?? 0) > Math.floor(new Date().getTime() / 1000) ? "Banned" : "Invalid")}
          </p>
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
                <td>{pool ? BigNumber(pool.totalStake).dividedBy(10**18).toFixed(2) : 0} DMD</td>
              </tr>
              <tr>
                <td>Candidate Stake</td>
                <td>{pool ? BigNumber(pool.ownStake).dividedBy(10**18).toFixed(2) : 0} DMD</td>
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
            <h1>Delegates</h1>
            {
              pool?.isActive && userWallet.myAddr && (<StakeModal buttonText="Stake" pool={pool} />)
            }
            {
              pool && BigNumber(pool.orderedWithdrawAmount).isGreaterThan(0) && BigNumber(pool.orderedWithdrawUnlockEpoch).isLessThanOrEqualTo(stakingEpoch) && userWallet.myAddr ? (
                <button className="primaryBtn" onClick={() => claimOrderedUnstake(pool as Pool)}>Claim</button>
              ) : pool && BigNumber(pool.myStake).isGreaterThan(0) && userWallet.myAddr && (<UnstakeModal buttonText="Unstake" pool={pool} />)
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
                    <Jazzicon diameter={40} seed={jsNumberForAddress(delegator.address)} />
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
              {
                allDaoProposals.filter((proposal) => proposal.proposer === poolAddress).length ? (
                  <tr>
                    <td>Date</td>
                    <td>Proposal title</td>
                    <td>Proposal type</td>
                    <td>Voting result</td>
                    <td></td>
                  </tr>
                ) : (
                  <tr>
                    <td>No DAO Participations</td>
                  </tr>
                )
              }
            </thead>
            <tbody>
              {
                allDaoProposals.filter((proposal) => proposal.proposer === poolAddress).map((proposal, i) => (
                  <tr key={i}>
                    <td>{proposal.timestamp}</td>
                    <td>{proposal.title}</td>
                    <td>{proposal.proposalType}</td>
                    <td>{getStateString(proposal.state)}</td>
                    <td><button onClick={() => startTransition(() => {navigate(`/dao/details/${proposal.id}`)})} className="primaryBtn">Details</button></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default PoolDetails;
