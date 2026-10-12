export interface ImpactEffect {
  text: string;
  type: 'positive' | 'negative';
}

export interface ProposalImpact {
  title: string;
  effects: ImpactEffect[];
  specialIndicator?: 'blue'; // For special cases like Standby Bonus
}

export const PROPOSAL_IMPACTS: Record<string, ProposalImpact> = {
  'setCreateProposalFee': {
    title: 'Create Proposal Fee',
    effects: [
      { text: 'Higher fee reduces spam and low-quality proposals.', type: 'positive' },
      { text: 'Encourages more serious governance participation.', type: 'positive' },
      { text: 'Lower fee increases accessibility for smaller stakeholders.', type: 'negative' },
      { text: 'May lead to more frequent or low-quality proposals.', type: 'negative' },
    ],
  },
  'setDelegatorMinStake': {
    title: 'Delegator Minimum Stake',
    effects: [
      { text: 'Higher minimum increases stake commitment per delegator.', type: 'positive' },
      { text: 'Reduces small stake fragmentation.', type: 'positive' },
      { text: 'Lower minimum improves inclusivity and decentralization.', type: 'negative' },
      { text: 'May increase many small delegations and network overhead.', type: 'negative' },
    ],
  },
  'setMinimumGasPrice': {
    title: 'Minimum Gas Price',
    effects: [
      { text: 'Higher gas price reduces spam transactions.', type: 'positive' },
      { text: 'Increases contributions to the network pots.', type: 'positive' },
      { text: 'Lower gas price makes transactions cheaper for users.', type: 'negative' },
      { text: 'May increase network congestion or spam activity.', type: 'negative' },
    ],
  },
  'setBlockGasLimit': {
    title: 'Block Gas Limit',
    effects: [
      { text: 'Higher limit increases transaction throughput.', type: 'positive' },
      { text: 'Supports higher network activity.', type: 'positive' },
      { text: 'Lower limit reduces hardware demands for validators.', type: 'negative' },
      { text: 'Decreases transaction capacity per block.', type: 'negative' },
    ],
  },
  'setGovernancePotShareNominator': {
    title: 'Governance Pot Share Nominator',
    effects: [
      { text: 'Higher share increases DAO funding.', type: 'positive' },
      { text: 'Supports ecosystem development initiatives.', type: 'positive' },
      { text: 'Lower share increases rewards for validators and delegators.', type: 'negative' },
      { text: 'Reduces available governance funding.', type: 'negative' },
    ],
  },
  'setReportDisallowPeriod': {
    title: 'Report Disallow Period',
    effects: [
      { text: 'Longer period gives validators more maintenance flexibility.', type: 'positive' },
      { text: 'Reduces risk of penalties during short outages.', type: 'positive' },
      { text: 'Shorter period strengthens uptime discipline.', type: 'negative' },
      { text: 'May penalize temporary or minor connectivity issues.', type: 'negative' },
    ],
  },
  'setStandByFactor': {
    title: 'Standby Bonus',
    specialIndicator: 'blue',
    effects: [
      { text: 'Helps new validators catch up faster.', type: 'positive' },
      { text: 'Reduces validator hopping advantages.', type: 'positive' },
      { text: 'Extends score advantage of existing validators.', type: 'negative' },
      { text: 'Favors long-term reliability over rotation.', type: 'negative' },
    ],
  },
};

/**
 * Get impact data for a specific parameter function name
 */
export function getProposalImpact(functionName: string): ProposalImpact | null {
  const cleanFunctionName = functionName.replace(/\(.*\)/, '');
  return PROPOSAL_IMPACTS[cleanFunctionName] || null;
}
