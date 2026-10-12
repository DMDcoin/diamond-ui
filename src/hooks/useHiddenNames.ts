'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dmd-locally-hidden-names';

function readStoredNames(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function useHiddenNames() {
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHiddenNames(readStoredNames());
  }, []);

  const hideName = useCallback((name: string) => {
    setHiddenNames((current) => {
      const next = new Set(current).add(name);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const unhideName = useCallback((name: string) => {
    setHiddenNames((current) => {
      const next = new Set(current);
      next.delete(name);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const isLocallyHidden = useCallback((name: string) => hiddenNames.has(name), [hiddenNames]);

  return { hiddenNames, hideName, unhideName, isLocallyHidden };
}
