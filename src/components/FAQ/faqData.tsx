export interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

export const faqData: FAQItem[] = [
  {
    question: "What Is Staking?",
    answer: "Staking in the DMD ecosystem is a way for holders to grow their holdings while contributing to the security and governance of the network. You can either become a validator (actively participate in the network's operations) or delegate your DMD to a validator and by doing so increase their chance to become selected as an active validator. Validators perform tasks like creating new blocks and validating transactions, while delegators support a validator by staking their DMD with them and sharing in the rewards."
  },
  {
    question: "Who Is A Validator?",
    answer: (
      <div>
        <p>Blockchain validators (or validator candidates) are responsible for verifying transactions and adding them to the blockchain. Users can delegate their coins (stake) to a validator to support their participation in the network.</p>
        <p className="pt0">Validators earn rewards for their work during each epoch:</p>
        <ul className="pl40 pr20">
          <li>20% of the pool's epoch rewards is allocated to the validator owner (the pool owner). A node operator is the person or service responsible for running and maintaining the node infrastructure. The owner may run the node themselves or share part of their owner reward with a separate node operator.</li>
          <li>The remaining 80% of the pool's rewards is distributed proportionally among all stakers in that pool, including the validator owner. The owner therefore receives the 20% owner share, less any portion assigned to a separate node operator, plus rewards proportional to their own stake from the remaining 80%.</li>
        </ul>
        <div className="heading">Validator candidates require:</div>
        <ul className="pl40 pr20">
          <li>Full node installation of the DMDv4 chain on a Linux server with the DMD version of Open Ethereum which include the DMDv4 extensions including HBBFT/POSDAO and the proper configuration</li>
          <li>Internet with Static IP address and a reliable 24/7 uptime.</li>
          <li>Minimum collateral of 10,000 DMD from the validator owner. New stakes from the owner and delegators can be added only within the pool's 50,000 DMD staking limit. The pool balance can exceed 50,000 DMD only through accumulated rewards; new stakes cannot cause or increase an excess above this limit.</li>
          <li>Link to address of the node that delivers the work.</li>
          <li>The validator candidate registration and collateral locking through the POSDAO dApp.</li>
        </ul>
        <p>Explore more about validators <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/D.-The-DMD-Diamond-Blockchain's-Solutions#d62-validators" rel="noopener noreferrer">here</a></p>
      </div>
    )
  },
  {
    question: "How do I participate in Staking?",
    answer: (
      <ol>
        <li><strong>Acquire DMD</strong><br />
          You can buy DMD from supported cryptocurrency exchanges.
        </li>
        <br />
        <li><strong>Choose a Staking Method</strong><br />
          You can choose from multiple staking options:
          <ul className="pl20 pr20">
            <li><strong>Stake as a Validator Owner:</strong> Creating a validator pool requires at least 10,000 DMD of your own stake and a running validator node. You can maintain the infrastructure yourself or use a separate node operator. The pool owner receives a 20% owner share of the pool's rewards and may assign part of it to the node operator. The owner also receives rewards proportional to their own stake from the remaining 80%.</li>
            <li><strong>Delegate to a Validator:</strong> If running a full node is not feasible, you can delegate your DMD to an existing validator. This is easier and still earns you rewards proportional to your coin holdings.</li>
          </ul>
        </li>
        <br />
        <li><strong>Start Staking</strong><br />
          <ul className="pl20 pr20">
            <li><strong>Access the Staking Interface:</strong> You can connect to our user-friendly interface with your wallet.</li>
            <li><strong>Choose a Validator (if delegating):</strong> If you're delegating, research and choose a reliable validator to delegate your DMD. Look for validators with a good track record and a solid reputation.</li>
            <li><strong>Set the Amount:</strong> Decide how much DMD you want to stake or delegate.</li>
            <li><strong>Confirm and Stake:</strong> Once you've chosen your validator and set the amount, confirm the transaction to start staking.</li>
          </ul>
        </li>
        <br />
        <li><strong>Monitor Your Stake</strong><br />
          <ul className="pl20 pr20">
            <li><strong>Track Rewards:</strong> After staking, you can monitor your rewards through your stake increase at the epoch end.</li>
            <li><strong>Auto-restake:</strong> Every epoch end all claimable rewards are accredited to the staked balance of the validator and their delegators. It means that there is no additional entity for reward storage, but your rewards are added to the stake and can be further unstaked if needed.</li>
            <li><strong>Unstake if Necessary:</strong> Click 'Unstake' to see which amounts can be withdrawn immediately, claimed from a previous order, or ordered for withdrawal after the current epoch. Available actions depend on the current on-chain state.</li>
          </ul>
        </li>
        <br />
        <li><strong>Withdraw or Order Your Staked DMD</strong><br />
          <ul className="pl20 pr20">
            <li><strong>Withdraw or order coins:</strong> Use the 'Unstake' dialog to review the available actions and amounts. DMD that cannot be withdrawn immediately can be ordered for later withdrawal. Once an order becomes claimable after the epoch ends, open 'Unstake' again to claim it. Confirm each required transaction in your wallet.</li>
          </ul>
        </li>
      </ol>
    )
  },
  {
    question: "I have some DMD. Which validator should I delegate it to?",
    answer: (
      <div>
        <p>Choosing a validator for delegating your DMD is an important decision that can affect your staking rewards and the security of your coins. Here are some steps and considerations to help you choose the right validator:</p>
        <ul className="ml40 pr20 pb20">
          <li><strong>Reputation and Reliability:</strong> Look for validators with a good reputation in the community. Validators with a history of uptime are generally more reliable.</li>
          <li><strong>Community Involvement:</strong> Validators that are actively involved in the community and governance might be more aligned with the network's long-term success.</li>
          <li><strong>Diversify Your Delegation:</strong> To mitigate risk, you might consider splitting your DMD across multiple validators. This way, if one validator underperforms, your other staked DMD are still earning rewards.</li>
        </ul>
      </div>
    )
  },
  {
    question: "Is there a minimum amount of DMD required to stake?",
    answer: "The minimum initial delegation to a validator is currently 100 DMD. This is a configurable parameter that can be changed through DAO governance. Once you have an existing delegation to that validator, subsequent top-ups can be smaller than the minimum initial delegation. To create your own validator pool, you must stake at least 10,000 DMD of your own funds."
  },
  {
    question: "What about rewards from staking?",
    answer: (
      <div>
        <p>Each epoch cycle (12 hours) distributes rewards equal to 1/6000 of all coins in the Delta Pot and Reinsert Pot combined.</p>
        <ul className="pl40 pr20">
          <li><strong>Step 1:</strong> A share of the total epoch rewards is first allocated to the DAO Governance Pot. This share is currently 10% and can be changed through DAO governance.</li>
          <li><strong>Step 2:</strong> The remaining rewards are split equally among the validators in the active set for that epoch. For example, if there are 25 active validators, each validator receives 1/25 of the remaining epoch rewards. Standby validators do not receive rewards for that epoch because they did not participate in its active validator set.</li>
          <li><strong>Step 3:</strong> From each pool's share of the epoch rewards, 20% is allocated to the validator owner (the pool owner). The owner may assign part of this owner share to a separate node operator who runs and maintains the infrastructure.</li>
          <li><strong>Step 4:</strong> The remaining 80% is distributed proportionally among all coin holders staked in that pool, including the validator owner. The owner receives their proportional staking rewards in addition to the owner share remaining after any allocation to a separate node operator.</li>
        </ul>
        <p>If an epoch is shorter than 12 hours, rewards are reduced proportionally. Longer Epochs do not increase rewards.</p>
        <p className="pt0">More calculation examples <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/D.-The-DMD-Diamond-Blockchain's-Solutions#d625-validator-reward" rel="noopener noreferrer">here</a></p>
      </div>
    )
  },
  {
    question: "What is a validator pool, and how can I create one?",
    answer: "POSDAO whitepaper refers to validators and all delegators staking with them as a mining pool. DMD Diamond prefers the terminology validator candidate or validator pool because no mining is conducted in the DMD network and the word mining is misleading. Any user who meets the conditions and wants to be a validator candidate needs to create a pool and stake their coins. To do it, you need to connect your wallet to Diamond UI, go to your personal profile and click the 'Create a pool' button. To create a validator pool, you need at least 10,000 DMD to stake, plus enough DMD to cover the transaction fee."
  },
  {
    question: "How can I delegate my DMD?",
    answer: (
      <div>
        <p>To delegate DMD to your desired validator, click the 'Stake' button near the validator you wish to delegate on the Validator candidates list page. You can also delegate from the Validator candidate detailed page.</p>
        <p className="pt0">A form will appear, showing the validator and a field to enter the amount to lock in staking mode. Enter the amount of DMD you wish to lock and click 'Stake'. Your initial delegation must meet the current minimum shown in the staking form. This minimum can be changed through DAO governance. Subsequent top-ups to an existing delegation can be smaller than the minimum initial delegation. A wallet popup will appear, asking for approval for the transaction. Confirm the transaction in your wallet to stake your DMD. After the transaction is completed, a popup will indicate that the DMD were successfully locked. Click 'Done' to continue.</p>
        <p className="pt0">Your DMD are now delegated to the selected validator. You can now see the delegated amount next to the validator in the validator list. If you choose the active validator to stake on top, the coins locked will become active and earn rewards for you in the next epoch only.</p>
      </div>
    )
  },
  {
    question: "How can I unstake my DMD?",
    answer: (
      <div>
        <p>If you want to remove your coins from a validator, you can use the 'Unstake' button on the Validator list or detailed page. The dialog shows the amounts available for immediate withdrawal, ready to claim from a previous order, or available to order for later withdrawal. Validator owners can also use this flow to withdraw available rewards and stake above the required minimum self-stake of 10,000 DMD. Withdrawing the required self-stake requires removing the validator pool.</p>
        <p className="pt0">Use the available actions in the 'Unstake' dialog to withdraw DMD immediately, claim a previous order, or place a new unstake order. You do not need to withdraw all immediately available coins and reopen the dialog just to access the order flow. Review the amounts and confirm each required transaction in your wallet.</p>
        <p className="pt0">If the validator is active or pending, some funds may require an unstake order before they can be claimed. The 'Unstake' dialog shows the exact amounts currently available for immediate withdrawal, claiming, or ordering.</p>
      </div>
    )
  },
  {
    question: "What does ordering DMD mean?",
    answer: "Order flow takes place if some of the coins are not available to be unstaked at the moment, as they are part of the stake of the active validator or pending validator, who is preparing to become active in the next epoch (usually the status lasts for 5 minutes maximum). Click 'Unstake' to see the amount available to order and enter the amount you want to withdraw later. You do not need to withdraw all immediately available coins first or reopen the dialog to access ordering. An order does not transfer DMD to your wallet immediately. Once the order becomes claimable after the epoch ends, use 'Unstake' to claim it and confirm the transaction in your wallet."
  },
  {
    question: "What does claiming DMD mean?",
    answer: "Claiming withdraws DMD from a previously placed unstake order once it becomes claimable. When 'ready to claim' appears next to your stake, click 'Unstake' next to the validator. The dialog shows the amount ready to claim and lets you withdraw it by confirming the transaction in your wallet."
  },
  {
    question: "Removing a pool, how can I do it?",
    answer: "It is possible to remove a validator pool, but only if the validator candidate is not part of the active validator set. To remove a pool, go to your personal profile and click the 'Remove pool' button. Pool removal is an irreversible action. When a pool is removed, the validator owner must withdraw their entire self-stake together with all rewards accumulated in that stake. Partial withdrawal of the owner's stake is not possible as part of pool removal. This requirement applies to the owner's funds, not to the combined stake of all delegators. Delegators whose funds remain in the removed pool can still withdraw them using 'Unstake' after the pool has been removed. After pool removal, neither the miner address nor the wallet address connected to Diamond UI can be reused to create a new validator pool in the future. This restriction allows removed pools to be excluded from future data collection while preserving accurate historical records."
  },
  {
    question: "Can I stake to any validator?",
    answer: "You can delegate to Active or Standby validators that have available staking capacity. Your delegation must meet the staking requirements shown in the form and must not cause the pool balance to exceed 50,000 DMD. You cannot add a new stake to Invalid validators or pools that have reached or exceeded this limit."
  },
  {
    question: "Can I move the stake to another validator?",
    answer: "Yes. If your current validator is not in the active set and your funds are available for immediate withdrawal, click 'Unstake' to withdraw the amount you want to move, then stake it with another validator. If your validator is in the active set and the amount is locked, place an unstake order. Once it becomes claimable after the epoch ends, open 'Unstake' again to claim it, then stake the withdrawn DMD with another validator. The 'Unstake' dialog shows the amounts currently available for each action. Your new delegation must meet the staking requirements of the destination pool."
  },
  {
    question: "Explain validator candidate statuses shown on the UI?",
    answer: (
      <div>
        <p>Diamond UI displays three validator statuses. 'Eligible Candidates' in network statistics includes both Active and Standby validators.</p>
        <ul className="pl40 pr20 pb20">
          <li><strong>Active</strong> — the validator is part of the active validator set for the current epoch.</li>
          <li><strong>Standby</strong> — the validator is eligible for selection but is not part of the current active set. Selection for a future epoch is not guaranteed.</li>
          <li><strong>Invalid</strong> — the validator currently does not meet the eligibility requirements, for example, because it is marked unavailable on-chain or has insufficient self-stake.</li>
        </ul>
      </div>
    )
  },
  {
    question: "Which is better: delegating DMD or running your own validator pool?",
    answer: "There is no single best option: both delegating DMD and running your own validator pool are ways to participate in staking. The right choice depends on your available funds, technical resources, and willingness to manage node infrastructure. Delegating is simpler: you choose a validator and receive rewards proportional to your stake without maintaining a node. The minimum initial delegation is currently 100 DMD and can be changed through DAO governance; subsequent top-ups can be smaller. Creating your own validator pool requires at least 10,000 DMD of self-stake and a running validator node, maintained either by you or by a separate node operator. The pool owner receives the 20% owner share of the pool's rewards, less any allocation to a separate node operator, plus proportional rewards from their own stake. Consider the infrastructure costs and responsibilities as well as the rewards when choosing. If you delegate, review the validator's performance and voting history. Moving your stake later may require an unstake order and a claim before you can stake with another validator."
  },
  {
    question: "Who can participate in DAO voting?",
    answer: "The DAO aspect of the project represents decentralized governance, where all the participants of the ecosystem can propose the changes to the platform, such as new features, partnerships, or tokenomics adjustments. After that, the validator candidates vote according to their percentage of total DAO voting weight. The percentage includes the amount staked on top of the own stake of the validator candidate. So that any DMD holder participates in the voting process by staking on the validator candidate, who makes the choice for all the people who staked on them. This process ensures that decisions are made collectively by the community, rather than being controlled by a central authority."
  },
  {
    question: "How does DAO voting work?",
    answer: (
      <div>
        <p>The DMD DAO operates in repeating cycles with two phases, each lasting 14 days: the proposal phase and the voting phase. During the proposal phase, DMD holders can create proposals for the community to review. The voting phase begins immediately afterwards. During this phase, new proposals cannot be created, and validators eligible to vote can cast or change their votes on proposals that have not been dismissed. Proposals remain in the Active Proposals list throughout the current cycle. Once the voting phase ends, a new proposal phase begins.</p>
        <p className="pt0">Full guides on how to create and vote on the proposals can be found <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/Q.-How-to-create-and-vote-on-the-proposals-in-DMD-DAO" rel="noopener noreferrer">here.</a></p>
      </div>
    )
  },
  {
    question: "Which proposal types exist in the DMD DAO?",
    answer: (
      <div>
        <p>The DMD DAO supports three main proposal types, each designed for different purposes and requiring different approval thresholds:</p>
        <div className="pt0">
          <strong className="heading-strong">Open Proposal</strong>
          <p className="pt0">Open Proposals enable DAO members to share ideas, request funding, and collaborate on initiatives. They encourage community participation by allowing members to suggest projects or actions and optionally request funds to be sent to Externally Owned Accounts (EOAs).</p>
          <ul className="pl40 pr20">
            <li>Approval threshold:</li>
            <li className="ml20">Participation: At least 1/3 of total DAO voting weight for requests within the Low Majority Pot balance; at least 1/2 if the requested amount exceeds that balance and requires funding from the Governance Pot.</li>
            <li className="ml20">Exceeding Yes: Yes voting weight minus No voting weight must reach at least 1/3 of total DAO voting weight for requests within the Low Majority Pot balance, or at least 1/2 for requests exceeding that balance and funded from the Governance Pot.</li>
          </ul>
        </div>
        <div className="pt20">
          <strong className="heading-strong">Ecosystem Parameter Change Proposal</strong>
          <p className="pt0">This proposal type allows members to suggest changes to key parameters governing the DMD ecosystem, such as gas price, proposal fees, block time limits, and more. Changes are limited to predefined ranges for security and stability.</p>
          <ul className="pl40 pr20">
            <li>Approval threshold:</li>
            <li className="ml20">Participation: At least 1/3 of total DAO voting weight</li>
            <li className="ml20">Votes: At least 1/3 "yes" votes exceeding "no" votes</li>
          </ul>
        </div>
        <div className="pt20 pb20">
          <strong className="heading-strong">Contract Upgrade Proposal</strong>
          <p className="pt0">Used for upgrading smart contracts managed by the DAO. These proposals often involve technical changes, security improvements, or adjustments to support new features. "Low Majority Fill" proposals (for topping up the Low Majority Contract) are a subtype of Contract Upgrade proposals.</p>
          <ul className="pl40 pr20">
            <li>Approval threshold:</li>
            <li className="ml20">Participation: At least 1/2 of total DAO voting weight</li>
            <li className="ml20">Votes: At least 1/2 "yes" votes exceeding "no" votes</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    question: "How is the voting process organized, and how are results calculated?",
    answer: (
      <div>
        <p>The voting process begins immediately after the Proposal Phase ends and is only open to validator candidates. Community members participate indirectly by staking their coins on validators, who vote on their behalf.</p>
        <div className="pt0">
          <strong className="heading-strong">Voting process:</strong>
          <ul className="pl40 pr20">
            <li>Validators can vote "Yes" or "No" on a proposal and can change their vote at any time during the Voting Phase.</li>
            <li>A validator's voting power is based on their own stake plus delegated stake counted under the DAO rules, expressed as a percentage of total DAO voting weight. Total DAO voting weight does not mean the total supply of DMD.</li>
          </ul>
        </div>
        <div className="pt20">
          <strong className="heading-strong">Result calculation:</strong>
          <p className="pt0">Two conditions must be met for a proposal to pass:</p>
          <ol className="pl40 pr20 pt0">
            <li><strong>Participation Threshold (% of total DAO voting weight):</strong>
              <ul className="pl20 pr20">
                <li>Open Proposal: 1/3 for requests within the Low Majority Pot balance; 1/2 for requests exceeding that balance and funded from the Governance Pot.</li>
                <li>Ecosystem Parameter Change: 1/3</li>
                <li>Contract Upgrade: 1/2</li>
              </ul>
            </li>
            <li><strong>Exceeding Yes Votes (% of total DAO voting weight):</strong><br />
              Exceeding Yes = Yes voting weight − No voting weight, expressed as a percentage of total DAO voting weight.
              <ul className="pl20 pr20">
                <li>Open Proposal: 1/3 for requests within the Low Majority Pot balance; 1/2 for requests exceeding that balance and funded from the Governance Pot.</li>
                <li>Ecosystem Parameter Change: 1/3</li>
                <li>Contract Upgrade: 1/2</li>
              </ul>
            </li>
          </ol>
        </div>
        <p className="pt0">If both conditions are met by the end of the Voting Phase, the proposal is accepted and moves to finalization. If not, the proposal is rejected but still finalized on-chain to complete the process. For detailed examples of voting calculations, see <a href="https://github.com/DMDcoin/whitepaper/wiki/G.-Decentralized-Autonomous-Organization#g24-voting-process" target="_blank" rel="noopener noreferrer">here</a></p>
      </div>
    )
  },
  {
    question: "Can I change my decision regarding the proposal?",
    answer: "Validators can change their vote from 'Yes' to 'No', or vice versa, during the Voting Phase. A submitted vote can be changed to the opposite option but cannot be withdrawn. Delegators can review their validator's voting history and choose validators aligned with their preferences. Moving stake may require an unstake order and a later claim before it can be delegated to another validator."
  },
  {
    question: "What is proposal finalization?",
    answer: "Finalization is required for each accepted or declined proposal. Once the voting phase ends and a new proposal phase begins, new proposals cannot be created until all proposals from the previous phase have been finalized. Finalization records the result and is separate from execution. If the proposer has not finalized their proposal, any other ecosystem participant can do so from the 'Actions needed' list. Finalization requires a network gas fee. For accepted proposals, the proposal creation fee is refunded to the proposer during finalization."
  },
  {
    question: "What is proposal execution?",
    answer: "Every accepted proposal needs to be executed so that the decision taken is exercised. Execution can be made during the new DAO phase (following the phase, when the proposal was created), and it is possible to create new proposals and vote on them in parallel. So there is a timeframe of 28 days for the proposal execution (the period of the next proposal+voting phase). Once the period is over, the proposals can not be executed. Contract upgrades can be finalized as all other proposals, but the execution must be done by the person, who proposed it."
  },
  {
    question: "What is node operator share?",
    answer: (
      <div>
        <p className="pb0">The validator owner is the person who owns the pool and provides its required self-stake. The node operator is the person or service that runs and maintains the node infrastructure. These roles may be performed by the same person or by different parties. The validator owner receives 20% of the pool's epoch rewards and may allocate part of this owner share to a separate node operator. The configurable operator allocation ranges from 0.01% to 20% of the pool's rewards and is deducted from the owner's 20% share, not from delegators' rewards. Setting it to 20% forwards the entire owner share to the operator. For example, if a pool receives 100 DMD in rewards and the operator allocation is 5%, the operator receives 5 DMD, the owner retains 15 DMD of the owner share, and the remaining 80 DMD is distributed proportionally among all stakers, including the owner.</p>
        <p>A node operator address can be set up during the pool creation step or anytime after the pool creation in the personal profile on the Diamond UI. It is editable once per epoch. One target address can be active at a time; setting a new one disables the old one.</p>
      </div>
    )
  },
  {
    question: "What is Connectivity Report (CR)?",
    answer: (
      <div>
        <p>The Connectivity Report provides a metric for each node in the Validators list, indicating its network performance and connection stability.</p>
        <p className="pt0">How to interpret CR:</p>
        <ul className="pl40 pr20 pb20">
          <li><strong>0:</strong> No connectivity issues have been reported for the validator.</li>
          <li><strong>&gt;0:</strong> Connectivity issues have been reported for the validator.</li>
        </ul>
      </div>
    )
  },
  {
    question: "What is a DMD Name?",
    answer: "A DMD Name, such as alice.dmd, is a unique, human-readable identity linked to a wallet address. Each name is owned on-chain as a transferable NFT. Diamond UI uses names to make addresses easier to recognize in profiles, validator lists, and DAO pages. You can also configure alice.dmd.domains to point to your website using an IP address (A record) or a hostname (CNAME), and set up alice@dmd.domains to forward incoming emails to your existing email address. Manage these settings in Diamond UI: changes are saved on-chain and synchronized with the DNS service, so they may take time to become visible. Basic DNS configuration and email forwarding are free, but saving changes requires a network gas fee. Website hosting, HTTPS setup, and mailbox storage are separate services. When a name is transferred, its website and email forwarding settings are cleared on-chain; removal from the DNS service is subject to synchronization and caching."
  },
  {
    question: "How can I register a DMD Name?",
    answer: "Connect your wallet, search for an available name on the Homepage or in DMD Names, and follow the registration steps. Review the registration fee and network gas fee before confirming the transaction. The registration fee can be changed through DAO governance."
  },
  {
    question: "Can I own multiple names and transfer them?",
    answer: (
      <div>
        <p>A wallet can own multiple DMD Names, but only one can be active as its public name at a time. Use Diamond UI to manage the active name, transfer ownership, or send a keep-alive transaction. Activation changes and transfers may require fees in addition to gas. Names have a 10-year validity period, which can be reset with a keep-alive transaction. If the period expires, the name becomes publicly claimable.</p>
        <p className="pt0">More about DMD Names: <a target="_blank" href="https://github.com/DMDcoin/whitepaper/wiki/R.-DMD-Naming-System" rel="noopener noreferrer">https://github.com/DMDcoin/whitepaper/wiki/R.-DMD-Naming-System</a></p>
      </div>
    )
  }
];
