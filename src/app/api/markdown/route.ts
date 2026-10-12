import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ui2.bit.diamonds';

const MARKDOWN = `# Diamond UI — DMD Diamond Staking Platform

Decentralized platform for DMD operations, offering tools for validator management, staking, DAO governance, and personalized user profiles to promote trust and stability in the DMD ecosystem.

**Base URL:** ${SITE_URL}

---

## Sections

### Validators — \`/validators\`
Browse active validators and candidates on the DMD network. Each entry shows the validator address, staking pool balance, score, and current status. Use this page to select a pool to stake into.

### DAO Governance — \`/dao\`
View and interact with on-chain governance proposals. Lists active, historic, and pending proposals with voting status, vote counts, and execution outcomes.

- **Create Proposal** — \`/dao/create\` — Submit a new governance proposal
- **Historic Proposals** — \`/dao/historic\` — Browse closed and executed proposals

### Documentation — https://overview.bit.diamonds
Documentation and reference material for the DMD network and staking mechanics, hosted outside the Diamond UI.

### FAQs — \`/faqs\`
Frequently asked questions covering staking, rewards, governance, and wallet setup.

### Profile — \`/profile\`
View your connected wallet's staking, rewards, and governance activities.

---

## Network

DMD Diamond is an EVM-compatible delegated proof-of-stake blockchain using HoneyBadgerBFT (HBBFT) consensus together with the POSDAO validator election mechanism.

Validators are dynamically elected every epoch, while token holders delegate stake to validator pools to earn staking rewards.

### Key Concepts

- **Epoch** — A fixed validator and reward cycle currently operating on 12-hour intervals. Validator performance is evaluated and rewards are distributed after each epoch.
- **Staking Pool** — Each validator operates a staking pool where delegators can stake DMD tokens. Delegated funds remain in the on-chain staking contract and are never controlled directly by validators.
- **POSDAO** — The validator election and staking system used by DMD Diamond. POSDAO dynamically selects active validators from validator candidates based on stake and network rules.
- **DAO** — On-chain governance system used to manage protocol upgrades, network parameters, treasury decisions, and governance proposals through executable voting.
- **Staking Contract** — Smart contract responsible for holding delegated validator and delegator stake while distributing staking rewards.
- **Claiming Contract** — Separate smart contract used for DMDv3-to-DMDv4 migration claims and unclaimed snapshot balances.

---

## API Endpoints

| Path | Description |
|------|-------------|
| \`/api/external\` | Proxy to the DMD backend RPC aggregator |
| \`/api/config\` | Runtime configuration (chain IDs, contract addresses) |
| \`/api/mcp\` | MCP server stub (JSON-RPC 2.0, protocol 2024-11-05) |
| \`/.well-known/api-catalog\` | RFC 9727 linkset — machine-readable API catalog |
| \`/.well-known/agent-skills/index.json\` | Agent skills index with SKILL.md digest |

---

## Notes

- All staking, governance, and validator data displayed in Diamond UI is sourced directly from the DMD Diamond blockchain.
- Staking and governance interactions require a connected Web3 wallet.
- WalletConnect and EVM-compatible wallets are supported.
- Delegated staking on DMD Diamond is non-custodial — validators never take custody of user funds.
- Rewards are distributed on an epoch basis through the staking system.
`;

export async function GET() {
  const tokens = Math.ceil(MARKDOWN.length / 4);
  return new NextResponse(MARKDOWN, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'x-markdown-tokens': String(tokens),
    },
  });
}
