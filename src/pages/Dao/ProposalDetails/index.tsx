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
import copy from 'copy-to-clipboard';
import Tooltip from "../../../components/Tooltip";
import { capitalizeFirstLetter, decodeCallData, extractValueFromCalldata, formatCryptoUnitValue, getFunctionInfoWithAbi, timestampToDate } from "../../../utils/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
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
    // Convert threshold percentages to ether format (10^18)
    const thresholdPercentage = proposalType === "Contract upgrade" ? 50 : 33;
    const threshold = BigNumber(totalDaoStake).multipliedBy(thresholdPercentage).dividedBy(100);
  
    // Check if positive votes exceed negative votes by the required threshold
    const hasSufficientVotes = positive.minus(negative).isGreaterThanOrEqualTo(threshold);
  
    // Check if the total participation meets the required threshold
    const hasRequiredParticipation = votingStats?.total.isGreaterThanOrEqualTo(threshold);
  
    return hasSufficientVotes && hasRequiredParticipation;
  };
  
  const copyData = (data: string) => {
    copy(data);
    toast.success("Copied to clipboard");
  }

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
              (() => {
                try {
                  // Attempt to create a URL object to validate the format
                  new URL(proposal.discussionUrl);
                  return (
                    <a
                      className={styles.proposalDiscussionLink}
                      href={proposal.discussionUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Discussion Link...
                    </a>
                  );
                } catch (error) {
                  // If it's not a valid URL, display the fallback text
                  return (
                    <span className={styles.invalidUrlFallback}>
                      <strong>Discussion here:</strong> {proposal.discussionUrl}
                    </span>
                  );
                }
              })()
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
                  <span>
                    {
                    (() => {
                        const { parameterName, parameterDescription } = getFunctionInfoWithAbi(web3Context.contractsManager, proposal.targets[0], proposal.calldatas[0])
                        return (
                          <>
                            {parameterName}
                            <Tooltip text={parameterDescription} />
                          </>
                        )
                      })()
                    }
                  </span>
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
                        <button 
                          className={styles.copyButton} 
                          onClick={() => copyData(String(proposal.targets[i]))} 
                          aria-label="Copy to clipboard"
                        >
                          <FontAwesomeIcon icon={faCopy} />
                        </button>
                      </div>
                      <div>
                        <span>Call Data</span>
                        <span>{proposal.calldatas[i]}</span>
                        <button 
                          className={styles.copyButton} 
                          onClick={() => copyData(String(proposal.calldatas[i]))} 
                          aria-label="Copy to clipboard"
                        >
                          <FontAwesomeIcon icon={faCopy} />
                        </button>
                      </div>
                        <>
                          {(() => {
                            const res: any = decodeCallData(web3Context.contractsManager, target, proposal.calldatas[i]);
                            if (Object.keys(res).length > 0) { // Check if res is not an empty object
                              return (
                                <>
                                  <h3>Decoded Call Data</h3>
                                  {Object.entries(res).map(([key, value]) => (
                                    <div key={key} className={styles.decodedData}>
                                      <span>{capitalizeFirstLetter(key)}: </span>
                                      <span>{String(value)}</span>
                                      <button 
                                        className={styles.copyButton} 
                                        onClick={() => copyData(String(value))} 
                                        aria-label="Copy to clipboard"
                                      >
                                        <FontAwesomeIcon icon={faCopy} />
                                      </button>
                                    </div>
                                  ))}
                                </>
                              );
                            }
                          })()}
                        </>
                    </div>   
                  ))
                }
              </div>
            )
          }

          {
            daoContext.notEnoughGovernanceFunds && (
              <p className={styles.warningText}>
                Warning: The total funding requested by active proposals exceeds the available balance in the governance pot. Please vote, finalize and execute carefully to ensure optimal fund allocation.
              </p>
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
                        {/* Progress bar for positive votes */}
                        <ProgressBar
                          min={0}
                          max={100}
                          progress={
                            votingStats
                              ? BigNumber(votingStats.positive).dividedBy(totalDaoStake).multipliedBy(100).toNumber()
                              : 0
                          }
                          bgColor="green"
                        />
                        {/* Progress bar for negative votes */}
                        <ProgressBar
                          min={0}
                          max={100}
                          progress={
                            votingStats
                              ? BigNumber(votingStats.negative).dividedBy(totalDaoStake).multipliedBy(100).toNumber()
                              : 0
                          }
                          bgColor="red"
                        />
                      </div>

                      <div className={styles.votingPhaseStats}>
                        <div>
                          <span>
                            Positive Answers: ({
                              votingStats ?
                                (() => {
                                  // Convert votingStats to BigNumber (assuming votingStats.positive and votingStats.negative are in ether units)
                                  const stakeYes = votingStats.positive;
                                  const stakeNo = votingStats.negative;
                                  const totalStake = totalDaoStake;

                                  // Calculate requiredExceeding based on proposalType
                                  const requiredExceeding = proposal.proposalType === "Contract upgrade"
                                    ? totalStake.multipliedBy(0.5) // 50% of totalDaoStake
                                    : totalStake.multipliedBy(0.33); // 33% of totalDaoStake

                                  // Check if stakeYes meets the condition
                                  const isConditionMet = stakeYes.isGreaterThanOrEqualTo(stakeNo.plus(requiredExceeding));

                                  // Calculate the percentage exceeding
                                  const percentageExceeding = stakeYes
                                    .minus(stakeNo)
                                    .dividedBy(totalStake)
                                    .multipliedBy(100)
                                    .toFixed(4, BigNumber.ROUND_DOWN);

                                  return `${percentageExceeding}% exceeding | ${proposal.proposalType === "Contract upgrade" ? "50%" : "33%"} required`;
                                })()
                              : "0% exceeding | N/A required"
                            })
                          </span>
                          <Tooltip text="Total participation percentage minus negative votes | required difference" />
                        </div>
                        <div>
                          <span>
                            Participation: {votingStats ? votingStats.total.dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN) : 0} DMD ({
                              votingStats && totalDaoStake && votingStats?.total.dividedBy(totalDaoStake).multipliedBy(100).toFixed(4, BigNumber.ROUND_DOWN)
                            }% | {proposal.proposalType == "Contract upgrade" ? "50%" : "33%"} required)
                          </span>
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
