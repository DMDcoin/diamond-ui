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
import p2bLogo from "../../assets/images/home/logo_p2pb2b.png";
import bitmartLogo from "../../assets/images/home/logo_bitmart.png";
import blockserveLogo from "../../assets/images/home/logo_blockserv.png";
import RemoveValidatorModal from "../../components/Modals/RemoveValidatorModal";

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
    myTotalStake,
    myCandidateStake,
    claimOrderedUnstake } = useStakingContext();

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
                                        <table className={styles.styledTableFirst}>
                                            <thead>
                                            </thead>
                                            <tbody>
                                                {myPool && (
                                                    <>
                                                        <tr>
                                                            <td>My stake</td>
                                                            <td>{myTotalStake.dividedBy(10**18).toString()} DMD</td>
                                                        </tr>
                                                        <tr>
                                                            <td>Node stake <span>Voting power {myPool ? myPool.votingPower.toString() : 0}%</span></td>
                                                            <td>{BigNumber(myPool.totalStake).dividedBy(10**18).toString()} DMD</td>
                                                        </tr>
                                                    </>
                                                )}
                                                    <tr>
                                                        <td>Staked on other candidate</td>
                                                        <td>{myCandidateStake.dividedBy(10**18).toString()} DMD</td>
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
                                                {
                                                    myPool && BigNumber(myPool.orderedWithdrawAmount).isGreaterThan(0) && BigNumber(myPool.orderedWithdrawUnlockEpoch).isLessThanOrEqualTo(stakingEpoch) && userWallet.myAddr && (
                                                        <button className={styles.tableButton} onClick={() => claimOrderedUnstake(myPool)}>Claim</button> )
                                                }
                                                {
                                                    myPool && myPool.delegators.length === 0 && <RemoveValidatorModal buttonText="Remove node" pool={myPool} />
                                                }
                                            </>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.heroContainer + " hero-container"}>
                        <table className={styles.styledTableFirst}>
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
                                    <p
                                        data-w-id="a02e2c67-a527-8c56-d3ff-56ecb7320e10"
                                        className="margin-bottom-24px"
                                    >
                                        Welcome to the DMD Diamond Blockchain Staking Platform –
                                        your gateway to earning passive income while contributing to
                                        the security and functionality of the DMD network. Embark on
                                        your staking adventure with us and unlock the full potential
                                        of your digital assets.
                                    </p>
                                </div>
                                <div className="div-block-3"><button onClick={connectWallet} className="button w-button">Get Started</button></div>
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
                            className="grid-block"><img
                                src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/65fbfe89ded95818b4660096_img_know_diamond.svg"
                                loading="lazy" width="80" alt="" />
                            <div className="text-block">It&#x27;s Easy</div>
                        </div>
                        <div id="w-node-ff91bb0b-4690-c47b-374c-73cc66aa85f0-55493c02"
                            data-w-id="ff91bb0b-4690-c47b-374c-73cc66aa85f0"
                            className="grid-block"><img
                                src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/65fbfe89ded95818b4660096_img_know_diamond.svg"
                                loading="lazy" width="80" alt="" />
                            <div className="text-block">It&#x27;s Secure</div>
                        </div>
                        <div id="w-node-d810131a-ae46-8317-3705-f066f8b53080-55493c02"
                            data-w-id="d810131a-ae46-8317-3705-f066f8b53080"
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

      {
        userWallet.myAddr && (
            <section className="hero-section">
                <div className="hero-container">
                    <div className={styles.topValidatorsContainer}>
                        <div className="comparison-row-main">
                            <h3 className="heading-3">Top 5 validator candidates</h3>
                        </div>
                        <div className={styles.tableContainer}>
                            <table className={styles.styledTable}>
                                <thead>
                                    <tr>
                                        <th>Wallet</th>
                                        <th>Total Stake</th>
                                        <th>Voting Power</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                    pools
                                        .sort((a, b) => BigNumber(b.totalStake).minus(a.totalStake).toNumber())  // Sort pools by totalStake in descending order
                                        .slice(0, 5)  // Get the top 5 pools
                                        .map((pool, i) => (
                                        <tr key={i} onClick={() => navigate(`/staking/details/${pool.stakingAddress}`)} className={styles.tableBodyRow}>
                                            <td>{pool.stakingAddress}</td>
                                            <td>{BigNumber(pool.totalStake).dividedBy(10**18).toString()} DMD</td>
                                            <td>{pool.votingPower.toString()}%</td>
                                            <td>1000</td>
                                        </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                        
                        <a className={styles.tableButton} onClick={() => {startTransition(() => {navigate('staking')})}}>See the list</a>
                    </div>
                </div>
            </section>
        )
      }

      {
        !userWallet.myAddr && (
            <>
                <section className="logos-title-large">
                    <div className="container-8">
                        <h2 className="heading-3 heading-left">DMD Ecosystem Partners</h2>
                        <div className={styles.clientsWrapper + " clients-wrapper"}>

                            <img src={p2bLogo} height="39" loading="lazy" alt="Arise Health logo" className="clients-image" />
                            <img src={bitmartLogo} height="39" loading="lazy" alt="Arise Health logo" className="clients-image" />
                            <img src={blockserveLogo} height="39" loading="lazy" alt="Arise Health logo" className="clients-image" />
                        </div>
                    </div>
                </section>

                <section className="cta-banner">
                    <div className="container-7">
                        <div className="hero-wrapper-two">
                            <h1 className="heading-3">Become DMD Chain Participant</h1>
                            <p className="margin-bottom-24px-2">
                                    <strong>Seamless Staking Experience:</strong> Begin your journey by connecting your cryptocurrency wallet and explore the variety of staking options available. Our intuitive UI ensures a smooth and straightforward staking process.
                            </p>
                            <p className="margin-bottom-24px-2">
                                    <strong>Real-Time Analytics:</strong> Stay informed with transparent data on staking pools, performance, and rewards. Our platform provides you with the insights needed to make the best staking decisions.
                            </p>
                            <p className="margin-bottom-24px-2">
                                    <strong>Earn Rewards:</strong> By staking your DMD coins, you actively participate in transaction validation, securing the blockchain, and in return, receive additional DMD as rewards.
                            </p>
                            <p className="margin-bottom-24px-2">
                                    <strong>Community Support:</strong> Join a community of like-minded individuals passionate about decentralized finance and the growth of the DMD ecosystem. Participate in the Decentralized Governance by voting on the proposals created by the community members.
                            </p>
                            { !userWallet.myAddr && <div className="div-block-3"><button onClick={connectWallet} className="button w-button">Get Started</button></div> }
                        </div>
                    </div>
                </section>
            </>
        )
      }

    </>
  );
};

export default Home;
