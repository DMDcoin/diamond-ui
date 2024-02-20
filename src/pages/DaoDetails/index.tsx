import React, { startTransition, useEffect, useState } from "react";

import styles from "./daodetails.module.css";

import { useDaoContext } from "../../contexts/DaoContext";
import { useWeb3Context } from "../../contexts/Web3Context";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "../../components/Navigation";
import Modal from "../../components/Modal";
import ProgressBar from "../../components/ProgressBar";

interface DaoDetailsProps {}

const DaoDetails: React.FC<DaoDetailsProps> = ({}) => {
  const { proposalId } = useParams();
  const [proposal, setProposal] = useState<any>({});
  const [dismissProposal, setDismissProposal] = useState<boolean>(false);

  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const getProposalDetails = async () => {
    if (!daoContext.daoInitialized) {
      daoContext.initialize().then(() => {
        daoContext.getActiveProposals();
      });
    }
    
    daoContext.activeProposals.filter((proposal: any) => {
      if (proposal.id === proposalId) {
        console.log(proposal);
        setProposal(proposal);
      }
    });
  }

  const handleDismissProposal = async () => {
    daoContext.dismissProposal(proposal.id, "Dismissed by proposer").then(() => {
      console.log("here")
      navigate("/dao");
    }).catch((err) => {
      console.log("there")
      setDismissProposal(false);
    });
  }

  const handleCastVote = async () => {

  }

  useEffect(() => {
    getProposalDetails();
  }, [daoContext.activeProposals]);

  return (
    <div className="mainContainer">
      <Navigation start="/dao" />

      <div className={styles.daoDetailsHeading}>
        <h4>Date: {proposal.timestamp}</h4>
        <button>{daoContext.getStateString(proposal.state)}</button>
      </div>
      <div className={styles.daoDetailsContainer}>
        <h1>{proposal.description}</h1>
        <div className={styles.proposalCreatedBy}>
          <span>Created By: </span>
          <div>{proposal.proposer}</div>
        </div>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
        </p>

        {
          // proposal.type === "open" ? (
            <div className={styles.payoutDetailsContainer}>
              {
                proposal.targets?.map((target: any, i: number) => (
                  <div key={i}>
                    <div>
                      <span>Payout Adress</span>
                      <span>{proposal.targets[i]}</span>
                    </div>
                    <div>
                      <span>Payout Amount</span>
                      <span>{proposal.values[i] / 10**18} DMD</span>
                    </div>
                  </div>   
                ))
              }
            </div>
          // ) : (<></>)
        }

        {/* user is proposer and proposal is in open state */}
        {
          web3Context.userWallet.myAddr === proposal.proposer && proposal.state == '0' ? (
            <div className={styles.dismissProposalContainer}>
              {
                dismissProposal ? (
                  <div>
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
          ) : (<></>)
        }

        {/* voting phase */}
        {
          proposal.state === '0' ? (
            <div className={styles.votingPhaseContainer}>
              <div className={styles.votingPhaseProgress}>
                <ProgressBar min={0} max={100} progress={65} bgColor="green" />
                <ProgressBar min={0} max={100} progress={35} bgColor="red" />
              </div>

              <div className={styles.votingPhaseStats}>
                <span>Positive Answers: (25% exceeding | 33% required)</span>
                <span>Participation: 15000000 DMD (75% | 33% required)</span>
              </div>

              <div className={styles.votingPhaseButtons}>
                <button onClick={handleCastVote}>Vote for</button>
                <button onClick={handleCastVote}>Vote against</button>
              </div>
            </div>
          ) : (<></>)
        }
      </div>

      <div className={styles.daoDetailsFooter}>
        {daoContext.daoPhase?.phase === "1" ? (<span>0 voted</span>) : (<span></span>)}
        <span>{daoContext.getPhaseEndTime()} till end of Proposal Phase</span>
      </div>
    </div>
  );
};

export default DaoDetails;
