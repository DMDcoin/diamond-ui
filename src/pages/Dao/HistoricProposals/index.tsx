import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./historicproposals.module.css";
import Table from "../../../components/Table";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";
import Navigation from "../../../components/Navigation";
import { Proposal } from "../../../contexts/DaoContext/types";

const HistoricProposals = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const [filterQuery, setFilterQuery] = useState<string>('');
  const [indexingStatus, setIndexingStatus] = useState<string | null>(
    "Indexing: Fetching historic proposals count"
  );

  const handleDetailsClick = (proposalId: string) => {
    startTransition(() => {
      navigate(`/proposal-details/${proposalId}`);
    });
  };

  useEffect(() => {
    if (!daoContext.allDaoProposals.length) {
      web3Context.setIsLoading(true);
      if (!daoContext.daoInitialized) daoContext.initialize();
      daoContext.getHistoricProposals();
    } else {
      const totalProposals = daoContext.allDaoProposals.length;
      totalProposals > 0 && web3Context.setIsLoading(false);
      const totalFetched = daoContext.allDaoProposals.filter((proposal: Proposal) => proposal.proposer !== '').length;
      const indexingPercentage = Math.round((totalFetched / totalProposals) * 100);
      if (indexingPercentage === 100) {
        setIndexingStatus(null);
      } else {
        setIndexingStatus(`Indexing: ${indexingPercentage}% complete`);
      }
    }
  }, [daoContext.activeProposals, daoContext.allDaoProposals])

  return (
    <div className="mainContainer">
      <Navigation start="/dao" />

      <div className={styles.historicProposalsInfoContainer}>
        <div>
          <h1 className={styles.historicProposalsHeading}>Historic Proposals</h1>

          <input type="text" placeholder="Search" className={styles.historicProposalsSearch} onChange={e => setFilterQuery(e.target.value)}/>

          <div>{indexingStatus ? indexingStatus : ""}</div>
        </div>
      </div>

      {
        daoContext.allDaoProposals.length !== 0 ? (
          <Table
            data={daoContext.allDaoProposals}
            handleDetailsClick={handleDetailsClick}
            getStateString={daoContext.getStateString}
            filterQuery={filterQuery}
            extraColumns={["Result"]}
          />
        ) : (
          <div className={styles.historicProposalsInfoContainer}>
            <div>
              <div>No historic proposals found</div>
            </div>
          </div>
        )
      }

      
    </div>
  );
};

export default HistoricProposals;
