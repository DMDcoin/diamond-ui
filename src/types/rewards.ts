export interface NodeRewardStats {
  vos30: number;
  vos30_net: number;
  rpt30: number;
  rpt30_prev30: number | null;
  rpt30_delta: number | null;
  aep30: number;
  estimated_apy: number;
  uptime: number;
  active_epoch_count: number;
  total_epochs_in_window: number;
}
export interface StakerRewardStats {
  total_rewards_30d: number;
  active_pool_count: number;
}
export interface StakerRewardEntry {
  pool_address: string;
  epoch: number;
  reward_amount: string;
  is_claimed: boolean;
  block_start: number;
  block_end: number;
  epoch_end_time: number | string | null;
}
export interface StakerRewardsListResponse {
  data: StakerRewardEntry[];
  count: number;
  limit: number;
  offset: number;
}
export interface BatchNodeRewardStats {
  vos30: number;
  vos30_net: number;
  rpt30: number;
  rpt30_prev30: number | null;
  rpt30_delta: number | null;
  aep30: number;
  estimated_apy: number;
  uptime: number;
  active_epoch_count: number;
  total_epochs_in_window: number;
}
export type BatchNodeRewardStatsResponse = Record<string, BatchNodeRewardStats>;
export interface BatchStakerRewardStats {
  total_rewards_30d: number;
  active_pool_count: number;
}
export type BatchStakerRewardStatsResponse = Record<string, BatchStakerRewardStats>;
export interface NodeEpochReward {
  epoch: number;
  owner_reward: string;
  validator_fixed_reward: string;
  node_operator_reward: string;
  delegators_total_reward: string;
  total_pool_reward: string;
  total_staked_snapshot: string;
  epoch_apy: string;
  is_claimed: boolean | null;
  block_start: number;
  block_end: number;
  epoch_end_time: number | string | null;
  is_finalized?: boolean;
}
export interface NodeEpochRewardsResponse {
  data: NodeEpochReward[];
  count: number;
  limit: number;
  offset: number;
}
export type RewardsRange = '30d' | '1y' | 'all';
export interface NodeDailyReward {
  date: string;
  rpt30: number;
  total_pool_reward_sum: string;
  owner_reward_sum: string;
  epoch_count: number;
}
export interface NodeDailyRewardsResponse {
  data: NodeDailyReward[];
  range: RewardsRange;
  count: number;
}
