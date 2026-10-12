'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useWeb3Context } from '@/contexts/Web3';
import { getWalletDmdName } from '@/services/dmdNaming';
import type { DmdNameAvailabilityResult } from '@/types/dmdNaming';
import DmdNameSearch from './DmdNameSearch';
import RegisterNameModal from './RegisterNameModal';

export default function DmdNameSearchWidget() {
  const { contractsManager, userWallet, web3Initialized } = useWeb3Context();
  const walletAddress = userWallet.myAddr;

  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerAvailability, setRegisterAvailability] = useState<DmdNameAvailabilityResult | null>(null);
  const [searchResetKey, setSearchResetKey] = useState(0);

  const reloadRegisteredName = useCallback(() => {
    const contract = contractsManager.diamondRegistryContract;
    if (!web3Initialized || !contract || !walletAddress) {
      setRegisteredName(null);
      return;
    }

    getWalletDmdName(contract, walletAddress).then(setRegisteredName).catch(() => setRegisteredName(null));
  }, [contractsManager.diamondRegistryContract, walletAddress, web3Initialized]);

  useEffect(() => {
    reloadRegisteredName();
  }, [reloadRegisteredName]);

  const openRegister = (name: string, availability: DmdNameAvailabilityResult) => {
    setRegisterName(name);
    setRegisterAvailability(availability);
    setRegisterOpen(true);
  };

  const handleRegistered = () => {
    reloadRegisteredName();
    setSearchResetKey((key) => key + 1);
  };

  return (
    <div className="dmd-search-widget">
      <h3>
        Search DMD names <span className="dmd-new-badge">NEW</span>
      </h3>
      <p>Find the perfect .dmd name for your identity, project or brand.</p>
      <DmdNameSearch
        key={searchResetKey}
        variant="homepage"
        showExamples={false}
        onRegisterName={walletAddress ? openRegister : undefined}
      />
      <p className="dmd-search-widget-note">
        <i className="fas fa-info-circle"></i>
        <span>DMD names are unique, blockchain-native identities on the DMD network.</span>
        <Link href="/names" className="dmd-search-widget-note-link">
          DMD Names <i className="fas fa-external-link-alt"></i>
        </Link>
      </p>

      <RegisterNameModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        name={registerName}
        availability={registerAvailability}
        currentName={registeredName}
        onComplete={handleRegistered}
      />
    </div>
  );
}
