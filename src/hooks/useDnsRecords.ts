'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DmdDnsConfig } from '@/types/dmdNaming';

/**
 * Per-browser draft store for the DNS configuration UI. Nothing here reaches a
 * contract or the backend — the `.dmd.domains` zone is not wired up yet, so the
 * screens are driven from local state until it is.
 */
const STORAGE_KEY = 'dmd-dns-records-preview';

export const EMPTY_DNS_CONFIG: DmdDnsConfig = { linked: false, aRecord: '', mxRecords: [] };

type DnsConfigStore = Record<string, DmdDnsConfig>;

function readStoredConfigs(): DnsConfigStore {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DnsConfigStore) : {};
  } catch {
    return {};
  }
}

export function useDnsRecords() {
  const [configs, setConfigs] = useState<DnsConfigStore>({});

  useEffect(() => {
    setConfigs(readStoredConfigs());
  }, []);

  const getDnsConfig = useCallback(
    (name: string): DmdDnsConfig => configs[name] ?? EMPTY_DNS_CONFIG,
    [configs],
  );

  const saveDnsConfig = useCallback((name: string, config: DmdDnsConfig) => {
    setConfigs((current) => {
      const next = { ...current, [name]: config };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // A full or unavailable store only costs the draft, so keep the UI responsive.
      }
      return next;
    });
  }, []);

  return { configs, getDnsConfig, saveDnsConfig };
}
