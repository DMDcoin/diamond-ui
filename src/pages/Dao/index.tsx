import styles from "./dao.module.css";
import Table from "../../components/Table";
import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../contexts/DaoContext";
import { Proposal } from "../../contexts/DaoContext/types";
import { useWeb3Context } from "../../contexts/Web3Context";
import { startTransition, useEffect, useState } from "react";

interface DaoProps {}

const Dao: React.FC<DaoProps> = ({}) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  
  const [filteredData, setFilteredData] = useState<Proposal[]>([]);

  const columns = [
    'Date',
    'Wallet',
    'Username',
    'Title',
    'Type',
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
      <div className={styles.daoInfoContainer}>
        <div>
          <h1 className={styles.daoHeading}>Governance</h1>

          <p>Stake: 10000 DMD</p>
          <p>10% of total total DAO weight 0.05%</p>

          <input type="text" placeholder="Search" className={styles.daoSearch} onChange={e => tableSearch(e)}/>
        </div>

        <div>
          {daoContext.daoPhase?.phase === '1' && (<div></div>)}
          <h4>{daoContext.daoPhase?.phase === '0' ? "Proposal" : "Voting"} Phase 3</h4>
          <p>{daoContext.getPhaseEndTime()} till the end</p>
          {daoContext.daoPhase?.phase === '0' && (<button onClick={() => {startTransition(() => {navigate('/create-dao')})}}>Create Proposal</button>)}
        </div>
      </div>
      
      <div className={styles.myDaoProposals}>
        <h2>My Proposals</h2>
        <div>
          <Table
            columns={columns}
            data={filteredData}
            userWallet={web3Context.userWallet}
            handleDetailsClick={handleDetailsClick}
            getStateString={daoContext.getStateString}
          />
        </div>
      </div>

      <div className={styles.allDaoProposals}>
        <h2>All Proposals</h2>
        <div>
          <Table
            columns={columns}
            data={filteredData}
            handleDetailsClick={handleDetailsClick}
            getStateString={daoContext.getStateString}
          />
        </div>
      </div>

      <span className={styles.historicProposalsLink}>Historic Proposals</span>
    </div>
  );
};

export default Dao;