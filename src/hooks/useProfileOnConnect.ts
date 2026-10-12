'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWeb3Context } from '@/contexts/Web3';
import { useWalletConnect } from '@/contexts/WalletConnect';

export function useProfileOnConnect() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useWalletConnect();
  const { userWallet } = useWeb3Context();

  const previousStatusRef = useRef(status);
  const pendingRedirectRef = useRef(false);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === 'disconnected') {
      pendingRedirectRef.current = false;
      return;
    }

    if (
      status === 'connected' &&
      (previousStatus === 'connecting' || previousStatus === 'disconnected')
    ) {
      pendingRedirectRef.current = true;
    }

    if (!pendingRedirectRef.current || !userWallet.myAddr) return;

    pendingRedirectRef.current = false;

    if (pathname === '/') {
      router.push('/profile');
    }
  }, [status, userWallet.myAddr, pathname, router]);
}
