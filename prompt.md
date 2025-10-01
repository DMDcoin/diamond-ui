# Complete Prompt

Analyze the project and implement the following changes for DAO proposal calculations:

## Core Requirements

1. **Replace `totalStake` with snapshot-based calculations:**
   - Find all locations where `totalStake` is used in DAO proposal calculations
   - Replace these with `daoEpochTotalStakeSnapshot(daoEpoch)` instead of fetching `totalStake` from the latest block
   - Implement fallback logic: if `daoEpochTotalStakeSnapshot(daoEpoch)` returns 0 (snapshot not yet taken for current phase), use the existing `totalStake` logic

2. **Implement smart caching strategy:**
   - After the initial fetching, when a proposal is opened/viewed, check if its cached `TotalStakeSnapshot` is 0
   - Only if it's 0, call `daoEpochTotalStakeSnapshot(daoEpoch)` to fetch the updated value
   - Upon receiving the updated snapshot value, update ALL proposals in localStorage that share the same `daoEpoch` with this new `TotalStakeSnapshot`
   - This prevents redundant fetching for proposals from the same epoch

3. **Ensure correct display across all pages:**
   - All proposals on historic and DAO pages should display with correct values immediately
   - Values should be calculated using the appropriate `TotalStakeSnapshot` (cached or newly fetched)
   - Updates should happen seamlessly when proposals are opened and snapshots become available

## Critical Constraints

- **NO intervals or background services** that continuously check for `daoEpochTotalStakeSnapshot` changes
- **NO UI/content changes** - do not modify how data is displayed on the interface
- **NO unnecessary code changes** - only modify code directly related to `TotalStakeSnapshot` fetching and caching logic
- Focus strictly on the snapshot retrieval and storage logic