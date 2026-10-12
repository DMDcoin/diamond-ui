'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWeb3Context } from '@/contexts/Web3';
import { useWalletConnect } from '@/contexts/WalletConnect';
import MyDmdNamesContent from '@/components/DMDNames/MyDmdNamesContent';
import '@/components/DMDNames/DmdNames.css';

export default function MyDmdNamesPage() {
  const router = useRouter();
  const params = useParams();
  const routeAddress = typeof params.address === 'string' ? params.address : '';
  const { userWallet } = useWeb3Context();
  const { isConnected } = useWalletConnect();

  useEffect(() => {
    if (!isConnected || !userWallet.myAddr) {
      router.replace('/');
      return;
    }

    if (routeAddress.toLowerCase() !== userWallet.myAddr.toLowerCase()) {
      router.replace(`/dmd-names/${userWallet.myAddr}`);
    }
  }, [isConnected, userWallet.myAddr, routeAddress, router]);

  if (!isConnected || !userWallet.myAddr || routeAddress.toLowerCase() !== userWallet.myAddr.toLowerCase()) {
    return null;
  }

  return (
    <div className="dmd-names-page">
      <section className="dmd-names-hero">
        <div className="cosmic-grid"></div>
        <div className="cosmic-elements">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className="container">
          <div className="dmd-names-hero-content">
            <h1>My DMD Names</h1>
            <p>
              Manage names owned by the connected wallet: activate a public name, renew ownership,
              view history and transfer ownership.
            </p>
          </div>
        </div>
      </section>

      <section className="dmd-names-content">
        <div className="container">
          <MyDmdNamesContent walletAddress={userWallet.myAddr} />
        </div>
      </section>
    </div>
  );
}
