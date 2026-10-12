import BigNumber from 'bignumber.js';

const ZERO = BigInt(0);

export interface PoolStake {
  pool: string;
  amount: bigint;
}

export interface Holdings {
  wallet: bigint;
  ownStake: bigint;
  delegatedOut: bigint;
  total: bigint;
}

export const computeHoldings = (address: string, wallet: bigint, stakes: PoolStake[]): Holdings => {
  const self = address.toLowerCase();
  let ownStake = ZERO;
  let delegatedOut = ZERO;

  for (const { pool, amount } of stakes) {
    if (amount <= ZERO) continue;
    if (pool.toLowerCase() === self) {
      ownStake += amount;
    } else {
      delegatedOut += amount;
    }
  }

  return { wallet, ownStake, delegatedOut, total: wallet + ownStake + delegatedOut };
};

export const shareOfSupply = (amount: bigint, totalSupply: bigint): BigNumber | null => {
  if (totalSupply <= ZERO) return null;
  return new BigNumber(amount.toString()).multipliedBy(100).dividedBy(totalSupply.toString());
};
