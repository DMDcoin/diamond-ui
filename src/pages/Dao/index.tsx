import React, { startTransition, useEffect, useState } from "react";

import "./dao.css";

import { useDaoContext } from "../../contexts/DaoContext";
import { useWeb3Context } from "../../contexts/Web3Context";
import { useNavigate } from "react-router-dom";
import Table from "../../components/Table";
import { Proposal } from "../../contexts/DaoContext/types";

interface DaoProps {}

const Dao: React.FC<DaoProps> = ({}) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  
  const [filteredData, setFilteredData] = useState<Proposal[]>([]);

  const columns = [
    'Proposer',
    'Description',
    'Votes',
    'Status',
    'Timer',
    ''
  ]

  useEffect(() => {
    if (!daoContext.daoInitialized) {
      daoContext.initialize().then(() => {
        daoContext.getActiveProposals();
      });
    } else {
      setFilteredData(daoContext.activeProposals)
    }
  }, [daoContext.activeProposals]);

  const getStateString = (stateValue: string) => {
    switch (stateValue) {
      case '0':
        return 'Created';
      case '1':
        return 'Canceled';
      case '2':
        return 'Active';
      case '3':
        return 'VotingFinished';
      case '4':
        return 'Accepted';
      case '5':
        return 'Declined';
      case '6':
        return 'Executed';
      default:
        return 'Unknown';
    }
  };

  const handleDetailsClick = (proposalId: string) => {
    // Navigate to the dynamic route with the proposalId parameter
    startTransition(() => {
      navigate(`/dao-details/${proposalId}`);
    });
  };

  const tableSearch = (e: any) => {
    const searchQuery = e.target.value;

    if (searchQuery) {
      const data = daoContext.activeProposals.filter(proposal =>
        proposal.proposer.toLowerCase().match(searchQuery.toLowerCase()) ||
        proposal.description.toLowerCase().match(searchQuery.toLowerCase()) ||
        proposal.state.toLowerCase().match(searchQuery.toLowerCase())
      );

      setFilteredData(data);
    } else {
      setFilteredData(daoContext.activeProposals);
    }
  }

  return (
    <div className="mainContainer">
      <div className="daoInfoContainer">
        <div>
          <h1 className="daoHeading">Governance</h1>

          <p>Stake: 10000 DMD</p>
          <p>10% of total total DAO weight 0.05%</p>

          <input type="text" placeholder="Search" className="daoSearch" onChange={e => tableSearch(e)}/>
        </div>

        <div>
          <h4>Proposal Phase 3</h4>
          <p>24h 33m till the end</p>
          <button onClick={() => {startTransition(() => {navigate('/create-dao')})}}>Create Proposal</button>
        </div>
      </div>
      
      <div className="myDaoProposals">
        <h2>My Proposals</h2>
        <Table
          columns={columns}
          data={filteredData}
          userWallet={web3Context.userWallet}
          handleDetailsClick={handleDetailsClick}
          getStateString={getStateString}
        />
      </div>

      <div className="allDaoProposals">
        <h2>All Proposals</h2>
        <Table
          columns={columns}
          data={filteredData}
          handleDetailsClick={handleDetailsClick}
          getStateString={getStateString}
        />
      </div>

      <span className="historicProposalsLink">Historic Proposals</span>
    </div>
  );
};

export default Dao;