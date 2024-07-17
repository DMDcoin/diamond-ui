import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../contexts/DaoContext";
import { startTransition, useEffect, useState } from "react";
import FinalizeProposalsWarn from "../Modals/FinalizeProposalsWarn";
import { useWeb3Context } from "../../contexts/Web3Context";

interface DaoProps {}

const DaoPhaseBanner: React.FC<DaoProps> = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const [unfinalizedProposalsExist, setUnfinalizedProposalsExist] = useState<boolean>(true);

  // TODO: get this from the contract
  useEffect(() => {
    web3Context.contractsManager.daoContract.methods.unfinalizedProposalsExist().call().then((res: boolean) => {
      setUnfinalizedProposalsExist(res);
    });
  }, [daoContext.allDaoProposals, daoContext.daoPhaseCount]);

  return (
    <div className={styles.daoPhaseBanner}>
        {daoContext.daoPhase?.phase === "1" && <div></div>}
        <h4>
            {daoContext.daoPhase?.phase === "0" ? "Proposal" : "Voting"} Phase {daoContext.daoPhaseCount}
        </h4>
        <p>{daoContext.phaseEndTimer} till the end</p>
        {daoContext.daoPhase?.phase === "0" && unfinalizedProposalsExist ? (
          <FinalizeProposalsWarn buttonText="Create Proposal" />
        ) : (
          <button className="primaryBtn" onClick={() => {startTransition(() => {navigate("/dao/create")})}}>Create Proposal</button>
        )
      }
    </div>
  );
};

export default DaoPhaseBanner;