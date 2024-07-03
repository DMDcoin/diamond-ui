import React, { startTransition, useEffect, useState } from "react";

import styles from "./styles.module.css";

import { toast } from "react-toastify";
import Navigation from "../../../components/Navigation";
import ProgressBar from "../../../components/ProgressBar";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useNavigate, useParams } from "react-router-dom";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { FaRegThumbsUp, FaRegThumbsDown } from "react-icons/fa";
import { useStakingContext } from "../../../contexts/StakingContext";
import { TotalVotingStats, Vote } from "../../../contexts/DaoContext/types";

import BigNumber from "bignumber.js";
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

interface ProposalDetailsProps {}

const ProposalDetails: React.FC<ProposalDetailsProps> = () => {
  const { proposalId } = useParams();
  
  const [proposalState, setProposalState] = useState<any>([]);
  const [myVote, setMyVote] = useState<Vote>({
    timestamp: "",
    vote: "",
    reason: ""
  });
  const [proposal, setProposal] = useState<any>({
    id: "",
    description: "",
    proposer: "",
    state: "",
    timestamp: "",
    type: "",
    link: "",
    targets: [],
    values: [],
    calldatas: [],
    votes: 0
  });
  const [voteReason, setVoteReason] = useState<string>("");
  const [dismissReason, setDismissReason] = useState<string>("");
  const [dismissProposal, setDismissProposal] = useState<boolean>(false);
  const [votingStats, setVotingStats] = useState<TotalVotingStats>();

  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const { pools } = useStakingContext();

  useEffect(() => {
    if (proposalId) getProposalDetails(proposalId);
  }, [web3Context.userWallet, daoContext.daoPhase]);

  const getProposalDetails = async (proposalId: string) => {
    return new Promise(async (resolve, reject) => {
      if (web3Context.userWallet.myAddr)  setMyVote(await daoContext.getMyVote(proposalId));

      const storedProposals = daoContext.getCachedProposals();
      const filProposals = storedProposals.filter((proposal: any) => proposal.id === proposalId);
      web3Context.showLoader(true, "");
      if (!filProposals.length) await daoContext.getHistoricProposalsEvents();

      // fetch proposal details and store in localStorage
      if (proposalId) {
        // adding 1 second delay as sometimes the RPC doesn't return
        // the updated proposal details immediately after phase change
        setTimeout(() => {
          daoContext.getProposalDetails(proposalId).then((res) => {
            setProposalDetails(res);
          });
        }, 1000);
      }
    });
  }

  const setProposalDetails = (proposal: any) => {
    if (proposal) {
      setProposal(proposal);
      daoContext.setProposalsState([proposal]);
      daoContext.getProposalVotingStats(proposal.id).then((res) => {
        setVotingStats(res);
      })
      setProposalState(daoContext.getStateString(proposal.state))
    } else {
      startTransition(() => { navigate("/404"); });
    }
    web3Context.showLoader(false, "");
  }

  const handleDismissProposal = async () => {
    daoContext.dismissProposal(proposal.id, dismissReason).then(() => {
      getProposalDetails(proposal.id);
    }).catch((err) => {
      setDismissProposal(false);
    });
  }

  const handleCastVote = async (vote: number) => {
    if (
      pools.filter(
        (p) => Number(p.bannedUntil ?? 0) <= Math.floor(new Date().getTime() / 1000) && p.stakingAddress === web3Context.userWallet.myAddr
      ).length <= 0
    ) {
      toast.warning(`Only validator candidates can vote`);
      return;
    }

    daoContext.castVote(proposal.id, vote, voteReason).then(() => {
      getProposalDetails(proposal.id);
    }).catch((err) => {
      console.log(err);
    });
  }

  const handleProposalFinalization = async (proposalId: string) => {
    daoContext.finalizeProposal(proposalId).then((res) => {
      if (res === "success") getProposalDetails(proposalId);
    })
  }

  return (
    <section className="section">
      <div className={styles.sectionContainer + " sectionContainer"}>

        <Navigation start="/dao" />

        <div className={styles.daoDetailsHeading}>
          <h4>Date: {proposal.timestamp}</h4>
          <button>{proposalState}</button>
        </div>
        <div className={styles.daoDetailsContainer}>
          <h1>{proposal.title}</h1>
          <div className={styles.proposalCreatedBy}>
            <span>Created By: </span>
            <div>{proposal.proposer}</div>
          </div>
          <p>
            {proposal.description}
          </p>

          {/* discussion link */}
          <a className={styles.proposalDiscussionLink} href={proposal.discussionUrl} rel="noreferrer" target="_blank">Discussion Link...</a>

          {/* open proposals */}
          {
            proposal.proposalType === "Open" && (
              <div className={styles.payoutDetailsContainer}>
                {
                  proposal.targets?.map((target: any, i: number) => (
                    proposal.targets[i] != '0x0000000000000000000000000000000000000000' && (
                      <div key={i}>
                        <div>
                          <span>Payout Adress</span>
                          <span>{proposal.targets[i]}</span>
                        </div>
                        <div>
                          <span>Payout Amount</span>
                          <span>{(new BigNumber(proposal.values[i]).dividedBy(10**18)).toString()} DMD</span>
                        </div>
                      </div>   
                    )
                  ))
                }
              </div>
            )
          }

          {/* ecosystem proposals */}
          {
            proposal.proposalType === "Ecosystem Paramaeter Change" && (
              <div className={styles.ecpDetailsContainer}>
                <div>
                  <span>Parameter</span>
                  <span>Gas price</span>
                </div>

                <div>
                  <span>Proposed value</span>
                  <span>{(new BigNumber(proposal.values[0]).dividedBy(10**18)).toString()} DMD</span>
                </div>
              </div>
            )
          }

          {/* contract upgrade */}
          {
            proposal.proposalType === "Contract upgrade" && (
              <div className={styles.cupDetailsContainer}>
                {
                  proposal.targets?.map((target: any, i: number) => (
                    <div key={i}>
                      <div>
                        <span>Target Address</span>
                        <span>{proposal.targets[i]}</span>
                      </div>
                      <div>
                        <span>Call Data</span>
                        <span>{proposal.calldatas[i]}</span>
                      </div>
                    </div>   
                  ))
                }
              </div>
            )
          }

          {/* user is proposer and proposal is in created state */}
          {
            web3Context.userWallet.myAddr === proposal.proposer &&
            proposal.state === "0" &&
            daoContext.daoPhase?.phase === "0" && (
              <div className={styles.dismissProposalContainer}>
                {
                  dismissProposal ? (
                    <div>
                      <input type="text" placeholder="Dismissal Reason (Optional)" value={dismissReason} onChange={e => setDismissReason(e.target.value)}/>
                      <span>Are you sure you want to dismiss this proposal?</span>
                      <div>
                        <button onClick={handleDismissProposal}>Yes</button>
                        <button onClick={() => setDismissProposal(false)}>No</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setDismissProposal(true)}>Dismiss Proposal</button>
                  )
                }
                
              </div>
            )
          }

          {/* voting phase */}
          {
              <div className={styles.votingPhaseContainer}>
                {
                  (daoContext.daoPhase?.phase !== '0' || ['3', '4', '5', '6'].includes(proposal.state)) && (
                    <>
                      <div className={styles.votingPhaseProgress}>
                        <ProgressBar min={0} max={100} progress={votingStats ? Number(votingStats.positive) : 0} bgColor="green" />
                        <ProgressBar min={0} max={100} progress={votingStats ? Number(votingStats.negative) : 0} bgColor="red" />
                      </div>

                      <div className={styles.votingPhaseStats}>
                        <span>Positive Answers: ({votingStats ? Number(votingStats.positive) : 0} % exceeding | 33% required)</span>
                        <span>Participation: {votingStats ? votingStats.total.dividedBy(10**18).toString() : 0} DMD ({
                          votingStats && daoContext.totalStakedAmount && votingStats.total.dividedBy(daoContext.totalStakedAmount).toFixed(2)
                        }% | 33% required)</span>
                      </div>
                    </>
                  )
                }

                {
                  proposal.state === '2' && (
                    <div className={styles.votingPhaseButtons}>

                      {
                        web3Context.userWallet?.myAddr && (
                          <div>
                            <input type="text" placeholder={myVote.reason ? myVote.reason : "Vote Reason"} value={voteReason} onChange={e => setVoteReason(e.target.value)}/>
                          </div>
                        )
                      }
                    
                      <div>
                        {myVote.vote === '0' && (
                          <>
                            <button className={styles.voteForBtn} onClick={() => handleCastVote(2)}>Vote For <FaRegThumbsUp /></button>
                            <button className={styles.voteAgainstBtn} onClick={() => handleCastVote(1)}>Vote Against <FaRegThumbsDown /></button>
                          </>
                        )}
                        {myVote.vote === '1' && (
                          <div className={styles.alreadyVotedBtns}>
                            <p>You have already voted against the proposal, do you want to change your decision?</p>
                            <button className={styles.voteForBtn} onClick={() => handleCastVote(2)}>Vote For <FaRegThumbsUp /></button>
                          </div>
                          )
                        }
                        {myVote.vote === '2' && (
                          <div className={styles.alreadyVotedBtns}>
                            <p>You have already voted for the proposal, do you want to change your decision?</p>
                            <button className={styles.voteAgainstBtn} onClick={() => handleCastVote(1)}>Vote Against <FaRegThumbsDown /></button>
                          </div>
                          )
                        }
                      </div>
                    </div>
                  )
                }
              </div>
          }

          {/* proposal voting phase finished and can be finalized */}
          {
            proposal.state === "3" && (
              <div className={styles.finalizeProposalContainer}>
                <button onClick={() => handleProposalFinalization(proposal.id)}>Finalize Proposal</button>
              </div>
            )
          }

          {/* proposal finalized */}
          {
            ['1', '4', '5', '6'].includes(proposal.state) && (
              <div className={styles.finalizedProposalContainer}>
                <span>The proposal was {proposalState} by the community</span>
              </div>
            )
          }
        </div>

        <div className={styles.daoDetailsFooter}>
          {(daoContext.daoPhase?.phase === "1" || !['0', '1'].includes(proposal.state)) ? (<span>{proposal.votes} voted</span>) : (<span></span>)}
          <span>{daoContext.phaseEndTimer} till end of {daoContext.daoPhase?.phase === "1" ? "Voting" : "Proposal"} Phase</span>
        </div>
      </div>
    </section>
  );
};

export default ProposalDetails;
