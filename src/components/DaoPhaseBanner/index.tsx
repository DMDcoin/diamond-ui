import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../contexts/DaoContext";
import { useWeb3Context } from "../../contexts/Web3Context";
import { startTransition, useEffect, useState } from "react";
import FinalizeProposalsWarn from "../Modals/FinalizeProposalsWarn";
import { useStakingContext } from "../../contexts/StakingContext";

interface DaoProps {
  showDaoStats?: boolean;
}

const DaoPhaseBanner: React.FC<DaoProps> = ({ showDaoStats }) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();

  const [unfinalizedProposalsExist, setUnfinalizedProposalsExist] = useState<boolean>(true);

  useEffect(() => {
    console.log({ showDaoStats }, daoContext.daoPhase?.phase)
  }, [showDaoStats]);

  // TODO: get this from the contract
  useEffect(() => {
    web3Context.contractsManager.daoContract.methods.unfinalizedProposalsExist().call().then((res: boolean) => {
      setUnfinalizedProposalsExist(res);
    });
  }, [daoContext.allDaoProposals, daoContext.daoPhaseCount]);

  return (
    <>
      {
        showDaoStats ? (
          <section className={styles.statisticsTable + " statistics-table"}>
            <div className="container-5">
              <div className="comparison-table">
                <div className="comparison-row-main">
                  <h3 className="heading-3">DAO</h3>
                </div>
                <div className="comparison-row">
                  <div id="w-node-_92822878-c41a-30b0-3d9e-ff70e92725ec-55493c02" className="text-block-3">{daoContext.daoPhaseCount}</div>
                  <div id="w-node-e5752c0d-27c5-1c42-e24d-fa9c23646ba9-55493c02">Count</div>
                </div>

                <div className="comparison-row">
                  <div id="w-node-_92822878-c41a-30b0-3d9e-ff70e92725ec-55493c02" className="text-block-3">{daoContext.daoPhase?.phase === "0" ? "Proposal" : "Voting"}</div>
                  <div id="w-node-e5752c0d-27c5-1c42-e24d-fa9c23646ba9-55493c02">Phase</div>
                </div>

                <div className="comparison-row">
                  <div id="w-node-_92822878-c41a-30b0-3d9e-ff70e92725ec-55493c02" className="text-block-3">{daoContext.phaseEndTimer}</div>
                  <div id="w-node-e5752c0d-27c5-1c42-e24d-fa9c23646ba9-55493c02">Till the end</div>
                </div>

                <div className="comparison-row">
                  <div id="w-node-_92822878-c41a-30b0-3d9e-ff70e92725ec-55493c02" className="text-block-3">{daoContext.governancePotBalance.toFixed(2)} DMD</div>
                  <div id="w-node-e5752c0d-27c5-1c42-e24d-fa9c23646ba9-55493c02">Governance Pot.</div>
                </div>

                <a className={styles.daoBtn + " primaryBtn"} onClick={() => { startTransition(() => { navigate('dao') }) }}>Go to DAO</a>
              </div>
            </div>
          </section>
        ) : (
          <div className={styles.daoPhaseBanner}>
            {daoContext.daoPhase?.phase === "1" && <div></div>}
            <div>
              <h4>{daoContext.daoPhase?.phase === "0" ? "Proposal" : "Voting"} Phase {daoContext.daoPhaseCount}</h4>
              
              {daoContext.daoPhase?.phase === "1" ? (
                <p></p>
              ) : unfinalizedProposalsExist ? (
                <FinalizeProposalsWarn buttonText="Create Proposal" />
              ) : daoContext.daoPhase?.phase === "0" && (
                <button className="primaryBtn" onClick={() => { startTransition(() => { navigate("/dao/create") }) }}>Create Proposal</button>
              )
              }
            </div>

            <p><strong>Timer:</strong> {daoContext.phaseEndTimer} till the end</p>
            
            <p>
              <strong>Stake:</strong>{" "}
              <span>
                {stakingContext.myTotalStake
                  ? stakingContext.myTotalStake.dividedBy(10 ** 18).toFixed(0)
                  : 0}
                  {" "}
                  DMD
              </span>
            </p>

            <p>
              <strong>Voting power:</strong>{" "}
              <span>
                {stakingContext.myPool ? stakingContext.myPool.votingPower.toString() : 0}
                %
              </span>
            </p>
          </div>
        )
      }
    </>
  );
};

export default DaoPhaseBanner;