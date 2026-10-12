import logger from '@/utils/logger';
import Web3 from 'web3';

/**
 * Extract a hex-encoded revert data blob from a variety of Web3/Provider error shapes.
 */
function extractRevertData(err: any): string | undefined {
  // Metamask / web3 provider variants
  const candidates: any[] = [
    err?.data,
    err?.error?.data,
    err?.receipt?.revertReason,
    err?.receipt?.reason,
    err?.cause?.data,
    err?.cause?.error?.data,
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    if (typeof cand === 'string' && cand.startsWith('0x')) return cand;
    if (typeof cand === 'object') {
      // Some providers wrap the revert data under txHash keys or 'data'
      if (cand.data && typeof cand.data === 'string' && cand.data.startsWith('0x')) return cand.data;
      const values = Object.values(cand);
      for (const v of values) {
        if (typeof v === 'string' && v.startsWith('0x')) return v;
        if (v && typeof (v as any).data === 'string' && (v as any).data.startsWith('0x')) return (v as any).data;
      }
    }
  }
  return undefined;
}

/**
 * Attempt to decode a revert reason string (Error(string)) or a custom error using ABI.
 */
export function decodeRevertReason(web3: Web3, abi: any[], err: any): { reason?: string; selector?: string; decoded?: any } {
  try {
    const data = extractRevertData(err);
    if (!data || data.length < 10) return {};

    const selector = data.slice(0, 10);

    // Standard Error(string) selector 0x08c379a0
    if (selector === '0x08c379a0') {
      try {
        // Strip the selector and decode dynamic string payload
        const payload = '0x' + data.slice(10);
        const reason = web3.eth.abi.decodeParameter('string', payload) as unknown as string;
        return { reason, selector };
      } catch {}
    }

    // Try decoding as a custom error present in the ABI (Solidity >=0.8)
    const errorItems = abi.filter((i: any) => i.type === 'error');
    for (const item of errorItems) {
      try {
        const types = (item.inputs || []).map((i: any) => i.type).join(',');
        const sig = web3.utils.keccak256(`${item.name}(${types})`).slice(0, 10);
        if (sig === selector) {
          const payload = '0x' + data.slice(10);
          const decoded = web3.eth.abi.decodeParameters(item.inputs || [], payload);
          const pretty = `${item.name}(${(item.inputs || [])
            .map((inp: any, idx: number) => `${inp.name || ''}:${decoded[idx]}`)
            .join(', ')})`;
          return { reason: pretty, selector, decoded };
        }
      } catch {}
    }

    return { selector };
  } catch {
    return {};
  }
}

/**
 * Format a helpful error message for UI logs/toasts.
 */
export function formatTxError(web3: Web3, abi: any[], err: any, fallback = 'Transaction failed'): string {
  // User rejection
  if (err?.code === 4001 || err?.message?.includes('User denied') || err?.message?.includes('User rejected')) {
    return 'User denied transaction signature';
  }

  const { reason } = decodeRevertReason(web3, abi, err);
  if (reason) return reason;

  if (typeof err?.message === 'string' && err.message.length < 220) {
    return err.message.replace(/execution reverted:?\s*/i, '').trim();
  }

  return fallback;
}

export type DebugMeta = {
  contract: string;
  method: string;
  args: any[];
};

/**
 * Debug levels:
 * 0 -> off
 * 1 -> errors only
 * 2 -> log all sends/calls start + errors
 */
export function getDebugLevel(): number {
  let raw = '1';
  if (typeof window !== 'undefined') {
    // Try to get from global config (set by RuntimeConfigProvider)
    const globalConfig = (window as any).__RUNTIME_CONFIG__;
    if (globalConfig) {
      raw = globalConfig.debugTxLevel || globalConfig.debugTx || '1';
    } else {
      // Fallback to process.env in browser
      raw = (process.env.NEXT_PUBLIC_DEBUG_TX_LEVEL ?? process.env.NEXT_PUBLIC_DEBUG_TX ?? '1') as string;
    }
  } else {
    // Server-side: always use process.env
    raw = (process.env.NEXT_PUBLIC_DEBUG_TX_LEVEL ?? process.env.NEXT_PUBLIC_DEBUG_TX ?? '1') as string;
  }
  const level = Number(raw);
  if (Number.isNaN(level)) return 1;
  return Math.max(0, Math.min(2, level));
}

/**
 * Small helper to log a consistent header for calls/sends.
 */
export function logDebugStart(meta: DebugMeta) {
  if (getDebugLevel() >= 2) {
    // eslint-disable-next-line no-console
    logger.info(`[TX] ${meta.contract}.${meta.method}(${meta.args.map(a => JSON.stringify(a)).join(', ')})`);
  }
}

export function logDebugError(web3: Web3, abi: any[], meta: DebugMeta, err: any) {
  if (getDebugLevel() >= 1) {
    const { reason, selector } = decodeRevertReason(web3, abi, err);
    // eslint-disable-next-line no-console
    logger.error(`[TX ERROR] ${meta.contract}.${meta.method} -> ${reason || err?.message || 'Unknown'}${selector ? ` [${selector}]` : ''}`, err);
  }
}
