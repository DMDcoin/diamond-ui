/**
 * Storage helpers for persisting custom RPC endpoint
 * Prefer cookies; fallback to localStorage when cookies are unavailable.
 */

import logger from '@/utils/logger';

const COOKIE_NAME = 'custom_rpc_endpoint';
const DEFAULT_MAX_AGE_DAYS = 60; // ~2 months

function setCookie(name: string, value: string, maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  const expires = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function saveRPC(url: string, maxAgeDays = DEFAULT_MAX_AGE_DAYS): boolean {
  try {
    setCookie(COOKIE_NAME, url, maxAgeDays);
    try {
      localStorage.setItem('rpcUrl', url);
    } catch {}
    return true;
  } catch (e) {
    try {
      localStorage.setItem('rpcUrl', url);
      return true;
    } catch (err) {
      logger.error('[Storage] Failed to save RPC', err);
      return false;
    }
  }
}

export function getRPC(): string | null {
  try {
    const fromCookie = getCookie(COOKIE_NAME);
    if (fromCookie) return fromCookie;
  } catch {}
  try {
    return localStorage.getItem('rpcUrl');
  } catch {
    return null;
  }
}

export function clearRPC(): boolean {
  try {
    deleteCookie(COOKIE_NAME);
  } catch {}
  try {
    localStorage.removeItem('rpcUrl');
    return true;
  } catch (err) {
    logger.error('[Storage] Failed to clear RPC', err);
    return false;
  }
}
