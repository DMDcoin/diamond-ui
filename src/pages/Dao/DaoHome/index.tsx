import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { startTransition, useEffect, useState } from "react";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";
import ProposalsTable from "../../../components/ProposalsTable";
import { useStakingContext } from "../../../contexts/StakingContext";
import DaoPhaseBanner from "../../../components/DaoPhaseBanner";

interface DaoProps {}

const DaoHome: React.FC<DaoProps> = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();
  
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      if (!daoContext.activeProposals.length && web3Context.web3Initialized) {
        web3Context.showLoader(true, "");
        daoContext.getActiveProposals();
      }
    } catch(err) {}
  }, [web3Context.web3Initialized]);

  const handleDetailsClick = (proposalId: string) => {
    // Navigate to the dynamic route with the proposalId parameter
    startTransition(() => {
      navigate(`/dao/details/${proposalId}`);
    });
  };

  return (
    <section className="section">
      <div className={styles.sectionContainer + " sectionContainer"}>
        
        <div className={styles.daoInfoContainer}>
          <h1>Governance</h1>

          <div></div>
          <div></div>
          <div></div>
          <div></div>

          {/* <DaoPhaseBanner /> */}
        </div>

        <div className={styles.allDaoProposals}>
          {/* <h2>Active Proposals</h2> */}

            <div className={styles.filterContainer}>
              <input
                type="text"
                placeholder="Search "
                className={styles.daoSearch}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <select id="filter" value={filterQuery} onChange={e => setFilterQuery(e.target.value)}>
                  <option value="">All</option>
                  <option value="myProposals">My proposals</option>
              </select>
            </div>

          <div>
            <ProposalsTable
              data={daoContext.activeProposals}
              handleDetailsClick={handleDetailsClick}
              getStateString={daoContext.getStateString}
              searchQuery={searchQuery}
              filterQuery={filterQuery}
            />
          </div>
        </div>

        <span
          onClick={() => startTransition(() => navigate("/dao/historic"))}
          className={styles.historicProposalsLink}>
          Historic Proposals
        </span>
      </div>
    </section>
  );
};

export default DaoHome;