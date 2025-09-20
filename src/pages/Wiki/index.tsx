import React, { useEffect } from "react";
import styles from "./styles.module.css";

interface WikiProps {}

const Wiki: React.FC<WikiProps> = () => {
    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, []);

    return (
        <section className="section">
            <div className={styles.sectionContainer + " sectionContainer"}>
                <div className={styles.heroSection}>
                    <h1 className={styles.mainTitle}>DMD Diamond</h1>
                    <p className={styles.subtitle}>
                        <strong>DMD Diamond</strong> is a decentralized, community-driven layer-1 blockchain founded in 2013, designed to provide a secure, scalable, and eco-friendly platform for digital transactions, smart contracts, and decentralized applications (dApps). With a finite maximum supply of 4.38 million DMD coins, it emphasizes scarcity, sustainability, and true decentralization. The blockchain's latest iteration, <strong>DMD v4</strong>, introduced in 2021, incorporates innovative features such as the Honey Badger Byzantine Fault Tolerance (HBBFT) consensus mechanism, Delegated Proof-of-Stake (DPoS) validator election, and full Ethereum Virtual Machine (EVM) compatibility.
                    </p>
                </div>

                <div className={styles.contentWrapper}>
                    <div className={styles.keyFeatures}>
                        <div className={styles.featureCard}>
                            <h3>4.38M DMD</h3>
                            <p>Maximum Supply</p>
                        </div>
                        <div className={styles.featureCard}>
                            <h3>400+ TPS</h3>
                            <p>Transaction Throughput</p>
                        </div>
                        <div className={styles.featureCard}>
                            <h3>1-2 Seconds</h3>
                            <p>Transaction Speed</p>
                        </div>
                        <div className={styles.featureCard}>
                            <h3>Since 2013</h3>
                            <p>Blockchain Pioneer</p>
                        </div>
                    </div>

                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2>History</h2>
                            <p>
                                The project's central theme is digital scarcity, branding itself as a "digital diamond" to emphasize its role as a long-term store of value, secured by a hybrid consensus mechanism.DMD Diamond was launched in July 2013 as a hybrid Proof-of-Work (PoW) and Proof-of-Stake (PoS) cryptocurrency, predating major blockchain projects like Ethereum. After the original developer abandoned the project shortly after launch, a dedicated community of developers and enthusiasts took over, ensuring its survival and continuous evolution. Over the years, DMD Diamond has undergone multiple upgrades, culminating in the release of DMD v4, which focuses on decentralization, interoperability, and energy efficiency.
                            </p>
                        </section>

                        <section className={styles.section}>
                            <h2>Technology</h2>
                            
                            <div className={styles.subsection}>
                                <h3>Consensus Mechanism</h3>
                                <p>
                                    DMD Diamond v4 is the first blockchain to implement the <strong>Honey Badger Byzantine Fault Tolerance (HBBFT)</strong> consensus algorithm, combined with a <strong>Delegated Proof-of-Stake (DPoS)</strong> validator election system (POSDAO). HBBFT provides instant transaction finality, high security, and resistance to censorship, while DPoS ensures fair validator rotation and prevents power concentration through a maximum staking limit of 50,000 DMD. This combination enables high transaction throughput (over 400 transactions per second), low fees, and dynamic block times as fast as one second.
                                </p>
                            </div>

                            <div className={styles.subsection}>
                                <h3>Ethereum Compatibility</h3>
                                <p>
                                    DMD v4 is fully compatible with the <strong>Ethereum Virtual Machine (EVM)</strong>, allowing seamless migration of smart contracts and dApps from Ethereum. This interoperability supports developers in building decentralized applications for DeFi, GameFi, NFTs, and other use cases, leveraging DMD's low-cost and high-speed infrastructure.
                                </p>
                            </div>

                            <div className={styles.subsection}>
                                <h3>Sustainability</h3>
                                <p>
                                    The blockchain is designed for eco-friendliness, eliminating energy-intensive mining associated with Proof-of-Work systems. DMD v4 recycles abandoned coins back into circulation and implements a sustainable reward system for validators and stakers, ensuring long-term economic stability.
                                </p>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2>Features</h2>
                            <ul className={styles.usageList}>
                                <li><strong>Decentralized Governance</strong>: DMD Diamond operates a Decentralized Autonomous Organization (DAO) module, enabling community-driven decision-making through on-chain voting. This ensures transparency and eliminates centralized control.</li>
                                <li><strong>Scarcity</strong>: With a fixed supply of 4.38 million coins issued at the genesis block, DMD is significantly scarcer than Bitcoin, preventing dilution through mining or additional issuance.</li>
                                <li><strong>Anonymized Transactions</strong>: DMD employs <strong>mixTX</strong> technology for private transactions, enhancing user privacy.</li>
                                <li><strong>Fast and Low-Cost Transactions</strong>: Transactions are processed in 1–2 seconds with near-zero fees, making DMD suitable for global value transfers.</li>
                                <li><strong>Staking and Rewards</strong>: Validators and coin holders can stake up to 50,000 DMD to secure the network and earn rewards, with a system designed to prevent power concentration.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>DMD Coin</h2>
                            <p>
                                The native cryptocurrency, <strong>DMD</strong>, serves as the fuel for the DMD Diamond ecosystem. It is used for:
                            </p>
                            <ul className={styles.usageList}>
                                <li><strong>Medium of Exchange</strong>: Facilitating instant, cross-border transactions with minimal fees.</li>
                                <li><strong>Governance</strong>: Enabling coin holders to vote on protocol changes via the DAO.</li>
                                <li><strong>Staking</strong>: Allowing users to secure the network and earn rewards.</li>
                            </ul>
                            <p>
                                As of July 2025, DMD has a market capitalization of approximately $7.7–$9.5 million USD, with a circulating supply of 3.9 million coins. It is traded on centralized exchanges such as BitMart and P2PB2B.
                            </p>
                        </section>

                        <section className={styles.section}>
                            <h2>Mainnet and Beta Testing</h2>
                            <p>
                                The DMD v4 mainnet is slated for launch by the end of 2025, following an open beta phase that began on December 9, 2024\. The beta invites developers and enthusiasts to test features like instant block finality and EVM compatibility, with community feedback shaping the final release.
                            </p>
                        </section>

                        <section className={styles.section}>
                            <h2>Reception and Impact</h2>
                            <p>
                                DMD Diamond is recognized as one of the longest-running blockchain projects, praised for its commitment to decentralization, sustainability, and innovation. Its HBBFT consensus and EVM compatibility position it as a competitive alternative to Ethereum and other layer-1 blockchains. The project's focus on community governance and eco-friendly operations has garnered attention in the blockchain space, with ongoing developments aimed at multi-chain interoperability.
                            </p>
                        </section>

                        <section className={styles.section}>
                            <h2>References</h2>
                            <ul className={styles.usageList}>
                                <li>Official Website: <a href="https://bit.diamonds/" target="_blank" rel="noopener noreferrer">bit.diamonds</a></li>
                                <li>Whitepaper: <a href="https://diamonddmd.com/" target="_blank" rel="noopener noreferrer">DMD Diamond Whitepaper</a></li>
                                <li>GitHub: <a href="https://github.com/DMDcoin/Diamond" target="_blank" rel="noopener noreferrer">DMDcoin/Diamond</a></li>
                                <li>CoinMarketCap: <a href="https://coinmarketcap.com/currencies/diamond/" target="_blank" rel="noopener noreferrer">Diamond (DMD)</a></li>
                                <li>Newsfile Corp: <a href="https://www.newsfilecorp.com/release/256941" target="_blank" rel="noopener noreferrer">DMD Diamond Grant Program</a></li>
                                <li>The Coin Republic: <a href="https://www.thecoinrepublic.com/2024/10/24/everything-to-know-about-the-dmd-diamond-project/" target="_blank" rel="noopener noreferrer">Everything To Know About The DMD Diamond Project</a></li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Wiki;
