import styles from "./styles.module.css";
import ProposalsTable from "../../../components/ProposalsTable";
import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../../contexts/DaoContext";
import { Proposal } from "../../../contexts/DaoContext/types";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { startTransition, useEffect, useState } from "react";

interface DaoProps {}

const DaoHome: React.FC<DaoProps> = ({}) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  
  const [filterQuery, setFilterQuery] = useState<string>('');

  useEffect(() => {
    try {
      if (!daoContext.daoInitialized) {
        web3Context.setIsLoading(true);
        daoContext.initialize().then(() => {
          daoContext.getActiveProposals();
        });
      } else if (!daoContext.activeProposals.length) {
        web3Context.setIsLoading(true);
        daoContext.getActiveProposals();
      }
    } catch(err) {}
  }, []);

  const handleDetailsClick = (proposalId: string) => {
    // Navigate to the dynamic route with the proposalId parameter
    startTransition(() => {
      navigate(`/dao/details/${proposalId}`);
    });
  };

  return (
    <div className="mainContainer">
      <div className={styles.daoInfoContainer}>
        <div>
          <h1 className={styles.daoHeading}>Governance</h1>

          <p>
            Stake:{" "}
            {daoContext.myTotalStake
              ? daoContext.myTotalStake.dividedBy(10 ** 18).toString()
              : 0}{" "}
            DMD
          </p>
          <p>
            of total DAO weight{" "}
            <span style={{ fontWeight: "bold" }}>
              {daoContext.totalStakedAmount &&
              daoContext.myTotalStake &&
              Number(daoContext.totalStakedAmount) !== 0 &&
              Number(daoContext.myTotalStake) !== 0
                ? Number(
                    daoContext.myTotalStake.dividedBy(
                      daoContext.totalStakedAmount
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

        <div>
          {daoContext.daoPhase?.phase === "1" && <div></div>}
          <h4>
            {daoContext.daoPhase?.phase === "0" ? "Proposal" : "Voting"} Phase {daoContext.daoPhaseCount}
          </h4>
          <p>{daoContext.phaseEndTimer} till the end</p>
          {daoContext.daoPhase?.phase === "0" && (
            <button
              onClick={() => {
                startTransition(() => {
                  navigate("/dao/create");
                });
              }}
            >
              Create Proposal
            </button>
          )}
        </div>
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
  );
};

export default DaoHome;