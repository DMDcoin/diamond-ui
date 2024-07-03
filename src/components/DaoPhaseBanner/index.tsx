import { startTransition } from "react";
import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../contexts/DaoContext";

interface DaoProps {}

const DaoPhaseBanner: React.FC<DaoProps> = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();

  return (
    <div className={styles.daoPhaseBanner}>
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
  );
};

export default DaoPhaseBanner;