/**
 * Shared builder for wallet transaction options.
 *
 * Every write must hand the wallet a fully-specified transaction. When `gas`
 * or `value` are omitted, the wallet has to synthesize them itself by
 * estimating against the RPC; in some wallets (e.g. Brave on Windows) that
 * self-estimation intermittently fails and produces a malformed legacy
 * transaction, surfacing as "-32602: Invalid RLP". Estimating gas here and
 * always passing `value` and `type` removes every field the wallet would
 * otherwise have to fill in.
 */

/**
 * A web3 v1 contract method call exposes estimateGas alongside send. The
 * options are typed loosely so both payable and non-payable typechain method
 * objects (which differ on whether `value` is allowed) assign cleanly.
 */
export interface EstimatableMethod {
  estimateGas(options: any): Promise<number | string | bigint>;
}

export interface TxSendOptions {
  from: string;
  gasPrice: string;
  gas: string;
  value: string;
  type: '0x0';
}

// Used only when estimation fails; generous enough for any current write.
const GAS_FALLBACK = '3000000';
// Headroom over the estimate to absorb state changes between estimate and mine.
const GAS_BUFFER = 1.2;

/**
 * Build complete send options for a contract method, estimating gas app-side.
 * Pass the same method object to `.send(...)` afterwards.
 */
export async function buildTxOptions(
  method: EstimatableMethod,
  params: { from: string; gasPrice: string; value?: string },
): Promise<TxSendOptions> {
  const value = params.value ?? '0';

  let gas = GAS_FALLBACK;
  try {
    const estimated = await method.estimateGas({ from: params.from, value });
    gas = Math.ceil(Number(estimated) * GAS_BUFFER).toString();
  } catch {
    // Keep the fallback: wallet-side estimation is the failure mode we avoid,
    // so a fixed generous limit is safer than deferring to the wallet.
  }

  return { from: params.from, gasPrice: params.gasPrice, gas, value, type: '0x0' };
}
