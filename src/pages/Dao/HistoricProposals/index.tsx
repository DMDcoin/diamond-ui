import { startTransition, useEffect, useState } from "react";
import { FaFilter } from "react-icons/fa";

import ProposalsTable from "../../../components/ProposalsTable";
import { useNavigate } from "react-router-dom";
import styles from "./styles.module.css";
import Navigation from "../../../components/Navigation";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { Proposal } from "../../../contexts/DaoContext/types";

const HistoricProposals = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  
  const [fetching, setFetching] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterFinalize, setFilterFinalize] = useState<boolean>(true);
  const [indexingStatus, setIndexingStatus] = useState<string | null>();

  const handleDetailsClick = (proposalId: string) => {
    startTransition(() => {
      navigate(`/dao/details/${proposalId}`);
    });
  };

  // useEffect(() => {
  //   if (!fetching) {
  //     web3Context.showLoader(true, "Fetching historic proposals");
  //     daoContext.getHistoricProposals();
  //     setFetching(true);
  //   } else {
  //     const totalProposals = daoContext.allDaoProposals.length;
  //     totalProposals > 0 && web3Context.showLoader(false, "");
  //     const totalFetched = daoContext.allDaoProposals.filter((proposal: Proposal) => proposal.state !== '').length;
  //     const indexingPercentage = Math.round((totalFetched / totalProposals) * 100);
  //     if (indexingPercentage === 100) {
  //       setIndexingStatus(null);
  //     } else {
  //       setIndexingStatus(`Indexing: ${indexingPercentage}% complete`);
  //     }
  //   }
  // }, [daoContext.allDaoProposals]);

  return (
    <section className="section">
        <div className={styles.sectionContainer + " sectionContainer"}>

        <Navigation start="/dao" />

        <div className={styles.historicProposalsInfoContainer}>
          <div>
            <h1 className={styles.historicProposalsHeading}>Historic Proposals</h1>

            <div className={styles.filterContainer}>
              <input type="text" placeholder="Search" className={styles.historicProposalsSearch} onChange={e => setSearchQuery(e.target.value)}/>

              <select className={styles.historicProposalsSelect} onChange={e => setFilterQuery(e.target.value)}>
                <option value="">All</option>
                <option value="unfinalized">Unfinalized</option>
                <option value="myProposals">My proposals</option>
              </select>
            </div>

            <div>{indexingStatus ? indexingStatus : ""}</div>
          </div>
        </div>

        {
          <ProposalsTable
            data={daoContext.allDaoProposals}
            handleDetailsClick={handleDetailsClick}
            getStateString={daoContext.getStateString}
            searchQuery={searchQuery}
            filterQuery={filterQuery}
            columns={["Result"]}
          />
        }

      </div>
    </section>
  );
};

export default HistoricProposals;
