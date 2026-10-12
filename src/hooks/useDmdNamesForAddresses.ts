'use client';

import { useEffect, useState } from 'react';
import { useWeb3Context } from '@/contexts/Web3';
import { getActiveNameMap } from '@/services/dmdNaming';

export function useDmdNamesForAddresses(addresses: string[]): Record<string, string | null> {
  const { readonlyWeb3 } = useWeb3Context();
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getActiveNameMap(readonlyWeb3)
      .then((map) => {
        if (!cancelled) setNameMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [readonlyWeb3]);

  const result: Record<string, string | null> = {};
  for (const address of addresses) {
    const key = address.toLowerCase();
    result[key] = nameMap[key] ?? null;
  }
  return result;
}
