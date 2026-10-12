/**
 * RPC utilities: validate a JSON-RPC endpoint by calling eth_chainId or eth_blockNumber
 */

export type RpcValidationResult = {
  ok: boolean;
  chainId?: number;
  error?: {
    code: 'invalid_url' | 'timeout' | 'network_error' | 'invalid_response' | 'wrong_chain' | 'rpc_error';
    message: string;
    details?: any;
  };
};

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Validate a JSON-RPC HTTP endpoint via JSON-RPC 2.0 POST.
 * - Calls eth_chainId first. If that fails, falls back to eth_blockNumber.
 * - Times out after timeoutMs.
 */
export async function validateRpcUrl(
  url: string,
  opts?: { timeoutMs?: number; expectedChainId?: number }
): Promise<RpcValidationResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const expectedChainId = opts?.expectedChainId;

  // Basic URL validation
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return {
        ok: false,
        error: { code: 'invalid_url', message: 'URL must start with http:// or https://'}
      };
    }
  } catch {
    return { ok: false, error: { code: 'invalid_url', message: 'Invalid URL format' } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const makeCall = async (method: string) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return { error: { code: 'network_error' as const, message: `HTTP error ${res.status}` } };
      }
      const data = await res.json();
      if (data.error) {
        return { error: { code: 'rpc_error' as const, message: data.error.message ?? 'RPC error', details: data.error } };
      }
      if (!('result' in data)) {
        return { error: { code: 'invalid_response' as const, message: 'Invalid RPC response' } };
      }
      return { result: data.result };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { error: { code: 'timeout' as const, message: `Connection timed out after ${timeoutMs}ms` } };
      }
      return { error: { code: 'network_error' as const, message: err?.message || 'Network error', details: err } };
    }
  };

  // Try eth_chainId first
  const cid = await makeCall('eth_chainId');
  clearTimeout(timer);

  if (cid.error) {
    // Fallback: try eth_blockNumber to at least ensure endpoint responds
    const fallback = await makeCall('eth_blockNumber');
    if (fallback.error) {
      return { ok: false, error: fallback.error };
    }
    return { ok: true };
  }

  // Parse chainId (hex string to number)
  try {
    const hex = cid.result as string;
    const chainId = typeof hex === 'string' && hex.startsWith('0x') ? parseInt(hex, 16) : Number(hex);
    if (Number.isFinite(chainId)) {
      if (expectedChainId && chainId !== expectedChainId) {
        return { ok: false, chainId, error: { code: 'wrong_chain', message: `Connected to chain ${chainId}, expected ${expectedChainId}` } };
      }
      return { ok: true, chainId };
    }
    return { ok: false, error: { code: 'invalid_response', message: 'Invalid chainId response' } };
  } catch (e: any) {
    return { ok: false, error: { code: 'invalid_response', message: e?.message || 'Failed to parse chainId' } };
  }
}
