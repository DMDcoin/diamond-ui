import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../contexts/DaoContext";
import { useWeb3Context } from "../../contexts/Web3Context";
import { startTransition, useEffect, useState } from "react";
import FinalizeProposalsWarn from "../Modals/FinalizeProposalsWarn";
import { useStakingContext } from "../../contexts/StakingContext";
import BigNumber from "bignumber.js";
import { faArrowUpLong } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface DaoProps {
  showDaoStats?: boolean;
}

const DaoPhaseBanner: React.FC<DaoProps> = ({ showDaoStats }) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();

  const [unfinalizedProposalsExist, setUnfinalizedProposalsExist] = useState<boolean>(true);

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
                  <div id="w-node-_92822878-c41a-30b0-3d9e-ff70e92725ec-55493c02" className="text-block-3">{daoContext.governancePotBalance.toFixed(4, BigNumber.ROUND_DOWN)} DMD</div>
                  <div id="w-node-e5752c0d-27c5-1c42-e24d-fa9c23646ba9-55493c02">Governance Pot</div>
                </div>

                <a className={styles.daoBtn + " primaryBtn"} onClick={() => { startTransition(() => { navigate('dao') }) }}>Go to DAO</a>
              </div>
            </div>
          </section>
        ) : (
          <div className={styles.boxContainer}>
            {daoContext.daoPhase?.phase === "1" && <div></div>}

            <div className={styles.block}>
              <p className={styles.boxHeading}>DAO phase</p>
              <p className={styles.boxDescriptionBig}>
                {daoContext.daoPhase?.phase === "0" ? "Proposal" : "Voting"} Phase {daoContext.daoPhaseCount}
              </p>
              <p className={styles.boxDescriptionSmall}>
                {daoContext.phaseEndTimer} till the end
              </p>
              <div className={styles.boxBtns}>
                {daoContext.daoPhase?.phase === "1" ? (
                  <p></p>
                ) : unfinalizedProposalsExist ? (
                  <FinalizeProposalsWarn buttonText="Create Proposal" />
                ) : daoContext.daoPhase?.phase === "0" && (
                  <button className="primaryBtn" onClick={() => { startTransition(() => { navigate("/dao/create") }) }}>Create Proposal</button>
                )
                }
              </div>
            </div>

            <div className={styles.block}>
              <p className={styles.boxHeading}>Voting power</p>
              <p className={styles.boxDescriptionBig}>
                {stakingContext.myPool ? stakingContext.myPool.votingPower.toString() : 0} %
              </p>
              <p className={styles.boxDescriptionSmall}>
                Pool stake: {stakingContext.myPool
                  ? stakingContext.myPool.totalStake.dividedBy(10 ** 18).toFixed(4, BigNumber.ROUND_DOWN)
                  : 0}
                  {" "}
                  DMD
              </p>
              <p className={styles.boxDescriptionSmall}>
                Proposals created: {daoContext.allDaoProposals.filter((proposal) => proposal.proposer === web3Context.userWallet.myAddr).length}
              </p>
            </div>

            <div className={styles.block}>
              <p className={styles.boxHeading}>Governance pot</p>
              <p className={styles.boxDescriptionBig}>
                {daoContext.governancePotBalance.toFixed(4, BigNumber.ROUND_DOWN)} DMD
              </p>
              <p className={styles.boxDescriptionSmall}>
              <FontAwesomeIcon className={styles.arrowGreen} icon={faArrowUpLong} />
                0.01% sisnce 01.01.2024
              </p>
              <p className={styles.boxDescriptionSmall}></p>
            </div>

            <div className={styles.block}>
              <p className={styles.boxHeading}>Historic proposals</p>
              <p className={styles.boxDescriptionBig}>
                {daoContext.allDaoProposals.length}
              </p>
              <div className={styles.boxBtns}>
                <button className="primaryBtn" onClick={() => startTransition(() => navigate("/dao/historic"))}>See full list</button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default DaoPhaseBanner;