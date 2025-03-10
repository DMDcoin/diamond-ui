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
  const [activeTab, setActiveTab] = useState<'currentPhase' | 'actionsNeeded'>('currentPhase');

  useEffect(() => {
    try {
      if (!daoContext.activeProposals.length && web3Context.web3Initialized) {
        web3Context.showLoader(true, "");
        daoContext.getActiveProposals().then(() => {daoContext.getHistoricProposals();});
      }
    } catch(err) {}
  }, [web3Context.web3Initialized]);

  const handleDetailsClick = (proposalId: string) => {
    startTransition(() => {
      navigate(`/dao/details/${proposalId}`);
    });
  };

  return (
    <section className="section">
      <div className={styles.sectionContainer + " sectionContainer"}>
        
        <div className={styles.daoInfoContainer}>
          <h1>Governance</h1>
          <DaoPhaseBanner />
        </div>

        <div className={styles.allDaoProposals}>
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

          <div className={styles.tabNavigation}>
            <button
              className={activeTab === 'currentPhase' ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab('currentPhase')}
            >
              Proposals of the current DAO phase
            </button>
            <button
              className={activeTab === 'actionsNeeded' ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab('actionsNeeded')}
            >
              Actions needed
                {daoContext.allDaoProposals.filter(proposal => proposal.state === "3").length > 0 && (
                <span className={styles.actionsNeededBadge}>
                  {daoContext.allDaoProposals.filter(proposal => proposal.state === "3").length}
                </span>
                )}
            </button>
          </div>

            <div>
              <ProposalsTable
                data={
                activeTab === 'currentPhase'
                  ? daoContext.activeProposals.filter(proposal => proposal.state !== "3")
                  : daoContext.allDaoProposals.filter(proposal => proposal.state === "3")
                }
                handleDetailsClick={handleDetailsClick}
                getStateString={daoContext.getStateString}
                searchQuery={searchQuery}
                filterQuery={filterQuery}
              />
            </div>
        </div>
      </div>
    </section>
  );
};

export default DaoHome;