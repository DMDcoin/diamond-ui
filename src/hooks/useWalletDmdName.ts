'use client';

import { useEffect, useState } from 'react';
import { useWeb3Context } from '@/contexts/Web3';
import { getWalletDmdName } from '@/services/dmdNaming';

export function useWalletDmdName(): string | null {
  const { contractsManager, userWallet, web3Initialized } = useWeb3Context();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const contract = contractsManager.diamondRegistryContract;
    if (!web3Initialized || !userWallet.myAddr || !contract) {
      setName(null);
      return;
    }

    let cancelled = false;
    getWalletDmdName(contract, userWallet.myAddr).then((resolved) => {
      if (!cancelled) {
        setName(resolved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contractsManager.diamondRegistryContract, userWallet.myAddr, web3Initialized]);

  return name;
}
