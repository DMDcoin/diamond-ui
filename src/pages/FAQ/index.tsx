import React, { useEffect } from "react";
import styles from "./styles.module.css";

interface FAQProps { }

const FAQ: React.FC<FAQProps> = () => {
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
        <section className="section">
            <div className={styles.sectionContainer + " sectionContainer"}>
                <h1>Frequently Asked Questions</h1>

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
                    <p>
                        <strong>Validator candidates require:</strong>
                        <ul style={{ listStyleType: 'disc' }}>
                            <li>Full node installation of the DMDv4 chain on a Linux server with the DMD version of Open Ethereum, which includes the DMDv4 extensions (HBBFT/POSDAO) and proper configuration.</li>
                            <li>Internet with a Static IP address and reliable 24/7 uptime.</li>
                            <li>Minimum collateral of 10,000 DMD (from validator candidate owner), with a maximum of 50,000 DMD staked on one validator candidate (combined from the owner and others who stake on top of the node).</li>
                            <li>Link to the address of the node that performs the work.</li>
                            <li>Validator candidate registration and collateral locking through the POSDAO dApp.</li>
                        </ul>
                    </p>
                    <p>
                        Explore more about validators <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/D.-The-DMD-Diamond-Blockchain's-Solutions#d62-validators">here</a>.
                    </p>
                </details>

                <details>
                    <summary>3. How do I participate in Staking?</summary>
                    <p>
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
                    </p>
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

                <details>
                    <summary>7. What is pool, and how can I create it?</summary>
                    <p>
                        POSDAO whitepaper refers to validators and all dPOS staker on top of him as a mining pool. DMD Diamond prefers the terminology validator candidate or just pool because no mining is conducted in the DMD network and the word mining is misleading. Any user who meets the conditions and wants to be a validator candidate needs to create a pool and stake his coins. To do it, you need to connect your wallet to Diamond UI, go to your personal profile and click the ‘Create a pool’ button. The button will be available if your balance contains at least 10000 DMD.
                    </p>
                </details>

                <details>
                    <summary>8. How can I delegate my coins?</summary>
                    <p>
                        To delegate tokens to your desired validator, follow these steps:
                    </p>
                    <ol style={{ listStyleType: 'decimal' }}>
                        <li>Click the ‘Stake’ button near the validator you wish to delegate on the Validator candidates list page. You can also delegate from the Validator candidate detailed page.</li>
                        <li>A form will appear, showing the validator and a field to enter the amount to lock in staking mode. Enter the amount of tokens you wish to lock.</li>
                        <li>Please note that the minimum required amount for delegation is 100 DMD.</li>
                        <li>A wallet popup will appear, asking for approval for the transaction. Click ‘Approve’ to finalize the lock in staking mode.</li>
                        <li>After the transaction is completed, a popup will indicate that the tokens were successfully locked. Click ‘Done’ to continue.</li>
                        <li>Your tokens are now delegated to the selected validator. You can see the delegated amount next to the validator in the validator list.</li>
                        <li>If you choose the active validator to stake on top, the coins locked will become active and earn rewards for you in the next Epoch only.</li>
                    </ol>
                </details>


                <details>
                    <summary>9. How can I unstake my DMD?</summary>
                    <p>
                        If you want to remove your coins from a validator, you can use the ‘Unstake’ button on the Validator list or detailed page. Once you click on it, a pop-up will show up asking you which amount you would like to unstake. The flow is applicable to the validator candidate stake as well, when you want to withdraw rewards, the only limitation is that the minimum required stake amount (10000 DMD) is not available to be touched, you can return coins back only be removing the node.                    </p>
                    <p>
                        ‘Unstake’ button triggers the calculation of DMD you are able to unstake at the moment and the amount, which can be ordered. You need to unstake available coins first to proceed with the order flow. Click on the ‘Unstake’ button and approve the transaction in your wallet.
                        If the validator is active or pending, the staker can only withdraw staked amount minus already ordered amount but no more than the amount staked during the current staking epoch.
                    </p>
                </details>

                <details>
                    <summary>10. What does ordering DMD mean?</summary>
                    <p>
                        To claim coins, please, click ‘Claim’ button near your stake amount in the validator candidates list. The button appears near your staked coins on the Epoch end and it means, that your previously ordered coins are ready to be unstaked.
                    </p>
                </details>

                <details>
                    <summary>11. What does claiming DMD mean?</summary>
                    <p>
                        To claim coins, please, click ‘Claim’ button near your stake amount in the validator candidates list. The button appears near your staked coins on the Epoch end and it means, that your previously ordered coins are ready to be unstaked.
                    </p>
                </details>

                <details>
                    <summary>12. Removing a pool, how can I do it?</summary>
                    <p>
                        It is possible to remove a pool, but the validator candidate must not be a part of active set. A new pool can never be setup with the same address that was used in a previous pool (by removing empty pools we can exclude them for all data collections and history). To perform the pool removal, click on the ‘Remove node’ button in the personal profile. You can’t remove or unstake the part of the pool (less than 10000 DMD minimum required), the full amount of coins must be removed at once.
                    </p>
                </details>

                <details>
                    <summary>13. Can I stake to any validator? </summary>
                    <p>
                        Yes, you can delegate to any validator except the ones which are invalid.
                    </p>
                </details>

                <details>
                    <summary>14. Can I move the stake to another validator?</summary>
                    <p>
                        The re-delegate feature will be available in the future releases. So now you can unstake all your coins and after that stake them on the other candidate.
                    </p>
                </details>

                <details>
                    <summary>15. Explain validator candidate statuses shown on the UI?</summary>
                    <p>
                        Diamond UI has 3 statuses of validator candidates:
                        <ul>
                            <li>Active candidate is part of the active set</li>
                            <li>Valid - is not part of the active set, but can be elected</li>
                            <li>Invalid - a candidate who is flagged unavailable on the blockchain or has not enough stake.</li>
                        </ul>
                    </p>
                </details>

                <details>
                    <summary>16. What advantages does it offer to delegates compared to managing a node independently?</summary>
                    <p>
                        The advantage for running an own node is that you earn 20% of validator rewards upfront before the rest of rewards are split proportional between coin owners on validator. The disadvantage is that you have to set up and maintain a complex linux node software and make sure it's 24/7 well reachable so you, as validator, get a good score and are more often part of an active set.  The advantage for delegates is that you can take part even with below validator minimum stake of 10000 DMD just with at least 100 DMD. Other advantage for delegate if u see the validator you did delegate isn't perfectly maintained, you can just switch to another validator.
                    </p>
                </details>

                <details>
                    <summary>17. Who can participate in DAO voting?</summary>
                    <p>
                        The DAO aspect of the project represents decentralized governance, where all the participants of the ecosystem can propose the changes to the platform, such as new features, partnerships, or tokenomics adjustments. After that, the validator candidates vote according to their percentage of total DAO weight. The percentage includes the amount staked on top of the own stake of the validator candidate. So that any DMD token holder participates in the voting process by staking on the validator candidate, who makes the choice for all the people who staked on him. This process ensures that decisions are made collectively by the community, rather than being controlled by a central authority.
                    </p>
                </details>

                <details>
                    <summary>18. How the DAO voting is performed?</summary>
                    <p>
                        There are 2 main voting phases in the DMD DAO: proposal phase and voting phase. Each phase lasts 14 days. Voting phase starts straight after the proposal phase is finished. During the proposal phase, DMD holders can create votings shared within the community. The proposals of the current proposal + voting phase stay in the Active proposals list till the dao phase finishes. During a voting phase, proposals creation is not available, but every validator candidate can vote on the proposals from the Active list, except from the dismissed ones. Once the voting phase is finished, a new proposal phase starts.
                    </p>
                    <p>Full guides on how to create and vote on the proposals can be found <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/Q.-How-to-create-and-vote-on-the-proposals-in-DMD-DAO">here.</a></p>
                </details>

                <details>
                    <summary>19. Which proposal types exist?</summary>
                    <p>There are 3 proposal types supported by the DMD DAO community:</p>
                    <ol style={{ listStyleType: 'decimal' }}>
                        <li>
                            <strong>Open Proposal:</strong>
                            <p>
                                The open proposal invites members of the decentralized autonomous organization to contribute their ideas and expertise towards a common goal. The proposal aims to foster collaboration and innovation within the DAO community by encouraging members to share their thoughts, suggestions, and feedback on various projects and initiatives. Open proposal can include one or several transactions that are executed in the event that the proposal is accepted. Open proposal requires 33% of total DAO weight participation and 33% of exceeding yes votes.
                            </p>
                        </li>
                        <li>
                            <strong>Ecosystem Parameters' Change Proposal:</strong>
                            <p>
                                The proposal type where members can propose, discuss, and vote on changes to the parameters that govern the DMD ecosystem. This proposal aims to enable members to suggest modifications to key parameters such as gas price, proposal fee, minimum block wait time, maximum block wait time (heartbeat), and other elements that impact the functioning of the DMD ecosystem. Ecosystem parameters’ change proposal requires 33% of total DAO weight participation and 33% of exceeding yes votes.
                            </p>
                        </li>
                        <li>
                            <strong>Contract Upgrade Proposal:</strong>
                            <p>
                                The proposal can engage in discussions about potential upgrades, share technical expertise, and propose changes to enhance the functionality, security, and efficiency of the smart contracts. By submitting proposals and participating in transparent voting processes, members can collectively decide on which upgrades should be implemented and ensure that the DMD's smart contracts remain up-to-date and aligned with the evolving needs of the community. Contract upgrade proposal can include one or several transactions which are executed in the event that the proposal is accepted. Contract upgrade proposal requires 50% of total DAO weight participation and 50% of exceeding yes votes.
                            </p>
                        </li>
                    </ol>
                </details>

                <details>
                    <summary>20. How the voting process is organized and how the results are calculated?</summary>
                    <p>
                        The voting starts as soon as the Voting phase starts straight after the Proposal phase. The voting process is available only for validator candidates. The other community members participate in the voting process indirectly by staking on top of a validator candidate, who makes the right decisions from their perspective.
                        There are 2 options available for voting: to vote for the decision or against it. It is possible to change the decision during the Voting phase.
                        The voting results are calculated based on 2 main indexes:
                        <ul>
                            <li>Exceeding Yes answers %</li>
                            <li>Participation %</li>
                        </ul>
                        Every validator candidate has his own Voting power (%). It depends on the weight of his stake inside the whole DAO DMD possession. It means that for every decision it is possible to calculate the % of total DAO weight, who answered ‘yes’ and the % of total DAO weight, who answered ‘no’. The difference between the % is the ‘Exceeding Yes answers’. For every proposal type, we have a minimum required Exceeding Yes answers value, which is mandatory to be reached so that the proposal is accepted:
                        <ul>
                            <li>Open proposal - 33%</li>
                            <li>Ecosystem parameters' change - 33%</li>
                            <li>Contract upgrade - 50%</li>
                        </ul>
                        In regard to participation %, it means that there is a mandatory % of participants for every proposal, which needs to be reached so that the proposal can be accepted. It is based on the Voting weight (%) of every particular validator candidate. The % depends on the proposal type as well:
                        <ul>
                            <li>Open proposal - 33%</li>
                            <li>Ecosystem parameters' change - 33%</li>
                            <li>Contract upgrade - 50%</li>
                        </ul>
                        If the two conditions are accomplished when the Voting phase is finished, the decision is considered accepted, after that it requires finalization.
                        If not - the decision is not accepted by the community, but it still needs to be finalized.
                        Example of calculations are <a href="https://github.com/DMDcoin/whitepaper/wiki/G.-Decentralized-Autonomous-Organization#g24-voting-process">here</a>
                    </p>
                </details>

                <details>
                    <summary>21. Can I change my decision regarding the proposal?</summary>
                    <p>
                        Every validator candidate can change the decision on the voting he has previously participated in. It can be possible if the discussion about the topic changes direction and the vote needs to be changed according to the new ideas or facts. The decision can only be changed to the opposite, not dismissed. Delegates should monitor their validator voting behavior and to switch to a validator that doesn't change his opinion at the last minute. We encourage validators to make decisions early and stick with them, in order to attract further delegates who search for predictable voting results. Validators are encouraged to vote early in order to display their opinion by voting for an option in a proposal. Delegates are encouraged to stake their funds on active validators that vote according to their preference.
                    </p>
                </details>

                <details>
                    <summary>22. What is proposal finalization?</summary>
                    <p>
                        Finalization needs to be done for each accepted or declined proposal. Once a voting phase is over and a new proposal phase starts, new proposals cannot be created before all old proposals from the previous phase are finalized. Finalization of the proposal doesn’t mean the execution of it. If a DMD holder, who proposed, hasn’t finalized his voting, every other ecosystem participant can finalize it (he needs to go to the Historic proposals list and find the proposal here).
                    </p>
                </details>

                <details>
                    <summary>23. What is proposal execution?</summary>
                    <p>
                        Every accepted proposal needs to be executed so that the decision taken is exercised. Execution can be made during the new DAO phase (following the phase, when the proposal was created and finalized), and it is possible to create new proposals and vote on them in parallel. So there is a timeframe of 28 days for the proposal execution (the period of the next proposal+voting phase). Once the period is over, the proposals can not be executed. Contract upgrades can be finalized as all other proposals, but the execution must be done by the person, who proposed it.
                    </p>
                </details>

                <details>
                    <summary>24. What is node operator share?</summary>
                    <p>
                        A configurable node operator share is a reward mechanism where a node owner delegates a share of their node owner rewards to a different node operator address. It’s designed for DMD Diamond coin holders who want to earn rewards by owning a node but don’t have the technical skills to operate it. A node owner gets an upfront 20% of each epoch reward because they own the node. From this, a percentage is shared with the node operator for their role. The node owner reward (20%) is configurable for each pool, allowing a portion of this share (0.01% - 20% (20% means 100% of the node owner reward)) to be forwarded.
                    </p>
                    <p>
                        A node operator address can be set up during the pool creation step or anytime after the pool creation in the personal profile on the Diamond UI. It is editable once per epoch. One target address can be active at a time; setting a new one disables the old one.
                    </p>
                </details>

                <details>
                    <summary>25. What is Connectivity Report (CR)?</summary>
                    
                    <p>The Connectivity Report provides a metric for each node in the Validators list, indicating its network performance and connection stability. Display Rules:</p>

                    <p>
                        <ul style={{ listStyleType: 'disc' }}>
                            <li>Displayed in black, indicating no reported issues.</li>
                            <li>Displayed in <span style={{ color: 'orange' }}>orange</span>, signalling reported connectivity issues.</li>
                            <li><strong>Faulty Validator:</strong> If a validator is flagged as faulty by a majority (two-thirds) of active validators, its value is displayed in bold <span style={{ color: 'red', fontWeight: 'bold' }}>red</span>.</li>
                        </ul>
                    </p>
                </details>
            </div>
        </section>
    );
};

export default FAQ;
