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
          <div>
            <h1 className={styles.daoHeading}>Governance</h1>

            <p>
              Stake:{" "}
              {stakingContext.myTotalStake
                ? stakingContext.myTotalStake.dividedBy(10 ** 18).toString()
                : 0}{" "}
              DMD
            </p>
            <p>
              % of total DAO weight{" "}
              <span style={{ fontWeight: "bold" }}>
                {stakingContext.totalDaoStake &&
                stakingContext.myTotalStake &&
                Number(stakingContext.totalDaoStake) !== 0 &&
                Number(stakingContext.myTotalStake) !== 0
                  ? Number(
                      stakingContext.myTotalStake.dividedBy(
                        stakingContext.totalDaoStake
                      )
                    ).toFixed(2)
                  : 0}
                %
              </span>
            </p>

            <input
              type="text"
              placeholder="Search"
              className={styles.daoSearch}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <DaoPhaseBanner />
        </div>

        <div className={styles.myDaoProposals}>
          <h2>My Proposals</h2>
          <div>
            <ProposalsTable
              data={daoContext.activeProposals}
              userWallet={web3Context.userWallet}
              handleDetailsClick={handleDetailsClick}
              getStateString={daoContext.getStateString}
              filterQuery={filterQuery}
            />
          </div>
        </div>

        <div className={styles.allDaoProposals}>
          <h2>All Proposals</h2>
          <div>
            <ProposalsTable
              data={daoContext.activeProposals}
              handleDetailsClick={handleDetailsClick}
              getStateString={daoContext.getStateString}
              filterQuery={filterQuery}
            />
          </div>
        </div>

        <span
          onClick={() => startTransition(() => navigate("/dao/historic"))}
          className={styles.historicProposalsLink}
        >
          Historic Proposals
        </span>
      </div>
    </section>
  );
};

export default DaoHome;