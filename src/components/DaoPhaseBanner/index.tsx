import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../contexts/DaoContext";
import { startTransition, useEffect, useState } from "react";
import FinalizeProposalsWarn from "../Modals/FinalizeProposalsWarn";

interface DaoProps {}

const DaoPhaseBanner: React.FC<DaoProps> = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();

  const [unfinalizedProposalsCount, setUnfinalizedProposalsCount] = useState<number>(0);

  // get this from the contract
  useEffect(() => {
    const unfinalizedProposals = daoContext.allDaoProposals.filter((proposal) => proposal.state === "3");
    setUnfinalizedProposalsCount(unfinalizedProposals.length);
  }, [daoContext.allDaoProposals]);

  return (
    <div className={styles.daoPhaseBanner}>
        {daoContext.daoPhase?.phase === "1" && <div></div>}
        <h4>
            {daoContext.daoPhase?.phase === "0" ? "Proposal" : "Voting"} Phase {daoContext.daoPhaseCount}
        </h4>
        <p>{daoContext.phaseEndTimer} till the end</p>
        {daoContext.daoPhase?.phase === "0" && unfinalizedProposalsCount === 0 ? (
            <button className="primaryBtn" onClick={() => {startTransition(() => {navigate("/dao/create")})}}>Create Proposal</button>
        ) : (
          <FinalizeProposalsWarn buttonText="Create Proposal" />
        )
      }
    </div>
  );
};

export default DaoPhaseBanner;