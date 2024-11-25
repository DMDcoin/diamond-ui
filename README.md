# Diamond UI - Unified Platform for DMD Operations


**Diamond UI** is a decentralized application designed to streamline operations, offering a comprehensive toolkit that promotes trust and stability in the DMD ecosystem.

#### Key Features:
1. **Validator Operations**:
   - Access to validators list, detailed statistics, and delegate management.
   - Ability to stake, unstake, and order coins with integrated Epoch rewards.

2. **User Profiles**:
   - Personalized profiles for all network participants.
   - Displays staking details, voting power, scores, and delegates.

3. **DAO Integration**:
   - A dedicated module for decentralized governance.
   - Supports proposal submissions and voting phases.

4. **Access Levels**:
   - **General Users**: View network stats and validators without connecting a wallet.
   - **Validator Candidates**: Manage nodes, stakes, and voting power.
   - **DMD Token Holders**: Stake coins on validator nodes without running a node.

### Getting Started with the Project

This guide provides step-by-step instructions to set up and run the project.

---

### Prerequisites

- **Node.js**: Make sure you have Node.js installed. [Download here](https://nodejs.org/).
- **npm or yarn**: Ensure `npm` or `yarn` is installed for managing packages.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DMDcoin/diamond-ui
   cd diamond-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

### Scripts Overview

#### Development

- **Start the Development Server**  
  Starts the project using `vite` for development.
  ```bash
  npm run start
  ```

#### Build

- **Build the Project**  
  Compiles TypeScript and builds the production-ready version of the application using `vite`.
  ```bash
  npm run build
  ```

- **Preview the Build**  
  Previews the production build in a local environment.
  ```bash
  npm run serve
  ```

- **Update DAO Contract ABIs**  
  Copies the contract ABIs from the DAO contracts repository into the application.
  ```bash
  npm run update-dao-abis
  ```

- **Update Core Contract ABIs**  
  Copies the contract ABIs from the Core contracts repository into the application.
  ```bash
  npm run update-core-abis
  ```

- **Generate TypeScript Contract Types**  
  Uses `typechain` to generate TypeScript types for contract ABIs.
  ```bash
  npm run typechain
  ```