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
import { timestampToDate, truncateAddress } from "../../../utils/common";
import copy from "copy-to-clipboard";
import { toast } from "react-toastify";

interface PoolDetailsProps {}

const PoolDetails: React.FC<PoolDetailsProps> = ({}) => {
  const navigate = useNavigate();
  const { poolAddress } = useParams();
  const { userWallet, web3Initialized, showLoader } = useWeb3Context();
  const { activeProposals, getMyVote, getActiveProposals } = useDaoContext();
  const { pools, stakingEpoch, claimOrderedUnstake } = useStakingContext();

  const [pool, setPool] = useState<Pool | null>(null);
  const [filteredProposals, setFilteredProposals] = useState<any[]>([]);

  useEffect(() => {
    try {
      if (!activeProposals.length && web3Initialized) {
        showLoader(true, "");
        getActiveProposals();
      }
    } catch(err) {}
  }, [web3Initialized]);

  useEffect(() => {
    const pool = pools.find((pool) => pool.stakingAddress === poolAddress);
    setPool(pool as Pool);
    filterProposals()
  }, [poolAddress, pools, userWallet.myAddr]);

  async function filterProposals() {
    const proposals = await Promise.all(
      activeProposals.map(async (proposal) => {
        // Only process proposals where poolAddress is relevant
        if (proposal.proposer !== poolAddress && proposal.state !== '2') return null;

        const vote = poolAddress ? await getMyVote(proposal.id, poolAddress) : null;
        // Only proceed if vote exists and vote.timestamp is greater than 0
        if (!vote || +vote.timestamp <= 0) return null;

        if (proposal.proposer === poolAddress) {
          return { ...proposal, myVote: vote.vote };
        } else if (+vote.timestamp > 0) {
          return { ...proposal, myVote: vote.vote };
        }
        return null;
      })
    );

    setFilteredProposals(proposals.filter((proposal) => proposal !== null));
  }

  const copyData = (data: string) => {
      copy(data);
      toast.success("Copied to clipboard");
  };

  return (
    <section className="section">

      <div className={styles.detailsSectionContainer + " sectionContainer"}>

      <Navigation start="/staking" />

        {/* image address status */}
        <div className={styles.infoContainer}>
          <Jazzicon diameter={40} seed={jsNumberForAddress(pool?.stakingAddress || '')} />
          <p onClick={() => copyData(poolAddress || "")}>{truncateAddress(poolAddress || "")}</p>
          <p className={pool?.isActive || (pool?.isToBeElected || pool?.isPendingValidator) ? styles.poolActive : styles.poolBanned}>
            {pool?.isActive ? "Active" : (pool?.isToBeElected || pool?.isPendingValidator) ? "Valid" : "Invalid"}
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
                <td>{pool ? BigNumber(pool.totalStake).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN) : 0} DMD</td>
              </tr>
              <tr>
                <td>Candidate Stake</td>
                <td>{pool ? BigNumber(pool.ownStake).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN) : 0} DMD</td>
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
              (pool?.isActive || pool?.isToBeElected || pool?.isPendingValidator) && BigNumber(pool.totalStake).isLessThan(BigNumber(50000).multipliedBy(10**18)) && userWallet.myAddr && (<StakeModal buttonText="Stake" pool={pool} />)
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
                    <td>{BigNumber(delegator.amount).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD</td>
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
                filteredProposals.length ? (
                  <tr>
                    <td>Date</td>
                    <td>Proposal title</td>
                    <td>Proposal type</td>
                    <td>Voting</td>
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
                filteredProposals.map((proposal, i) => (
                  <tr key={i}>
                    <td>{timestampToDate(proposal.timestamp)}</td>
                    <td>{proposal.title}</td>
                    <td>{proposal.proposalType}</td>
                    <td>{proposal.myVote == "1" ? "Voted For" : proposal.myVote == "0" ? "Voted Against" : "Not Voted"}</td>
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
