import React, { startTransition, useEffect, useState } from "react";

import "./daoDetails.css";

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
      <div className="daoDetailsHeading">
        <h4>Date: 14 Nov 2024</h4>
        <button>Created</button>
      </div>
      <div className="daoDetailsContainer">
        <h1>{proposal.description}</h1>
        <span>Created By: {proposal.proposer}</span>
      </div>
    </div>
  );
};

export default DaoDetails;
