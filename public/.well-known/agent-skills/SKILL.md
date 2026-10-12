# Diamond UI

The Diamond UI is the primary web application for interacting with the DMD Diamond v4 blockchain.

Full documentation wiki:  
https://github.com/DMDcoin/whitepaper/wiki/A.-Home

It provides:

- validator discovery and staking,
- delegation management,
- DAO governance participation,
- validator pool creation and operation,
- reward claiming and unstaking,
- and ecosystem parameter governance.

The network uses:

- EVM-compatible smart contracts,
- HBBFT consensus with deterministic finality,
- POSDAO validator election,
- and a DAO-governed ecosystem.

Epoch length: **12 hours**.

---

## Validators

Full documentation wiki:  
https://github.com/DMDcoin/whitepaper/wiki/A.-Home

The `/validators` page lists all validator pools and validator candidates on the DMD network.

Each validator entry exposes:

- **Wallet address** — validator staking address (pool owner)
- **Mining address** — address used for validator operations and block production
- **Public key** — validator consensus public key
- **Status** — one of:
  - **Active** — currently part of the active validator set
  - **Valid** — eligible for election, including validators from the active set who may be elected again next epoch
  - **Invalid** — not eligible due to stake, connectivity, or configuration issues
- **Score** — validator bonus score (1–1000) affecting election probability
- **Voting power** — DAO voting weight based on total staked DMD
- **Total stake** — combined validator + delegator stake
- **Validator stake** — validator owner's own stake
- **Delegated stake** — total stake delegated by other users
- **My stake** — amount delegated by the connected wallet
- **Connectivity reports** — detected validator connectivity issues

Validator pool rules:

- Minimum validator self-stake: **10,000 DMD**
- Maximum total stake per validator pool: **50,000 DMD**
- Minimum delegation amount: **100 DMD**

Users can:

- delegate stake,
- unstake,
- claim rewards,
- create validator pools,
- configure node operator reward sharing,
- and view validator statistics/history.

Unstaking behavior:

- If stake is inactive, withdrawal can happen immediately.
- If currently active in an epoch, an unstake order is created and funds become claimable after the epoch ends.

---

## DAO

Full documentation wiki:  
https://github.com/DMDcoin/whitepaper/wiki/A.-Home

The `/dao` section manages decentralized governance for the DMD ecosystem.

All core protocol logic and treasury management are DAO-controlled.

Proposal lifecycle:

1. Proposal creation
2. Voting phase
3. Finalization
4. Execution

Proposal voting is performed by validator candidates.  
Delegators indirectly participate through the validators they stake with.

### Proposal Types

#### Open Proposal

General-purpose governance proposals and community initiatives.

Can optionally:

- request funding,
- define payout addresses,
- include treasury distributions.

Approval threshold:

- 1/3 DAO participation
- 1/3 yes-vote majority

#### Ecosystem Parameter Change

Changes configurable protocol parameters such as:

- minimum gas price,
- proposal fee,
- block gas limit,
- standby bonus,
- minimum delegation stake.

Approval threshold:

- 1/3 DAO participation
- 1/3 yes-vote majority

#### Contract Upgrade Proposal

Used for protocol-level smart contract upgrades.

Approval threshold:

- 1/2 DAO participation
- 1/2 yes-vote majority

### DAO Concepts

- **Voting power** is proportional to total stake delegated to a validator pool.
- Proposal submission requires a proposal fee.
- Accepted proposal fees are refunded.
- Rejected proposal fees are sent to the Reinsert Pot.
- Governance treasury funding comes from the Governance Pot.

---

## Staking

Full documentation wiki:  
https://github.com/DMDcoin/whitepaper/wiki/A.-Home

The `/staking` functionality allows users to delegate DMD to validator pools and earn epoch rewards.

### Reward Distribution

Block rewards for active validators and their delegates are split proportionally according to the number of coins staked for each validator.

Additionally, validators receive a guaranteed reward at the end of each epoch.

Epoch rewards are funded from:

- Delta Pot
- Reinsert Pot

The epoch reward calculation is:

`Epoch reward = (Reinsert Pot + Delta Pot) / 6000`

Before validator distribution, 10% of the epoch reward is allocated to the Governance Pot.

The remaining rewards are distributed equally across the active validator set:

`Validator reward = (Epoch reward - Governance Pot share) / 25`

Where:

- `25` represents the maximum number of active validator candidates,
- rewards are calculated the same way even if fewer than 25 validators are eligible,
- validators do not receive larger rewards when the active validator set is smaller.

### Validator Reward Split

Each validator reward is distributed in two stages:

1. **20% upfront validator reward**
2. **80% proportional staking reward**

#### Validator Owner Reward

Twenty percent (20%) of validator rewards go directly to the validator owner.

This 20% may also include the configured node operator share if reward sharing is enabled.

Validator owners therefore earn:

- the guaranteed 20% validator reward,
- plus proportional staking rewards based on their own staked coins.

#### Staker Reward Distribution

The remaining 80% of validator rewards are distributed proportionally among all stakers on the validator pool, including the validator owner's own stake.

This means validator owners effectively receive rewards twice:

- once from the guaranteed 20% validator reward,
- and again from their proportional share of the delegated staking pool.

### Epoch Duration Rules

The target epoch duration is 12 hours.

- If an epoch is shorter than 12 hours, rewards are proportionally reduced.
- If an epoch is longer than 12 hours, rewards are not increased.

### Staking Mechanics

- Delegated stake contributes to validator voting power.
- Stake becomes active in the next epoch.
- Rewards accumulate per epoch.
- Rewards are automatically restaked once distributed.
- Coins can be unstaked immediately if they are not part of an active or pending validator set.
- Coins locked in an active epoch require an unstake order and become claimable after the epoch ends.

#### Unstaking Process

To remove coins from a validator:

1. Click the **Unstake** button on the validator list or validator detail page.
2. Enter the amount to unstake in the popup dialog.
3. The UI automatically calculates:
   - coins available for immediate unstaking,
   - and coins that must be ordered for delayed unstaking.
4. Approve the unstake transaction in your wallet.

If some coins cannot be unstaked immediately because they are part of an active or pending validator stake:

1. Unstake all immediately available coins first.
2. Submit a second unstake request for the remaining ordered amount.
3. Ordered coins remain locked until the current epoch ends.
4. Once claimable, use the **Claim** button next to the validator stake entry to withdraw the ordered coins.

### Node Operator Reward Sharing

Validator owners can optionally assign a node operator address and share part of their 20% validator owner reward.

The node owner:

- retains ownership of staked coins,
- keeps DAO voting rights,
- and remains responsible for validator behavior and penalties.

Full documentation can be found here: https://github.com/DMDcoin/whitepaper/wiki
