'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWeb3Context } from '@/contexts/Web3';
import DmdNameSearch from './DmdNameSearch';
import OwnedNamesSection from './OwnedNamesSection';
import RegisterNameModal from './RegisterNameModal';
import { getWalletDmdName } from '@/services/dmdNaming';
import type { DmdNameAvailabilityResult } from '@/types/dmdNaming';

type Props = {
  walletAddress: string;
};

export default function MyDmdNamesContent({ walletAddress }: Props) {
  const { contractsManager, web3Initialized } = useWeb3Context();
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerAvailability, setRegisterAvailability] = useState<DmdNameAvailabilityResult | null>(null);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [ownedRefreshKey, setOwnedRefreshKey] = useState(0);
  const [pendingName, setPendingName] = useState<string | null>(null);

  const reloadRegisteredName = useCallback(() => {
    const contract = contractsManager.diamondRegistryContract;
    if (!web3Initialized || !contract) {
      setRegisteredName(null);
      return;
    }

    getWalletDmdName(contract, walletAddress).then(setRegisteredName);
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
    setPendingName(registerName);
    setOwnedRefreshKey((key) => key + 1);
  };

  return (
    <>
      <div className="dmd-names-search-card">
        <DmdNameSearch key={searchResetKey} variant="page" showExamples onRegisterName={openRegister} />
      </div>

      <OwnedNamesSection
        walletAddress={walletAddress}
        activeName={registeredName}
        refreshKey={ownedRefreshKey}
        pendingName={pendingName}
      />

      <RegisterNameModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        name={registerName}
        availability={registerAvailability}
        currentName={registeredName}
        onComplete={handleRegistered}
      />
    </>
  );
}
