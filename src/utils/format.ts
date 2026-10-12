import BigNumber from 'bignumber.js';

const WEI = new BigNumber(10).pow(18);
const EMPTY = '—';
const MIN_DMD_DECIMALS = 2;
const SMALL_DMD_DECIMALS = 4;
const TINY_DMD_DECIMALS = 8;
const TINY_DMD_THRESHOLD = new BigNumber(10).pow(-TINY_DMD_DECIMALS);

export type NumericInput = BigNumber | string | number | bigint | null | undefined;

interface DmdOptions {
  unit?: boolean;
  empty?: string;
  sign?: boolean;
  decimals?: number;
}

interface PercentOptions {
  decimals?: number;
  empty?: string;
  sign?: boolean;
}

interface DecimalOptions {
  decimals?: number;
  empty?: string;
  sign?: boolean;
}

const toBigNumber = (value: NumericInput): BigNumber | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'bigint') return new BigNumber(value.toString());
  const amount = BigNumber.isBigNumber(value) ? value : new BigNumber(value);
  return amount.isFinite() ? amount : null;
};

/**
 * Drops trailing zeros beyond a minimum number of decimals.
 * @param {string} formatted - An already grouped decimal string.
 * @param {number} minDecimals - Decimals that are always kept.
 * @returns {string}
 */
const trimToMinDecimals = (formatted: string, minDecimals: number): string => {
  if (!formatted.includes('.')) return formatted;
  const [whole, decimals] = formatted.split('.');
  const trimmed = decimals.replace(/0+$/, '');
  const kept = trimmed.length > minDecimals ? trimmed : decimals.slice(0, minDecimals);
  return kept ? `${whole}.${kept}` : whole;
};

/**
 * Formats a DMD amount for display.
 * Amounts of 1000 or more use 2 decimals, smaller amounts show up to 4,
 * and amounts below 1 show up to 8 so that dust stays readable.
 * @param {NumericInput} value - The amount in DMD.
 * @param {DmdOptions} options
 * @returns {string}
 */
export const formatDmd = (
  value: NumericInput,
  { unit = true, empty = EMPTY, sign = false, decimals }: DmdOptions = {}
): string => {
  const amount = toBigNumber(value);
  const suffix = unit ? ' DMD' : '';
  if (!amount) return empty;

  const magnitude = amount.abs();
  const prefix = sign && amount.isGreaterThan(0) ? '+' : '';

  if (decimals !== undefined) {
    return `${prefix}${amount.toFormat(decimals, BigNumber.ROUND_DOWN)}${suffix}`;
  }

  if (magnitude.isZero()) return `0.00${suffix}`;
  if (magnitude.isLessThan(TINY_DMD_THRESHOLD)) {
    return `${amount.isNegative() ? '>-' : '<'}0.00000001${suffix}`;
  }

  let maxDecimals = TINY_DMD_DECIMALS;
  if (magnitude.isGreaterThanOrEqualTo(1000)) maxDecimals = MIN_DMD_DECIMALS;
  else if (magnitude.isGreaterThanOrEqualTo(1)) maxDecimals = SMALL_DMD_DECIMALS;

  return `${prefix}${trimToMinDecimals(amount.toFormat(maxDecimals, BigNumber.ROUND_DOWN), MIN_DMD_DECIMALS)}${suffix}`;
};

/**
 * Formats a wei amount as a DMD display string.
 * @param {NumericInput} wei
 * @param {DmdOptions} options
 * @returns {string}
 */
export const formatDmdFromWei = (wei: NumericInput, options: DmdOptions = {}): string => {
  const amount = toBigNumber(wei);
  if (!amount) return options.empty ?? EMPTY;
  return formatDmd(amount.dividedBy(WEI), options);
};

/**
 * Formats a rewards-per-1000-DMD figure, which always carries 2 decimals.
 * @param {NumericInput} value - The RpT30 in DMD.
 * @param {DmdOptions} options
 * @returns {string}
 */
export const formatRpt30 = (value: NumericInput, options: DmdOptions = {}): string =>
  formatDmd(value, { decimals: MIN_DMD_DECIMALS, ...options });

/**
 * Formats a percentage that is already expressed on a 0–100 scale.
 * @param {NumericInput} value
 * @param {PercentOptions} options
 * @returns {string}
 */
export const formatPercent = (
  value: NumericInput,
  { decimals = 2, empty = EMPTY, sign = false }: PercentOptions = {}
): string => {
  const percent = toBigNumber(value);
  if (!percent) return empty;
  const prefix = sign && percent.isGreaterThan(0) ? '+' : '';
  return `${prefix}${percent.toFormat(decimals, BigNumber.ROUND_HALF_UP)}%`;
};

/**
 * Formats an estimated APY.
 * @param {NumericInput} value - The APY on a 0–100 scale.
 * @param {string} empty
 * @returns {string}
 */
export const formatApy = (value: NumericInput, empty = EMPTY): string =>
  formatPercent(value, { decimals: 2, empty });

/**
 * Formats a pool saturation percentage.
 * @param {NumericInput} value - The saturation on a 0–100 scale.
 * @param {string} empty
 * @returns {string}
 */
export const formatSaturation = (value: NumericInput, empty = EMPTY): string =>
  formatPercent(value, { decimals: 1, empty });

/**
 * Formats an active epoch participation ratio as a whole percentage.
 * @param {NumericInput} value - The ratio on a 0–1 scale.
 * @param {string} empty
 * @returns {string}
 */
export const formatAep30 = (value: NumericInput, empty = EMPTY): string => {
  const ratio = toBigNumber(value);
  if (!ratio) return empty;
  return formatPercent(ratio.multipliedBy(100), { decimals: 0, empty });
};

/**
 * Formats a plain decimal value such as a score or a trend.
 * @param {NumericInput} value
 * @param {DecimalOptions} options
 * @returns {string}
 */
export const formatDecimal = (
  value: NumericInput,
  { decimals = 2, empty = EMPTY, sign = false }: DecimalOptions = {}
): string => {
  const amount = toBigNumber(value);
  if (!amount) return empty;
  const prefix = sign && amount.isGreaterThan(0) ? '+' : '';
  return `${prefix}${amount.toFormat(decimals, BigNumber.ROUND_HALF_UP)}`;
};

/**
 * Formats a period-over-period change with an explicit sign.
 * @param {NumericInput} value
 * @param {DecimalOptions} options
 * @returns {string}
 */
export const formatDelta = (value: NumericInput, options: DecimalOptions = {}): string =>
  formatDecimal(value, { decimals: 2, sign: true, ...options });

/**
 * Formats a whole number such as a block height or a validator count.
 * @param {NumericInput} value
 * @param {string} empty
 * @returns {string}
 */
export const formatCount = (value: NumericInput, empty = EMPTY): string => {
  const amount = toBigNumber(value);
  if (!amount) return empty;
  return amount.toFormat(0, BigNumber.ROUND_HALF_UP);
};
