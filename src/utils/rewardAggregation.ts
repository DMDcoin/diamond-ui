import type { NodeDailyReward } from '@/types/rewards';

export interface RewardsChartPoint {
  [key: string]: string | number;
  dateKey: string;
  date: string;
  sortKey: number;
  rpt: number;
  totalReward: number;
  ownerReward: number;
}

// rpt30 is a trailing 30-day sum; totalReward/ownerReward are each day's own total.
export function mapDailyRewardsToChartPoints(rows: NodeDailyReward[]): RewardsChartPoint[] {
  return rows
    .map(r => {
      const d = new Date(`${r.date}T00:00:00Z`);
      return {
        dateKey: r.date,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        sortKey: d.getTime(),
        rpt: r.rpt30,
        totalReward: parseFloat(r.total_pool_reward_sum) || 0,
        ownerReward: parseFloat(r.owner_reward_sum) || 0,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}
