import React, { startTransition, useEffect, useState } from "react";

import styles from "./daodetails.module.css";

import { useDaoContext } from "../../contexts/DaoContext";
import { useWeb3Context } from "../../contexts/Web3Context";
import { useNavigate, useParams } from "react-router-dom";

interface DaoDetailsProps {}

const DaoDetails: React.FC<DaoDetailsProps> = ({}) => {
  const { proposalId } = useParams();
  const [proposal, setProposal] = useState<any>({});

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
        setProposal(proposal);
      }
    });
  }

  useEffect(() => {
    getProposalDetails();
  }, [daoContext.activeProposals]);

  return (
    <div className="mainContainer">
      <div className={styles.daoDetailsHeading}>
        <h4>Date: 14 Nov 2024</h4>
        <button>Created</button>
      </div>
      <div className={styles.daoDetailsContainer}>
        <h1>{proposal.description}</h1>
        <div>
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
      </div>
    </div>
  );
};

export default DaoDetails;
