import React, { startTransition, useCallback, useEffect, useState } from "react";

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
import Tooltip from "../../../components/Tooltip";
import { extractValueFromCalldata, formatCryptoUnitValue, getFunctionNameWithAbi, timestampToDate } from "../../../utils/common";
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
  const { pools, myPool, totalDaoStake } = useStakingContext();

  const getProposalDetails = useCallback(async (proposalId: string) => {
    if (web3Context.userWallet.myAddr) {
      setMyVote(await daoContext.getMyVote(proposalId));
    }

    const storedProposals = daoContext.getCachedProposals().filter((proposal: any) => proposal.id === proposalId);
    if (!storedProposals.length) await daoContext.getHistoricProposalsEvents();

    // fetch proposal details and store in localStorage
    if (proposalId) {
      // adding 1 second delay as sometimes the RPC doesn't return
      // the updated proposal details immediately after phase change
      setTimeout(() => {
        daoContext.getProposalDetails(proposalId).then((res) => {
          daoContext.setProposalsState([res]);
          daoContext.setActiveProposals(
            daoContext.activeProposals.map((p) => {
              if (p.id === res.id) {
                return res;
              }
              return p;
          }));
          setProposalDetails(res);
        });
      }, 1000);
    }
  }, [daoContext, web3Context]);

  const setProposalDetails = useCallback((proposal: any) => {
    if (proposal) {
      // console.log({proposal});
      setProposal(proposal);
      daoContext.setProposalsState([proposal]);
      daoContext.getProposalVotingStats(proposal.id).then((res) => {        
        setVotingStats(res);
      });
      setProposalState(daoContext.getStateString(proposal.state));
    } else {
      startTransition(() => {
        navigate("/404");
      });
    }
    web3Context.showLoader(false, "");
  }, [daoContext, navigate, web3Context]);

  useEffect(() => {
    if (proposalId) {
      web3Context.showLoader(true, "Fetching proposal details");
      getProposalDetails(proposalId)
    }
  }, [web3Context.userWallet.myAddr, daoContext.daoPhase]);

  const handleDismissProposal = async () => {
    daoContext.dismissProposal(proposal.id, dismissReason).then(() => {
      getProposalDetails(proposal.id);
    }).catch((err) => {
      setDismissProposal(false);
    });
  };

  const handleCastVote = async (vote: number) => {
    if (!web3Context.contractsManager.stContract?.methods.isPoolValid(web3Context.userWallet.myAddr)) {
      toast.warning(`Only validator candidates can vote`);
      return;
    }

    daoContext.castVote(proposal.id, vote, voteReason).then(() => {
      getProposalDetails(proposal.id);
    }).catch((err) => {});
  };

  const handleProposalFinalization = async (proposalId: string) => {
    daoContext.finalizeProposal(proposalId).then((res) => {
      if (res === "success") getProposalDetails(proposalId);
    });
  };

  const handleProposalExecution = async (proposalId: string) => {
    daoContext.executeProposal(proposalId).then((res) => {
      if (res === "success") getProposalDetails(proposalId);
    });
  }

  const proposalAccepted = (proposalType: string, positive: BigNumber, negative: BigNumber) => {
    const threshold = proposalType === "Contract upgrade" ? 50 : 33;
    const hasSufficientVotes = positive.minus(negative).isGreaterThan(threshold);
    const hasRequiredParticipation = votingStats?.total.dividedBy(totalDaoStake).multipliedBy(100).isGreaterThan(threshold);
    
    return hasSufficientVotes && hasRequiredParticipation;
  };

  return (
    <section className="section">
      <div className={styles.sectionContainer + " sectionContainer"}>

        <Navigation start="/dao" />

        <div className={styles.daoDetailsHeading}>
          <h4>Date: {timestampToDate(proposal.timestamp)}</h4>
          <button>{proposalState}</button>
        </div>
        <div className={styles.daoDetailsContainer}>
          <div>
            <h2 className={styles.h2Heading}>{proposal.title}</h2>
            <div className={styles.proposalCreatedBy}>
              <span>Created By: </span>
              <div>{proposal.proposer}</div>
            </div>
          </div>
          

          <div className={styles.descriptionContainer}>
            {proposal.description}
          </div>

          {/* discussion link */}
          {
            proposal?.discussionUrl?.length > 0 && (
              <a className={styles.proposalDiscussionLink} href={proposal.discussionUrl} rel="noreferrer" target="_blank">Discussion Link...</a>
            )
          }
          

          {/* open proposals */}
          {
            proposal.proposalType === "Open" &&
            proposal.targets?.length > 0 && // Ensure targets array is not empty
            proposal.targets.some((target: string) => target !== "0x0000000000000000000000000000000000000000") &&
            (
              <div className={styles.payoutDetailsContainer}>
                {
                  proposal.targets?.map((target: any, i: number) => (
                    target !== '0x0000000000000000000000000000000000000000' && (
                      <div key={i}>
                        <div>
                          <span>Payout Address</span>
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
            proposal.proposalType === "Ecosystem Parameter Change" && (
              <div className={styles.ecpDetailsContainer}>
                <div>
                  <span>Parameter</span>
                  <span>{getFunctionNameWithAbi(web3Context, proposal.targets[0], proposal.calldatas[0])}</span>
                </div>

                <div>
                  <span>Proposed value</span>
                  <span>{formatCryptoUnitValue(extractValueFromCalldata(proposal.calldatas[0]))}</span>
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
                      {/* <>This: {decodeCallData(web3Context, proposal.targets[i], proposal.calldatas[i])}</> */}
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
                        <button className="primaryBtn" onClick={handleDismissProposal}>Yes</button>
                        <button className="primaryBtn" onClick={() => setDismissProposal(false)}>No</button>
                      </div>
                    </div>
                  ) : (
                    <button className="primaryBtn" onClick={() => setDismissProposal(true)}>Dismiss Proposal</button>
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
                        <div>
                          <span>Positive Answers: ({votingStats ? BigNumber(votingStats.positive).minus(votingStats.negative).isLessThan(0) ? '0.00' : Math.round(BigNumber(votingStats.positive).minus(votingStats.negative).toNumber()) : 0} % exceeding | {proposal.proposalType == "Contract upgrade" ? "50%" : "33%"} required)</span>
                          <Tooltip text="Exceeding difference between yes and no answers | required difference" />
                        </div>
                        <div>
                          <span>Participation: {votingStats ? votingStats.total.dividedBy(10**18).toFixed(2) : 0} DMD ({
                            votingStats && totalDaoStake && votingStats?.total.dividedBy(totalDaoStake).multipliedBy(100).toFixed(2)
                          }% | {proposal.proposalType == "Contract upgrade" ? "50%" : "33%"} required)</span>
                          <Tooltip text="Actual % of total dao weight who participated in the voting | required % of participation" />
                        </div>
                      </div>
                    </>
                  )
                }

                {
                  myPool && proposal.state === '2' && (
                    <div className={styles.votingPhaseButtons}>
                      {
                        myVote.vote !== '0' && (
                          <div>
                            {myVote.vote === '1' && (
                              <div className={styles.alreadyVotedBtns}>
                                <p>You have already voted against the proposal, do you want to change your decision?</p>
                              </div>
                            )}
                            {myVote.vote === '2' && (
                              <div className={styles.alreadyVotedBtns}>
                                <p>You have already voted for the proposal, do you want to change your decision?</p>
                              </div>
                            )}
                          </div>
                        )
                      }

                      {
                        web3Context.userWallet?.myAddr && (
                          <div>
                            <input type="text" placeholder={myVote.reason ? myVote.reason : "Vote Reason"} value={voteReason} onChange={e => setVoteReason(e.target.value)} />
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
                            <button className={styles.voteForBtn} onClick={() => handleCastVote(2)}>Vote For <FaRegThumbsUp /></button>
                          </div>
                        )}
                        {myVote.vote === '2' && (
                          <div className={styles.alreadyVotedBtns}>
                            <button className={styles.voteAgainstBtn} onClick={() => handleCastVote(1)}>Vote Against <FaRegThumbsDown /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
              </div>
          }

          {/* voting finished */}
          {
            proposal.state == "3" && proposal.proposalType && votingStats && votingStats.positive && votingStats.negative && (
              <span className={styles.finalizedProposalContainer}>
                {proposalAccepted(proposal.proposalType, BigNumber(votingStats.positive), BigNumber(votingStats.negative)) ? 
                  "Proposal was approved by the community" : 
                  "Proposal was not approved by the community"
                }

              {
                proposal.state == "3" && myVote.vote !== '0' && (
                  <div>
                    {myVote.vote === '1' && (
                      <div className={styles.alreadyVotedBtns}>
                        <p>You have voted against the proposal</p>
                      </div>
                    )}
                    {myVote.vote === '2' && (
                      <div className={styles.alreadyVotedBtns}>
                        <p>You have voted for the proposal</p>
                      </div>
                    )}
                  </div>
                )
              }
              </span>
            )
          }
          
          {/* proposal voting phase finished and can be finalized */}
          {
            proposal.state === "3" && (
              <div className={styles.finalizeProposalContainer}>
                <button className="primaryBtn" onClick={() => handleProposalFinalization(proposal.id)}>Finalize Proposal</button>
              </div>
            )
          }

          {/* proposal finalized */}
          {
            ['1', '4', '5', '6'].includes(proposal.state) && (
              <div className={styles.finalizedProposalContainer}>
                <span>This proposal was {proposalState} by the community</span>
              </div>
            )
          }

          {/* execute proposal */}
          {
            proposal.state === "4" && daoContext.daoPhase.daoEpoch == Number(proposal.daoPhaseCount) + 1 ? (
              <div className={styles.finalizeProposalContainer}>
                <button className="primaryBtn" onClick={() => handleProposalExecution(proposal.id)}>Execute Proposal</button>
              </div>
            ) : proposal.state === "4" && daoContext.daoPhase.daoEpoch != Number(proposal.daoPhaseCount) + 1 && (
              <p>Proposal execution window is over</p>
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
