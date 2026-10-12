'use client';

import "./page.css";
import Link from "next/link";
import { useEffect, useRef } from "react";
import Image from "next/image";
import FAQ from '../components/FAQ';
import DmdNameSearchWidget from '@/components/DMDNames/DmdNameSearchWidget';
import { useTheme } from '../hooks';
import { getThemeImagePath } from '../utils/imageUtils';
import { useWalletConnect } from "@/contexts/WalletConnect";
import { useWeb3Context } from "@/contexts/Web3";
import { useDaoContext, useStakingContext } from "@/contexts";
import BigNumber from "bignumber.js";
import { timestampToDateTime } from "@/utils/common";
import { formatCount, formatDecimal, formatDmd } from "@/utils/format";
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });


export default function Home() {
  const theme = useTheme();
  const { userWallet } = useWeb3Context();
  const { claimingContractBalance } = useDaoContext();
  const { open: openWalletModal, isConnected } = useWalletConnect();

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

  const getImagePath = (filename: string) => {
    return getThemeImagePath(filename, theme);
  };

  const handleWalletConnect = () => {
    if (!isConnected || !userWallet.myAddr) {
      // If not connected, open wallet modal
      openWalletModal();
    }
  };

  const showHeroSearch = isConnected && !!userWallet.myAddr;

  const heroRef = useRef<HTMLElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const heroContent = heroContentRef.current;
    if (!hero || !heroContent) return;

    const setContentHeight = () => {
      hero.style.setProperty('--hero-content-height', `${heroContent.offsetHeight}px`);
    };

    setContentHeight();
    const observer = new ResizeObserver(setContentHeight);
    observer.observe(heroContent);
    return () => observer.disconnect();
  }, [showHeroSearch]);

  return (
    <div className="home-page">
        {/* Unauthenticated View */}
        <div id="unauthenticated-view">
          {/* Hero Section */}
          <section ref={heroRef} className={`hero${showHeroSearch ? ' hero--with-search' : ''}`}>
            <div className="cosmic-grid"></div>
            <div className="cosmic-elements">
              <div className="glow glow-1"></div>
              <div className="glow glow-2"></div>
            </div>
            <div className="container">
              <div className="hero-top">
                <div ref={heroContentRef} className="hero-content">
                  <h1>Become DMD Chain Participant</h1>
                  <p>
                    Welcome to the DMD Diamond Staking Platform – your gateway to earning rewards while contributing to the security and functionality of the DMD network. Embark on your staking adventure with us and unlock the full potential of your digital assets.
                  </p>
                  <div className="hero-buttons">
                    {
                      isConnected && userWallet.myAddr ?
                        <Link href="/validators" className="btn-primary" id="stake-now-btn">Stake Now <i className="fas fa-arrow-right"></i></Link>
                      :
                        <a href="#" onClick={handleWalletConnect} className="btn-primary" id="connect-wallet-btn">Connect wallet <i className="fas fa-arrow-right"></i></a>
                    }
                    <a href="https://github.com/DMDcoin/whitepaper/wiki/A.-Home" target="_blank" className="btn-secondary">GitHub Whitepaper <i className="fas fa-arrow-right"></i></a>
                    <Link href="/names" className="btn-secondary hero-names-link">All DMD Names <i className="fas fa-external-link-alt"></i></Link>
                  </div>
                </div>
              </div>
              <div className="hero-visual">
                <div className="diamond-custom diamond-custom-1"></div>
                <div className="diamond-custom diamond-custom-2"></div>
                <div className="diamond-custom diamond-custom-3"></div>
                <div className="glow-custom glow-custom-1"></div>
                <div className="glow-custom glow-custom-2"></div>
              </div>
              {showHeroSearch && (
                <div className="hero-search-section">
                  <DmdNameSearchWidget />
                </div>
              )}
            </div>
            <div className="partners-bar">
              <div className="slider">
                <div className="slide-track">
                  <div className="slide">
                    <a href="https://www.bitmart.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_bitmart.png" height="100" width="250" alt="BitMart" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://blockserv.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_blockserv.png" height="100" width="250" alt="BlockServ" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://biconomy.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_biconomy.svg" height="100" width="250" alt="Biconomy" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://mexc.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_mexc.svg" height="100" width="250" alt="Mexc" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://perfectnet.at" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_perfectnet.svg" height="100" width="250" alt="PerfectNet" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://herotech.io" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_herotech.png" height="100" width="250" alt="HeroTech" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://www.bitmart.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_bitmart.png" height="100" width="250" alt="BitMart" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://blockserv.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_blockserv.png" height="100" width="250" alt="BlockServ" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://biconomy.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_biconomy.svg" height="100" width="250" alt="Biconomy" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://mexc.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_mexc.svg" height="100" width="250" alt="Mexc" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://perfectnet.at" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_perfectnet.svg" height="100" width="250" alt="PerfectNet" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://herotech.io" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_herotech.png" height="100" width="250" alt="HeroTech" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://www.bitmart.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_bitmart.png" height="100" width="250" alt="BitMart" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://blockserv.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_blockserv.png" height="100" width="250" alt="BlockServ" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://biconomy.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_biconomy.svg" height="100" width="250" alt="Biconomy" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://mexc.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_mexc.svg" height="100" width="250" alt="Mexc" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://perfectnet.at" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_perfectnet.svg" height="100" width="250" alt="PerfectNet" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://herotech.io" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_herotech.png" height="100" width="250" alt="HeroTech" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://www.bitmart.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_bitmart.png" height="100" width="250" alt="BitMart" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://blockserv.at" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_blockserv.png" height="100" width="250" alt="BlockServ" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://biconomy.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_biconomy.svg" height="100" width="250" alt="Biconomy" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://mexc.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_mexc.svg" height="100" width="250" alt="Mexc" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://perfectnet.at" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_perfectnet.svg" height="100" width="250" alt="PerfectNet" />
                    </a>
                  </div>
                  {/* <div className="slide">
                    <a href="https://herotech.io" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_herotech.png" height="100" width="250" alt="HeroTech" />
                    </a>
                  </div> */}
                  <div className="slide">
                    <a href="https://www.bitmart.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_bitmart.png" height="100" width="250" alt="BitMart" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://blockserv.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_blockserv.png" height="100" width="250" alt="BlockServ" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://biconomy.com" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_biconomy.svg" height="100" width="250" alt="Biconomy" />
                    </a>
                  </div>
                  <div className="slide">
                    <a href="https://perfectnet.at" target="_blank" rel="noopener noreferrer">
                      <Image src="/images/partners/logo_perfectnet.svg" height="100" width="250" alt="PerfectNet" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Create Pool Modal */}
        <div className="modal" id="create-pool-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create a Validator Pool</h3>
              <span className="close-modal">&times;</span>
            </div>
            <div className="modal-body">
              <form id="create-pool-form">
                <div className="form-group">
                  <label htmlFor="initial-stake">Initial Stake (DMD)</label>
                  <input type="number" id="initial-stake" placeholder="Minimum 10000 DMD"/>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Create Pool</button>
                  <button type="button" className="btn-secondary cancel-modal">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Update Rewards Modal */}
        <div className="modal" id="update-rewards-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Update Shared Rewards</h3>
              <span className="close-modal">&times;</span>
            </div>
            <div className="modal-body">
              <form id="update-rewards-form">
                <div className="form-group">
                  <label htmlFor="new-reward-share">New Reward Share (%)</label>
                  <input type="number" id="new-reward-share" placeholder="Enter percentage (0-100)"/>
                  <p className="form-help">This is the percentage of rewards that will be shared with your delegates.</p>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Update</button>
                  <button type="button" className="btn-secondary cancel-modal">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="features">
          <div className="container">
            <div className="section-header">
              <h2 className="fade-in">Blockchain that scales</h2>
              <p>DMD Diamond is a fair-launched, truly decentralized Layer 1 blockchain, built by a dedicated community — without a company, premine, or ICO. Established in 2013, it has continuously evolved to prioritize security, efficiency, and decentralization.</p>
              <a href="https://overview.bit.diamonds" target="_blank" rel="noopener noreferrer" className="btn-primary">Learn more about DMD <i className="fas fa-external-link-alt"></i></a>
            </div>

            <div className="features-grid">
              <div className="feature-card fade-in">
                <div className="feature-icon">
                  <Image src={getImagePath("decentralized.png")} alt="Decentralized" width={70} height={70} />
                </div>
                <h3>Decentralized</h3>
                <Image className="ellipse-left" src={getImagePath("ellipse-left.png")} alt="ellipse-left" width={0} height={0} />
                <Image className="ellipse-right" src={getImagePath("ellipse-right.png")} alt="ellipse-right" width={0} height={0} />
              </div>
              <div className="feature-card fade-in">
                <div className="feature-icon">
                  <Image src={getImagePath("secure.png")} alt="Secure" width={70} height={70} />
                </div>
                <h3>Secure</h3>
                <Image className="ellipse-left" src={getImagePath("ellipse-left.png")} alt="ellipse-left" width={0} height={0} />
                <Image className="ellipse-right" src={getImagePath("ellipse-right.png")} alt="ellipse-right" width={0} height={0} />
              </div>
              <div className="feature-card fade-in">
                <div className="feature-icon">
                  <Image src={getImagePath("scalable.png")} alt="Scalable" width={70} height={70} />
                </div>
                <h3>Scalable</h3>
                <Image className="ellipse-left" src={getImagePath("ellipse-left.png")} alt="ellipse-left" width={0} height={0} />
                <Image className="ellipse-right" src={getImagePath("ellipse-right.png")} alt="ellipse-right" width={0} height={0} />
              </div>
            </div>
          </div>
        </section>

        {/* Design Section */}
        <section className="design-section">
          <div className="container">
            <div className="design-grid">
              <div className="design-content">
                <h2>The Next Evolution of DMD Diamond</h2>
                <p>DMD Diamond is relaunching as a fully EVM-compatible Layer 1, designed to empower developers and projects with cutting-edge blockchain technology.</p>
                <a href="https://overview.bit.diamonds" target="_blank" rel="noopener noreferrer" className="btn-primary">Explore the ecosystem <i className="fas fa-external-link-alt"></i></a>
              </div>
              <div className="design-features">
                <div className="design-feature">
                  <div className="feature-icon">
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div className="feature-text">
                    <h4>Fast & Low-Cost Transactions</h4>
                    <p>Optimized for speed and efficiency</p>
                  </div>
                </div>
                <div className="design-feature">
                  <div className="feature-icon">
                    <i className="fas fa-lock"></i>
                  </div>
                  <div className="feature-text">
                    <h4>Enhanced Security</h4>
                    <p>Censorship-resistant by design</p>
                  </div>
                </div>
                <div className="design-feature">
                  <div className="feature-icon">
                    <i className="fas fa-code-branch"></i>
                  </div>
                  <div className="feature-text">
                    <h4>EVM Compatibility</h4>
                    <p>Deploy Ethereum smart contracts seamlessly</p>
                  </div>
                </div>
                <div className="design-feature">
                  <div className="feature-icon">
                    <i className="fas fa-server"></i>
                  </div>
                  <div className="feature-text">
                    <h4>DAO-Governed Network</h4>
                    <p>Fully decentralized and community-driven</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Smart Contracts Section */}
        <section className="design-section">
          <div className="container smart-contracts-container">
            <div className="design-grid">
              <div className="design-content">
                <h2 className="fade-in">Smart contracts<br/>done smarter</h2>
                <p>The Diamond platform offers a secure, energy-efficient environment for smart contract execution—leveraging DMD's high-performance blockchain architecture.</p>
                <Link href="/validators" className="btn-primary">Start Staking <i className="fas fa-arrow-right"></i></Link>
              </div>
              <div className="smart-contracts-images">
                <Image className="smart-contracts-image" src={getImagePath("3d-logo.png")} alt="" width={500} height={500} />
              </div>
            </div>
            <Image className="ellipse-bottom-left" src={getImagePath("ellipse-bottom-center-left.png")} alt="" width={0} height={0} />
          </div>
        </section>

        {/* Network Statistics Section */}
        <section className="statistics">
          <div className="container">
            <div className="statistics-header">
              <h2 className="fade-in">DMD: your protocol's<br/>connection to the<br/>global digital economy</h2>
              <div className="big-stat">
                <span className="big-stat-value">4M+</span>
                <span className="big-stat-label">Total DMD Emission</span>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-card fade-in">
                <h3>Current Epoch</h3>
                <p className="stat-value">{formatCount(stakingEpoch)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Key Gen. Round</h3>
                <p className="stat-value">{formatCount(keyGenRound)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Epoch Start Time</h3>
                <p className="stat-value">{timestampToDateTime(epochStartTime)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Epoch Start Block</h3>
                <p className="stat-value">{formatCount(epochStartBlock)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Active Validators</h3>
                <p className="stat-value">{formatCount(activeValidators)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Valid Candidates</h3>
                <p className="stat-value">{formatCount(validCandidates)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Min. Gas Fee</h3>
                <p className="stat-value">{formatDecimal(minimumGasFee.dividedBy(10**9))} Gwei</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Reinsert Pot</h3>
                <p className="stat-value">{formatDmd(reinsertPot)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Delta Pot</h3>
                <p className="stat-value">{formatDmd(deltaPot)}</p>
              </div>
              <div className="stat-card fade-in">
                <h3>Claiming Pot</h3>
                <p className="stat-value">{formatDmd(claimingContractBalance)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="testimonial">
          <div className="container">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"As a true blockchain purist, DMD Diamond's core values ​include complete decentralization. DMD Diamond is a community-driven project with no corporations behind us."</p>
                <div className="testimonial-author">
                  <div className="author-logo">Origin</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wallet Compatibility Bar */}
        <section className="compatibility">
          <div className="slider">
            <div className="slide-track">
              <div className="slide">
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_metamask_dark.svg' : 'logo_metamask_light.svg')} height={100} width={250} alt="MetaMask" />
                </a>
              </div>
                <div className="slide">
                <a href="https://brave.com/wallet/" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_brave_dark.png' : 'logo_brave_light.png')} height={100} width={250} alt="Brave" />
                </a>
                </div>
              <div className="slide">
                <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/wallets/logo_coinbase.svg" height={100} width={250} alt="Coinbase Wallet" />
                </a>
              </div>
              <div className="slide">
                <a href="https://walletconnect.com" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/wallets/logo_walletconnect.svg" height={100} width={250} alt="WalletConnect" />
                </a>
              </div>
              <div className="slide">
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_metamask_dark.svg' : 'logo_metamask_light.svg')} height={100} width={250} alt="MetaMask" />
                </a>
              </div>
              <div className="slide">
                <a href="https://brave.com/wallet/" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_brave_dark.png' : 'logo_brave_light.png')} height={100} width={250} alt="Brave" />
                </a>
              </div>
              <div className="slide">
                <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/wallets/logo_coinbase.svg" height={100} width={250} alt="Coinbase Wallet" />
                </a>
              </div>
              <div className="slide">
                <a href="https://walletconnect.com" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/wallets/logo_walletconnect.svg" height={100} width={250} alt="WalletConnect" />
                </a>
              </div>
              <div className="slide">
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_metamask_dark.svg' : 'logo_metamask_light.svg')} height={100} width={250} alt="MetaMask" />
                </a>
              </div>
              <div className="slide">
                <a href="https://brave.com/wallet/" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_brave_dark.png' : 'logo_brave_light.png')} height={100} width={250} alt="Brave" />
                </a>
              </div>
              <div className="slide">
                <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/wallets/logo_coinbase.svg" height={100} width={250} alt="Coinbase Wallet" />
                </a>
              </div>
              <div className="slide">
                <a href="https://walletconnect.com" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/wallets/logo_walletconnect.svg" height={100} width={250} alt="WalletConnect" />
                </a>
              </div>
              <div className="slide">
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_metamask_dark.svg' : 'logo_metamask_light.svg')} height={100} width={250} alt="MetaMask" />
                </a>
              </div>
              <div className="slide">
                <a href="https://brave.com/wallet/" target="_blank" rel="noopener noreferrer">
                  <Image src={"/images/wallets/" + (theme === 'light' ? 'logo_brave_dark.png' : 'logo_brave_light.png')} height={100} width={250} alt="Brave" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="community">
          <div className="container">
            <h2 className="fade-in">A fast-growing, global <br/> community</h2>
            <p>Whether you're a developer, creator, or supporter, there's a place for you in the Diamond ecosystem. Build dApps on our fast, secure, and energy-efficient chain. Help shape the future of the blockchain with the help of decentralized governance. Or simply stake and participate in consensus—every role matters.
              Join the community. Build with purpose. Own your impact.</p>

            <div className="community-stats">
              <div className="community-stat">
                <Image src={getImagePath("community-size.png")} alt="" width={70} height={70} />
                <h3>Community Size</h3>
                <p>1,700+ members</p>
                <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
              </div>
              <div className="community-stat">
                <Image src={getImagePath("core-team.png")} alt="" width={70} height={70} />
                <h3>Core team</h3>
                <p>10+ active developers</p>
                <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
              </div>
              <div className="community-stat">
                <Image src={getImagePath("projects.png")} alt="" width={70} height={70} />
                <h3>Projects Built</h3>
                <p>5+ on top of DMD chain</p>
                <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
              </div>
              <div className="community-stat">
                <Image src={getImagePath("reach.png")} alt="" width={70} height={70} />
                <h3>Global Reach</h3>
                <p>50+ countries</p>
                <Image className="ellipse-bottom" src={getImagePath("ellipse-bottom.png")} alt="" width={0} height={0} />
              </div>
            </div>
          </div>
        </section>

        {/* News Section */}
        <section className="news">
          <div className="container">
            <h2 className="fade-in">News & Updates</h2>
            <div className="news-card">
              <div className="news-content">
                <h3>Connect to DMD</h3>
                <p>Are you a third-party company seeking a sustainable blockchain solution with industry-leading features for hosting your project? Look no further!</p>
                <a target="_blank" href="https://discord.com/channels/1267133854154756178/1431651278689402932" className="btn-small">Learn more</a>
              </div>
              <div className="news-image">
                <div className="news-image-inner">
                  <Image
                    src={getImagePath(theme === 'light' ? 'welcome-banner-light.svg' : 'welcome-banner-dark.svg')}
                    alt="Welcome to DMD"
                    fill
                    className="news-banner"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 40vw"
                    priority={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Become Participant Section */}
        <section className="participate">
          <div className="container">
            <h2 className="fade-in">Start Staking</h2>
            <div className="participate-grid">
              <div className="participate-card fade-in">
                <div className="participate-icon">
                  <Image src={getImagePath("staking.png")} alt="" width={70} height={70} />
                </div>
                <h3>Seamless Staking Experience</h3>
                <p>Begin your journey by connecting your cryptocurrency wallet and explore the variety of staking options available. Our intuitive UI ensures a smooth and straightforward staking process.</p>
                <Image className="ellipse-bottom-left" src={getImagePath("ellipse-bottom-left.png")} alt="" width={0} height={0} />
              </div>
              <div className="participate-card fade-in">
                <div className="participate-icon">
                  <Image src={getImagePath("analytics.png")} alt="" width={70} height={70} />
                </div>
                <h3>Real-Time Analytics</h3>
                <p>Stay informed with transparent data on staking pools, performance, and rewards. Our platform provides you with the insights needed to make the best staking decisions.</p>
                <Image className="ellipse-bottom-left" src={getImagePath("ellipse-bottom-left.png")} alt="" width={0} height={0} />
              </div>
              <div className="participate-card fade-in">
                <div className="participate-icon">
                  <Image src={getImagePath("rewards.png")} alt="" width={70} height={70} />
                </div>
                <h3>Earn Rewards</h3>
                <p>By staking your DMD coins, you actively participate in transaction validation, securing the blockchain, and in return, receive additional DMD as rewards.</p>
                <Image className="ellipse-bottom-left" src={getImagePath("ellipse-bottom-left.png")} alt="" width={0} height={0} />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq">
          <div className="container">
            <h2 className="fade-in">Frequently Asked Questions</h2>
            <FAQ count={6} />
            <div className="faq-actions">
              <Link href="/faqs" className="btn-primary">See all FAQs <i className="fas fa-arrow-right"></i></Link>
            </div>
          </div>
        </section>
    </div>
  );
}
