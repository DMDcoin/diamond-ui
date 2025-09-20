import React, { startTransition, useEffect, useState } from "react";
import styles from "./styles.module.css";
import { timestampToDateTime, truncateAddress } from "../../utils/common";
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
import xeggexLogo from "../../assets/images/home/logo_xegex.png";
import bitmartLogo from "../../assets/images/home/logo_bitmart.png";
import blockserveLogo from "../../assets/images/home/logo_blockserv.png";
import RemoveValidatorModal from "../../components/Modals/RemoveValidatorModal";
import DaoPhaseBanner from "../../components/DaoPhaseBanner";
import ScoreHistoryModal from "../../components/Modals/ScoreHistoryModal";
import { useWalletConnectContext } from "../../contexts/WalletConnect";
import UpdatePoolOperatorModal from "../../components/Modals/UpdatePoolOperator";
import { useDaoContext } from "../../contexts/DaoContext";
import copy from "copy-to-clipboard";
import { toast } from "react-toastify";

interface HomeProps {}

const Home: React.FC<HomeProps> = ({}) => {
  const navigate = useNavigate();
  const { userWallet } = useWeb3Context();
  const { isSyncingPools } = useStakingContext();
  const { claimingContractBalance } = useDaoContext();
  const walletConnectContext = useWalletConnectContext();

  const {
    pools,
    myPool,
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

    const copyData = (data: string) => {
        copy(data);
        toast.success("Copied to clipboard");
    };

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);

        // Polyfill for <details> if not supported
        if (!("open" in document.createElement("details"))) {
            document.querySelectorAll("details").forEach((details) => {
                const summary = details.querySelector("summary");
                if (summary) {
                    summary.addEventListener("click", () => {
                        if (details.hasAttribute("open")) {
                            details.removeAttribute("open");
                        } else {
                            details.setAttribute("open", "open");
                        }
                    });
                }
            });
        }
    }, []);

  return (
    <>

        {
            userWallet.myAddr ? (
                <section className={styles.heroSection + " hero-section"}>
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
                                        <p onClick={() => copyData(userWallet.myAddr)}>{truncateAddress(userWallet.myAddr)}</p>
                                    </div>
                                    {
                                        myPool && (
                                            <p className={myPool?.isActive || (myPool?.isToBeElected || myPool?.isPendingValidator) ? styles.poolActive : styles.poolBanned}>
                                                {myPool?.isActive ? "Active" : (myPool?.isToBeElected || myPool?.isPendingValidator) ? "Valid" : "Invalid"}
                                            </p>
                                        )
                                    }
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
                                                        <td>{myTotalStake.dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Node stake <span>Voting power {myPool ? myPool.votingPower.toString() : 0}%</span></td>
                                                        <td style={{ verticalAlign: 'top' }}>
                                                            {BigNumber(myPool.totalStake).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD
                                                        </td>
                                                        <td>
                                                            <div className={styles.loggedInBtns}>
                                                                {
                                                                    myPool && (
                                                                        <>
                                                                            <StakeModal buttonText="Stake" pool={myPool} />
                                                                            {
                                                                                myPool && BigNumber(myPool.orderedWithdrawAmount).isGreaterThan(0) && BigNumber(myPool.orderedWithdrawUnlockEpoch).isLessThanOrEqualTo(stakingEpoch) && userWallet.myAddr ? (
                                                                                    <button className="primaryBtn" onClick={() => claimOrderedUnstake(myPool)}>Claim</button> ) : (
                                                                                        <UnstakeModal buttonText="Unstake" pool={myPool} />
                                                                                    )
                                                                            }
                                                                            {
                                                                                myPool && !myPool.isActive && <RemoveValidatorModal buttonText="Remove pool" pool={myPool} />
                                                                            }
                                                                        </>
                                                                    )
                                                                }
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>Node Operator shared rewards</td>
                                                        <td>{myPool.poolOperatorShare && BigNumber(myPool.poolOperatorShare).dividedBy(100).toString()} %</td>
                                                        <td>
                                                            <div className={styles.loggedInBtns}>
                                                            <UpdatePoolOperatorModal buttonText="Update" pool={myPool} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </>
                                            )}
                                                <tr>
                                                    <td>Staked on other candidate</td>
                                                    <td>{myCandidateStake.dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD</td>
                                                    <td>
                                                        <div className={styles.loggedInBtns}>
                                                            {
                                                                !myPool && (
                                                                    <div className={styles.noPoolButtons}>
                                                                        <CreateValidatorModal buttonText="Create a pool"/>
                                                                    </div>
                                                                )
                                                            }
                                                        </div>
                                                    </td>
                                                </tr>
                                            {myPool && (
                                                <tr>
                                                    <td>Score</td>
                                                    <td>{myPool.score}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.heroContainer + " hero-container"}>
                        {myPool && (
                            <>
                                <div className="comparison-row-main">
                                    <h2 className="heading-3">Delegates</h2>
                                </div>
                                <table className={styles.styledTable}>
                                    {
                                    (() => {
                                            return (
                                                myPool && myPool.delegators.length ? (
                                                    <>
                                                        <thead>
                                                            <tr>
                                                                <td></td>
                                                                <td>Wallet</td>
                                                                <td>Delegated Stake</td>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                        {
                                                            myPool && myPool.delegators.length ? myPool.delegators.map((delegator, i) => (
                                                            <tr key={i} className={styles.tableBodyRow}>
                                                                <td>
                                                                    <Jazzicon diameter={40} seed={jsNumberForAddress(delegator.address)} />
                                                                </td>
                                                                <td>{delegator.address}</td>
                                                                <td>{BigNumber(delegator.amount).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD</td>
                                                            </tr>
                                                            )) : myPool && (
                                                                <tr>
                                                                </tr>
                                                            )
                                                        }
                                                        </tbody>
                                                    </>
                                                ) : (
                                                    <thead>
                                                        <tr>
                                                            <th>No Delegations</th>
                                                        </tr>
                                                    </thead>
                                                )
                                            )
                                        })()
                                    }
                                </table>
                            </>
                        ) }
                    </div>

                    <div className={styles.heroContainer + " hero-container"}>
                        <div className={styles.topValidatorsContainer}>
                            <div className="comparison-row-main">
                                <h3 className="heading-3">Validators I've Staked On</h3>
                            </div>
                            <div className={styles.tableContainer}>
                                <table className={styles.styledTable}>
                                    {
                                        (() => {
                                            const hasStakedOnValidators = pools.filter((p) => BigNumber(p.myStake).isGreaterThan(0)).slice(0, 5);
                                            return hasStakedOnValidators.length ? (
                                                <>
                                                    <thead>
                                                        <tr>
                                                            <th></th>
                                                            <th>Wallet</th>
                                                            <th>Total Stake</th>
                                                            <th>My Stake</th>
                                                            <th>Voting Power</th>
                                                            <th>Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            pools
                                                                .filter((p) => BigNumber(p.myStake).isGreaterThan(0))  // Sort pools by totalStake in descending order
                                                                .slice(0, 5)  // Get the top 5 pools
                                                                .map((pool, i) => (
                                                                    <tr key={i} onClick={() => navigate(`/staking/details/${pool.stakingAddress}`)} className={styles.tableBodyRow}>
                                                                        <td>
                                                                            <Jazzicon diameter={40} seed={jsNumberForAddress(pool.stakingAddress)} />
                                                                        </td>
                                                                        <td>{pool.stakingAddress}</td>
                                                                        <td>{BigNumber(pool.totalStake).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD</td>
                                                                        <td>{userWallet.myAddr && BigNumber(pool.myStake) ? BigNumber(pool.myStake).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN) : (<div className={styles.loader}></div>) } DMD</td>
                                                                        <td>{pool.votingPower.toString()}%</td>
                                                                        <td>{pool.score}</td>
                                                                    </tr>
                                                                ))
                                                        }
                                                    </tbody>
                                                </>
                                            ) : (
                                                <thead>
                                                    <tr>
                                                        <th>No stakes</th>
                                                    </tr>
                                                </thead>
                                            );
                                        })()
                                    }
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className={styles.heroContainer + " hero-container"}>
                        <DaoPhaseBanner showDaoStats={true} />
                    </div>
                </section>
            ) : (
                <section className="hero-section">
                    <div className="hero-container">
                        <div className="hero-wrapper">
                            <div className="hero-split">
                                <div className={styles.mainHeading + " div-block-2"}>
                                    <h1 data-w-id="a02e2c67-a527-8c56-d3ff-56ecb7320e0e" className="heading">Become DMD Chain Participant</h1>
                                </div>
                                <div className="div-block">
                                    <p
                                        data-w-id="a02e2c67-a527-8c56-d3ff-56ecb7320e10"
                                        className={styles.heroDescription + " margin-bottom-24px"}
                                    >
                                        Welcome to the DMD Diamond Blockchain Staking Platform –
                                        your gateway to earning rewards while contributing to
                                        the security and functionality of the DMD network. Embark on
                                        your staking adventure with us and unlock the full potential
                                        of your digital assets.
                                    </p>
                                </div>
                                <div className="div-block-3"><button onClick={() => walletConnectContext.appKit.open()} disabled={isSyncingPools} className={styles.actionBtn + " button w-button"}>Get Started</button></div>
                            </div>
                            <div className={styles.heroSplit + " hero-split hero-split-responsive"}>
                                <img
                                    src={getStartedImg}
                                    loading="lazy" width="500" data-w-id="a02e2c67-a527-8c56-d3ff-56ecb7320e15" alt=""
                                    className={styles.heroSplitImg + " shadow-two"} />
                            </div>
                        </div>
                    </div>
                </section>
            )
        }

        {!userWallet.myAddr && (
            <section className="features-section">
                <div className="w-layout-blockcontainer container w-container">
                    <div className={styles.gridContainer + "w-layout-grid grid"}>
                        <div id="w-node-_82c72029-306b-2137-d6f7-1cef7db8fe67-55493c02"
                            data-w-id="82c72029-306b-2137-d6f7-1cef7db8fe67"
                            className={styles.gridBlock + " grid-block"}><img
                                src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/65fbfe89ded95818b4660096_img_know_diamond.svg"
                                loading="lazy" width="80" alt="" />
                            <div className="text-block">It&#x27;s Easy</div>
                        </div>
                        <div id="w-node-ff91bb0b-4690-c47b-374c-73cc66aa85f0-55493c02"
                            data-w-id="ff91bb0b-4690-c47b-374c-73cc66aa85f0"
                            className={styles.gridBlock + " grid-block"}><img
                                src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/65fbfe89ded95818b4660096_img_know_diamond.svg"
                                loading="lazy" width="80" alt="" />
                            <div className="text-block">It&#x27;s Secure</div>
                        </div>
                        <div id="w-node-d810131a-ae46-8317-3705-f066f8b53080-55493c02"
                            data-w-id="d810131a-ae46-8317-3705-f066f8b53080"
                            className={styles.gridBlock + " grid-block"}><img
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
                      <div id="w-node-fe9c7aba-1cf1-1294-965a-25d4541b0b4e-55493c02" className="text-block-8">{BigNumber(reinsertPot).toFixed(4, BigNumber.ROUND_DOWN)} DMD</div>
                      <div id="w-node-fe9c7aba-1cf1-1294-965a-25d4541b0b50-55493c02">Reinsert Pot</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-ffe6588c-15de-1720-8f19-a1a3639524a6-55493c02" className="text-block-7">{BigNumber(deltaPot).toFixed(4, BigNumber.ROUND_DOWN)} DMD</div>
                      <div id="w-node-ffe6588c-15de-1720-8f19-a1a3639524a8-55493c02">Delta Pot</div>
                  </div>
                  <div className="comparison-row">
                      <div id="w-node-ffe6588c-15de-1720-8f19-a1a3639524a6-55493c02" className="text-block-7">{claimingContractBalance.toFixed(4, BigNumber.ROUND_DOWN)} DMD</div>
                      <div id="w-node-ffe6588c-15de-1720-8f19-a1a3639524a8-55493c02">Claiming Pot</div>
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
                            <h3 className="heading-3">Top 5 validators</h3>
                        </div>
                        <div className={styles.tableContainer}>
                            <table className={styles.styledTable}>
                                <thead>
                                    <tr>
                                        <th></th>
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
                                            <td>
                                                <Jazzicon diameter={40} seed={jsNumberForAddress(pool.stakingAddress)} />
                                            </td>
                                            <td>{pool.stakingAddress}</td>
                                            <td>{BigNumber(pool.totalStake).dividedBy(10**18).toFixed(4, BigNumber.ROUND_DOWN)} DMD</td>
                                            <td>{pool.votingPower.toString()}%</td>
                                            <td>{pool.score}</td>
                                        </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                        
                        <a className="primaryBtn" onClick={() => {startTransition(() => {navigate('staking')})}}>See the list</a>
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

                            <img src={p2bLogo} height="39" loading="lazy" alt="p2b logo" className="clients-image" />
                            <img src={bitmartLogo} height="39" loading="lazy" alt="bitmart logo" className="clients-image" />
                            <img src={xeggexLogo} height="39" loading="lazy" alt="blockserve logo" className="clients-image" />
                            <img src={blockserveLogo} height="39" loading="lazy" alt="blockserve logo" className="clients-image" />
                        </div>
                    </div>
                </section>

                <section className={styles.teamSection + " features-section"}>
                    <div className="container-8">
                        <h2 className="heading-3 heading-left">Meet Our Team</h2>
                        <div className="w-layout-blockcontainer container w-container">
                            <ul className={styles.teamList}>
                                <li className={styles.teamMember}>
                                    <div className={styles.teamMemberHeader}>
                                        <span className={styles.teamMemberName}>Aleksander Mesor</span>
                                        <span className={styles.teamMemberTitle}>The Mentor</span>
                                    </div>
                                    <p className={styles.teamMemberDescription}>
                                        Leading the Diamond DMD Foundation for more than 7 years, Aleksander brings unmatched dedication and passion to the project, as well as experience in operations, leadership, and communications.
                                    </p>
                                </li>
                                
                                <li className={styles.teamMember}>
                                    <div className={styles.teamMemberHeader}>
                                        <span className={styles.teamMemberName}>Helmut Siedl</span>
                                        <span className={styles.teamMemberTitle}>The Visionary</span>
                                    </div>
                                    <p className={styles.teamMemberDescription}>
                                        Leading the vision and research on the mechanics and technology of the coin, Helmut brings impeccable attention to detail and deep research skills for assessing and adopting the best technology for the DMD project. Helmut has been deeply involved in the blockchain space for more than 7 years and is a co-founder of the lab10 and a founder of Blockserv Blockchain Services, leading technology initiatives that create a freer society.
                                    </p>
                                </li>
                                
                                <li className={styles.teamMember}>
                                    <div className={styles.teamMemberHeader}>
                                        <span className={styles.teamMemberName}>Thomas Haller</span>
                                        <span className={styles.teamMemberTitle}>The Lead Developer</span>
                                    </div>
                                    <p className={styles.teamMemberDescription}>
                                        Bringing deep experience in software development and blockchain, Thomas provides technical guidance for the implementation of the DMD technology.
                                    </p>
                                </li>
                                
                                <li className={styles.teamMember}>
                                    <div className={styles.teamMemberHeader}>
                                        <span className={styles.teamMemberName}>Dieter Biernat</span>
                                        <span className={styles.teamMemberTitle}>The Website Expert</span>
                                    </div>
                                    <p className={styles.teamMemberDescription}>
                                        In charge of the blockchain's website and online-marketing.
                                    </p>
                                </li>
                                
                                <li className={styles.teamMember}>
                                    <div className={styles.teamMemberHeader}>
                                        <span className={styles.teamMemberName}>Braineeq</span>
                                        <span className={styles.teamMemberTitle}>Social Media, Community Interactions, and Content Creator</span>
                                    </div>
                                    <p className={styles.teamMemberDescription}>
                                        Braineeq brings many years of experience in content writing and community management in the blockchain ecosystem, hence blowing the trumpet of the DMD diamond blockchain and its use cases to the whole world.
                                    </p>
                                </li>
                                
                                <li className={styles.teamMember}>
                                    <div className={styles.teamMemberHeader}>
                                        <span className={styles.teamMemberName}>Dr. David Forstenlechner</span>
                                        <span className={styles.teamMemberTitle}>The HBBFT Protocol Expert</span>
                                    </div>
                                    <p className={styles.teamMemberDescription}>
                                        David brings more than 15 years of software development experience to the project as a contributor.
                                    </p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className={styles.featuresSection + " features-section"}>
                    <h2 className={styles.heading3 + " heading-3"}>Become DMD Chain Participant</h2>

                    <div className="w-layout-blockcontainer container w-container">
                        <div className={styles.gridContainer2 + " w-layout-grid grid"}>
                            <div id="w-node-_82c72029-306b-2137-d6f7-1cef7db8fe67-55493c02"
                                data-w-id="82c72029-306b-2137-d6f7-1cef7db8fe67"
                                className={styles.gridBlock2 + " grid-block"}>
                                <div className="text-block">Seamless Staking Experience</div>
                                <p>Begin your journey by connecting your cryptocurrency wallet and explore the variety of staking options available. Our intuitive UI ensures a smooth and straightforward staking process.</p>
                            </div>
                            <div id="w-node-_82c72029-306b-2137-d6f7-1cef7db8fe67-55493c02"
                                data-w-id="82c72029-306b-2137-d6f7-1cef7db8fe67"
                                className={styles.gridBlock2 + " grid-block"}>
                                <div className="text-block">Real-Time Analytics</div>
                                <p>Stay informed with transparent data on staking pools, performance, and rewards. Our platform provides you with the insights needed to make the best staking decisions.</p>
                            </div>
                            <div id="w-node-_82c72029-306b-2137-d6f7-1cef7db8fe67-55493c02"
                                data-w-id="82c72029-306b-2137-d6f7-1cef7db8fe67"
                                className={styles.gridBlock2 + " grid-block"}>
                                <div className="text-block">Earn Rewards</div>
                                <p>By staking your DMD coins, you actively participate in transaction validation, securing the blockchain, and in return, receive additional DMD as rewards.</p>
                            </div>
                            <div id="w-node-_82c72029-306b-2137-d6f7-1cef7db8fe67-55493c02"
                                data-w-id="82c72029-306b-2137-d6f7-1cef7db8fe67"
                                className={styles.gridBlock2 + " grid-block"}>
                                <div className="text-block">Community Support</div>
                                <p>Join a community of like-minded individuals passionate about decentralized finance and the growth of the DMD ecosystem. Participate in the Decentralized Governance by voting on the proposals created by the community members.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="logos-title-large">
                    <div className="container-8">
                        <div className="hero-wrapper-two">
                            <h2 className="heading-3 heading-left">Frequently Asked Questions</h2>

                            <details>
                                <summary>1. What Is Staking?</summary>
                                <p>
                                    Staking in the DMD ecosystem is a way for holders to grow their holdings while contributing to the security and governance of the network. You can either become a validator (actively participate in the network's operations) or delegate your DMD to a validator and by doing so increase his chance to become selected as an active validator. Validators perform tasks like creating new blocks and validating transactions, while delegators support a validator by staking their DMD with them and sharing in the rewards.
                                </p>
                            </details>

                            <details>
                                <summary>2. Who Is A Validator?</summary>
                                <p>
                                    Blockchain validators or validator candidates are responsible for verifying and adding transactions to the blockchain. Users delegate their coins, or stake, to a validator. Validators receive 20% rewards from each Epoch they participate in as active validators, as a Validator operator reward. The rest of the Validator rewards (80%) are distributed proportionally based on the staked coins on that validator.
                                </p>
                                <p><strong>Validator candidates require:</strong></p>
                                <ul style={{ listStyleType: 'disc' }}>
                                    <li>Full node installation of the DMDv4 chain on a Linux server with the DMD version of Open Ethereum, which includes the DMDv4 extensions (HBBFT/POSDAO) and proper configuration.</li>
                                    <li>Internet with a Static IP address and reliable 24/7 uptime.</li>
                                    <li>Minimum collateral of 10,000 DMD (from validator candidate owner), with a maximum of 50,000 DMD staked on one validator candidate (combined from the owner and others who stake on top of the node).</li>
                                    <li>Link to the address of the node that performs the work.</li>
                                    <li>Validator candidate registration and collateral locking through the POSDAO dApp.</li>
                                </ul>
                                <p>
                                    Explore more about validators <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/D.-The-DMD-Diamond-Blockchain's-Solutions#d62-validators">here</a>.
                                </p>
                            </details>

                            <details>
                                <summary>3. How do I participate in Staking?</summary>
                                <div style={{ textAlign: 'left' }}>
                                    <p></p>
                                    <ol>
                                        <li><strong>Acquire DMD Tokens:</strong><br />
                                            You can buy DMD tokens from supported cryptocurrency exchanges.
                                        </li>
                                        <br />
                                        <li><strong>Choose a Staking Method:</strong><br />
                                            You can choose from multiple staking options:
                                            <ul style={{ listStyleType: 'disc' }}>
                                                <li><strong>Stake as a Validator:</strong> This requires running a full node and actively participating in network operations. It’s more technical and requires at least 10,000 DMD. As a node operator, you also earn 20% of the validator rewards in addition to rewards proportional to your coin holdings.</li>
                                                <li><strong>Delegate to a Validator:</strong> If running a full node is not feasible, you can delegate your DMD to an existing validator. This is easier and still earns you rewards proportional to your coin holdings.</li>
                                            </ul>
                                        </li>
                                        <br />
                                        <li><strong>Start Staking:</strong><br />
                                            <ul style={{ listStyleType: 'disc' }}>
                                                <li><strong>Access the Staking Interface:</strong> You can connect to our user-friendly interface with your wallet.</li>
                                                <li><strong>Choose a Validator (if delegating):</strong> Research and choose a reliable validator to delegate your DMD. Look for validators with a good track record and solid reputation.</li>
                                                <li><strong>Set the Amount:</strong> Decide how much DMD you want to stake or delegate.</li>
                                                <li><strong>Confirm and Stake:</strong> Once you’ve chosen your validator and set the amount, confirm the transaction to start staking.</li>
                                            </ul>
                                        </li>
                                    </ol>
                                </div>
                            </details>

                            <details>
                                <summary>4. I have some DMD. Which validator should I delegate it to?</summary>
                                <p>
                                    Choosing a validator for delegating your DMD is an important decision that can affect your staking rewards and the security of your coins. Here are some steps and considerations to help you choose the right validator:
                                </p>
                                <ul style={{ listStyleType: 'disc' }}>
                                    <li><strong>Reputation and Reliability:</strong> Look for validators with a good reputation in the community. Validators with a history of uptime are generally more reliable.</li>
                                    <li><strong>Community Involvement:</strong> Validators that are actively involved in the community and governance might be more aligned with the network’s long-term success.</li>
                                    <li><strong>Diversify Your Delegation:</strong> To mitigate risk, you might consider splitting your DMD across multiple validators. This way, if one validator underperforms, your other staked tokens are still earning rewards.</li>
                                </ul>
                            </details>


                            <details>
                                <summary>5. Is there a minimum amount of DMD required to stake? </summary>
                                <p>
                                    The minimum required amount for staking is 100 DMD, when you want to stake on top of the validator candidate. If you want to create a pool as validator candidate yourself, 10000 DMD is required to be locked in staking mode.
                                </p>
                            </details>

                            <details>
                                <summary>6. What about rewards from staking?</summary>
                                <p>The rewards per epoch cycle (12 hours) are always 1/6000 of all coins in delta pot and reinsert pot combined. Upfront, the DAO Governance share is taken (10%). The rest of the epoch rewards are split between all validators of the actual active set, and then once again between the participants (coin owners) on each validator. So if there are 25 validators in the active set, each validator gets 1/25 of this epoch rewards. Before this validator reward is split between coin owners on that validator proportional, a 20% share of rewards is removed and accounted to the node operator (validator owner) for the effort to set up and maintain the validator node. </p>
                                <p>More calculation examples <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/D.-The-DMD-Diamond-Blockchain's-Solutions#d62-validators">here</a></p>
                            </details>

                            <div className="div-block-3">
                                <a onClick={() => {startTransition(() => {navigate('faqs')})}} className="button w-button">See More</a>
                            </div>
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
