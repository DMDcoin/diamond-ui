import React, { startTransition, useEffect, useState } from "react";
import styles from "./styles.module.css";
import { timestampToDateTime } from "../../utils/common";
import { useWeb3Context } from "../../contexts/Web3Context";
import getStartedImg from "../../assets/images/home/getStarted.svg"
import { useStakingContext } from "../../contexts/StakingContext";
import CreateValidatorModal from "../../components/Modals/CreateValidatorModal";
import { Pool } from "../../contexts/StakingContext/models/model";
import UnstakeModal from "../../components/Modals/UnstakeModal";
import BigNumber from "bignumber.js";
import { useNavigate } from "react-router-dom";
import StakeModal from "../../components/Modals/StakeModal";
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';

interface HomeProps {}

const Home: React.FC<HomeProps> = ({}) => {
  const navigate = useNavigate();
  const [myPool, setMyPool] = useState<Pool | null>(null);
  const { userWallet, connectWallet } = useWeb3Context();

  const {
    pools,
    keyGenRound,
    stakingEpoch,
    epochStartTime,
    epochStartBlock,
    activeValidators,
    validCandidates,
    minimumGasFee,
    reinsertPot,
    deltaPot,
    myTotalStake } = useStakingContext();

    useEffect(() => {
        setMyPool(pools.find(p => p.stakingAddress === userWallet.myAddr) as Pool);
    }, [pools, userWallet.myAddr]);

  return (
    <>

        {
            userWallet.myAddr ? (
                <section className="hero-section">
                    <div className="hero-container">
                        <div className={styles.heroWrapper + " hero-wrapper"}>
                            <div className={styles.heroSplit + " hero-split" }>
                                <div className={styles.infoContainer}>
                                    {
                                        userWallet.myAddr ? <Jazzicon diameter={60} seed={jsNumberForAddress(userWallet.myAddr)} />
                                        : <Jazzicon diameter={60} seed={Math.round(Math.random() * 10000000)} />
                                    }
                                    <div>
                                        <p>User</p>
                                        <p>{userWallet.myAddr}</p>
                                    </div>
                                </div>
                                <div className={styles.statsContainer}>
                                        <table className={styles.styledTable}>
                                            <thead>
                                            </thead>
                                            <tbody>
                                                {myPool && (
                                                    <tr>
                                                        <td>My Stake <span>Voting power {myPool ? myPool.votingPower.toString() : 0}%</span></td>
                                                        <td>{myTotalStake.dividedBy(10**18).toString()} DMD</td>
                                                    </tr>
                                                    )}
                                                    <tr>
                                                        <td>Staked on other candidate</td>
                                                        <td>{myTotalStake.dividedBy(10**18).toString()} DMD</td>
                                                    </tr>
                                                {myPool && (
                                                    <tr>
                                                        <td>Score</td>
                                                        <td>1000</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                </div>
                            </div>

                            <div className="hero-split">
                                <div className={styles.loggedInBtns}>
                                    {
                                        !myPool ? (
                                            <div className={styles.noPoolButtons}>
                                                <CreateValidatorModal buttonText="Create a pool"/>
                                                <a className={styles.tableButton} onClick={() => {startTransition(() => {navigate('staking')})}}>See the list</a>
                                            </div>
                                        ) : (
                                            <>
                                                <StakeModal buttonText="Stake" pool={myPool} />
                                                <UnstakeModal buttonText="Unstake" pool={myPool} />
                                            </>
                                        )
                                    }
                                    {/* <button className={styles.tableButton}>See the list</button> */}
                                    {/* <button className={styles.tableButton}>See history</button> */}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.heroContainer + " hero-container"}>
                        <table className={styles.styledTable}>
                            <thead>
                            {
                                myPool && myPool.delegators.length ? (
                                <tr>
                                    <td></td>
                                    <td>Wallet</td>
                                    <td>Delegated Stake</td>
                                </tr>
                                ) : myPool && (
                                    <tr>
                                        <td>No Delegations</td>
                                    </tr>
                                )
                            }
                            </thead>
                            <tbody>
                            {
                                myPool && myPool.delegators.length ? myPool.delegators.map((delegator, i) => (
                                <tr key={i}>
                                    <td>
                                    <img src="https://via.placeholder.com/50" alt="Image 1" />
                                    </td>
                                    <td>{delegator.address}</td>
                                    <td>{BigNumber(delegator.amount).dividedBy(10**18).toFixed(2)} DMD</td>
                                </tr>
                                )) : myPool && (
                                    <tr>
                                    </tr>
                                )
                            }
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                <section className="hero-section">
                    <div className="hero-container">
                        <div className="hero-wrapper">
                            <div className="hero-split">
                                <div className="div-block-2">
                                    <h1 data-w-id="a02e2c67-a527-8c56-d3ff-56ecb7320e0e" className="heading">Become DMD Chain Participant</h1>
                                </div>
                                <div className="div-block">
                                    <p data-w-id="a02e2c67-a527-8c56-d3ff-56ecb7320e10" className="margin-bottom-24px">Lorem ipsum dolor
                                        sit amet, consectetur adipiscing elit. Suspendisse tincidunt sagittis eros. Quisque quis
                                        euismod lorem. Etiam sodales ac felis id interdum.</p>
                                </div>
                                <div className="div-block-3"><button onClick={connectWallet}
                                        className="button w-button">Get Started</button></div>
                            </div>
                            <div className="hero-split hero-split-responsive"><img
                                    src={getStartedImg}
                                    loading="lazy" width="500" data-w-id="a02e2c67-a527-8c56-d3ff-56ecb7320e15" alt=""
                                    className="shadow-two" /></div>
                        </div>
                    </div>
                </section>
            )
        }

        {!userWallet.myAddr && (
            <section className="features-section">
                <div className="w-layout-blockcontainer container w-container">
                    <div className="w-layout-grid grid">
                        <div id="w-node-_82c72029-306b-2137-d6f7-1cef7db8fe67-55493c02"
                            data-w-id="82c72029-306b-2137-d6f7-1cef7db8fe67"
                            // style="-webkit-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);-moz-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);-ms-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);opacity:0"
                            className="grid-block"><img
                                src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/65fbfe89ded95818b4660096_img_know_diamond.svg"
                                loading="lazy" width="80" alt="" />
                            <div className="text-block">It&#x27;s Easy</div>
                        </div>
                        <div id="w-node-ff91bb0b-4690-c47b-374c-73cc66aa85f0-55493c02"
                            data-w-id="ff91bb0b-4690-c47b-374c-73cc66aa85f0"
                            // style="-webkit-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);-moz-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);-ms-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);opacity:0"
                            className="grid-block"><img
                                src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/65fbfe89ded95818b4660096_img_know_diamond.svg"
                                loading="lazy" width="80" alt="" />
                            <div className="text-block">It&#x27;s Secure</div>
                        </div>
                        <div id="w-node-d810131a-ae46-8317-3705-f066f8b53080-55493c02"
                            data-w-id="d810131a-ae46-8317-3705-f066f8b53080"
                            // style="-webkit-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);-moz-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);-ms-transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);transform:translate3d(0px, 300px, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0);opacity:0"
                            className="grid-block"><img
                                src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/65fbfe89ded95818b4660096_img_know_diamond.svg"
                                loading="lazy" width="80" alt="" />
                            <div className="text-block">All In One Place</div>
                        </div>
                    </div>
                </div>
            </section>
        )}

      <section className="statistics-table">
          <div className="container-5">
              <div className="comparison-table">
                  <div className="comparison-row-main">
                      <h3 className="heading-3">Network Statistics</h3>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-_92822878-c41a-30b0-3d9e-ff70e92725ec-55493c02" className="text-block-3">{stakingEpoch}</div>
                      <div id="w-node-e5752c0d-27c5-1c42-e24d-fa9c23646ba9-55493c02">Current Epoch</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-c798ac08-165e-43d0-28dc-cffd8819e10f-55493c02" className="text-block-4">{keyGenRound}</div>
                      <div id="w-node-c798ac08-165e-43d0-28dc-cffd8819e111-55493c02">Key Gen. Round</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-_6a59d24c-fda0-91f0-85a0-41a56296eb04-55493c02" className="text-block-6">{timestampToDateTime(epochStartTime)}</div>
                      <div id="w-node-_6a59d24c-fda0-91f0-85a0-41a56296eb06-55493c02">Epoch Start Time</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-_765acecc-35cc-2bea-6a4e-27cc27b481c1-55493c02" className="text-block-5">{epochStartBlock}</div>
                      <div id="w-node-_765acecc-35cc-2bea-6a4e-27cc27b481c3-55493c02">Epoch Start Block</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-eb02ae79-453d-bd82-00c0-4af2761f6182-55493c02" className="text-block-10">{activeValidators}</div>
                      <div id="w-node-eb02ae79-453d-bd82-00c0-4af2761f6184-55493c02">Active Validators</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-_60a915bd-b96b-bc56-2e0c-2c07dd3b362d-55493c02" className="text-block-11">{validCandidates}</div>
                      <div id="w-node-_60a915bd-b96b-bc56-2e0c-2c07dd3b362f-55493c02">Valid Candidates</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-_1ea50c7a-12aa-dd36-b910-bd059d6bb450-55493c02" className="text-block-9">{minimumGasFee.dividedBy(10**9).toString()} Gwei</div>
                      <div id="w-node-_1ea50c7a-12aa-dd36-b910-bd059d6bb452-55493c02">Min. Gas Fee</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-fe9c7aba-1cf1-1294-965a-25d4541b0b4e-55493c02" className="text-block-8">{Number(reinsertPot).toFixed(2)} DMD</div>
                      <div id="w-node-fe9c7aba-1cf1-1294-965a-25d4541b0b50-55493c02">Reinsert Pot</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-ffe6588c-15de-1720-8f19-a1a3639524a6-55493c02" className="text-block-7">{Number(deltaPot).toFixed(2)} DMD</div>
                      <div id="w-node-ffe6588c-15de-1720-8f19-a1a3639524a8-55493c02">Delta Pot</div>
                  </div>
              </div>
          </div>
      </section>

      <section className="logos-title-large">
          <div className="container-8">
              <h2 className="heading-3 heading-left">DMD Ecosystem Partners</h2>
              <div className="clients-wrapper"><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a395a12aaf3_logo-01.svg"
                      loading="lazy" alt="Arise Health logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a395a12aaf3_logo-01.svg"
                      loading="lazy" alt="Arise Health logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a395a12aaf3_logo-01.svg"
                      loading="lazy" alt="Arise Health logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a395a12aaf3_logo-01.svg"
                      loading="lazy" alt="Arise Health logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a395a12aaf3_logo-01.svg"
                      loading="lazy" alt="Arise Health logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124ade1612aaf2_logo-02.svg"
                      loading="lazy" alt="The Paak logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124ae38212aaf1_logo-03.svg"
                      loading="lazy" alt="OE logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a411512aaf4_logo-04.svg"
                      loading="lazy" alt="2020INC logo" className="clients-image" /><img
                      src="https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a3cd712aaf6_logo-05.svg"
                      loading="lazy" alt="Ephicient logo" className="clients-image" /></div>
          </div>
      </section>

      <section className="cta-banner">
          <div className="container-7">
              <div className="hero-wrapper-two">
                  <h1 className="heading-3">Become DMD Chain Participant</h1>
                  <p className="margin-bottom-24px-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
                      tincidunt sagittis eros. Quisque quis euismod lorem. Etiam sodales ac felis id interdum. Lorem ipsum
                      dolor sit amet, consectetur adipiscing elit. Suspendisse tincidunt sagittis eros. Quisque quis
                      euismod lorem. Etiam sodales ac felis id interdum. Lorem ipsum dolor sit amet, consectetur
                      adipiscing elit. Suspendisse tincidunt sagittis eros. Quisque quis euismod lorem. Etiam sodales ac
                      felis id interdum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse tincidunt
                      sagittis eros. Quisque quis euismod lorem. Etiam sodales ac felis id interdum. Lorem ipsum dolor sit
                      amet, consectetur adipiscing elit. Suspendisse tincidunt sagittis eros. Quisque quis euismod lorem.
                      Etiam sodales ac felis id interdum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Suspendisse tincidunt sagittis eros. Quisque quis euismod lorem. Etiam sodales ac felis id interdum.
                  </p><a href="#" className="button w-button">Get Started</a>
              </div>
          </div>
      </section>

      <section className="faq-table">
          <div className="container-9">
              <div className="comparison-row-main">
                  <h2 className="heading-3">FAQ</h2>
              </div>
              <div className="comparison-table-2 comparison-table">
                  <div className="comparison-row"><a id="w-node-_52dc161a-babb-9cb4-346b-70d6512420f0-55493c02" href="#"
                          className="faq-link">What is DMD?</a></div>
                  <div className="comparison-row"><a id="w-node-_885318db-0163-90d7-58eb-6c85d39ae9b3-55493c02" href="#"
                          className="faq-link">What is a Node?</a></div>
                  <div className="comparison-row"><a id="w-node-d45b2b99-b8a3-01f2-7562-55be1b54c7fa-55493c02" href="#"
                          className="faq-link">How to stake and become a validator?</a></div>
              </div>
          </div>
      </section>

    </>
  );
};

export default Home;
