import Web3 from 'web3';

export type HealthCheckOptions = {
  expectedChainId?: number;
  timeoutMs?: number;
};

export type HealthCheckResult = {
  ok: boolean;
  reason?: string;
};

const DEFAULT_TIMEOUT_MS = 5000;

export function isEip1193Provider(p: any): boolean {
  if (!p) return false;
  return typeof p.request === 'function' || (typeof p.send === 'function' && typeof p.on === 'function');
}

/**
 * Ping the current provider to ensure it's responsive and consistent:
 * - eth_accounts should return at least one address
 * - eth_chainId should match expectedChainId
 */
export async function checkProviderHealth(web3: Web3, opts: HealthCheckOptions = {}): Promise<HealthCheckResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const expectedChainId = opts.expectedChainId;

  const provider: any = (web3 as any)?.currentProvider;
  if (!provider) {
    return { ok: false, reason: 'No provider bound to Web3 instance' };
  }

  // request with timeout safety
  const withTimeout = async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Provider timeout')), timeoutMs);
      fn()
        .then((v) => {
          clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  };

  try {
    const accounts = await withTimeout(() => web3.eth.getAccounts());
    if (!accounts || accounts.length === 0) {
      return { ok: false, reason: 'No accounts available. Is your wallet unlocked?' };
    }
    const chainId = await withTimeout(() => web3.eth.getChainId());
    if (expectedChainId && Number(chainId) !== Number(expectedChainId)) {
      return { ok: false, reason: `Connected to chain ${chainId}, expected ${expectedChainId}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: err?.message || 'Provider health check failed' };
  }
}

/**
 * Safely retrieve gas price. Prefer wallet provider; fall back to a stable HTTP RPC when needed.
 */
export async function getGasPriceSafe(primary: Web3, fallback: Web3): Promise<string> {
  try {
    const gp = await primary.eth.getGasPrice();
    if (gp && gp !== '0') return gp;
  } catch {}
  try {
    const gp2 = await fallback.eth.getGasPrice();
    if (gp2 && gp2 !== '0') return gp2;
  } catch {}
  // Last resort: 10 gwei
  return '10000000000';
}
