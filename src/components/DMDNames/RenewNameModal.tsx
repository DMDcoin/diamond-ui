'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';
import { useWeb3Context } from '@/contexts/Web3';
import { renewName, getRenewEstimate } from '@/services/dmdNaming';
import { formatTxError } from '@/utils/web3Errors';
import { formatDmdDate, formatDmdName } from '@/utils/dmdNaming';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  currentExpiresAt?: number;
  onComplete?: () => void;
};

type Estimate = { estimatedGas?: string; totalEstimatedCost?: string };
type PendingStage = 'confirm' | 'mining' | null;

export default function RenewNameModal({ isOpen, onClose, name, currentExpiresAt, onComplete }: Props) {
  const { contractsManager, web3, userWallet, ensureWalletConnection, ensureProviderReady, getGasPriceSafe } = useWeb3Context();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [pendingStage, setPendingStage] = useState<PendingStage>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fullName = formatDmdName(name);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPendingStage(null);
    setError(null);
    setSuccess(false);
    setEstimate(null);

    const contract = contractsManager.diamondRegistryContract;
    const from = userWallet.myAddr;
    if (!contract || !from) {
      return;
    }

    setLoadingEstimate(true);
    getRenewEstimate(contract, web3, name, from)
      .then(setEstimate)
      .catch(() => setEstimate(null))
      .finally(() => setLoadingEstimate(false));
  }, [isOpen, name, contractsManager.diamondRegistryContract, userWallet.myAddr, web3]);

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = async () => {
    const contract = contractsManager.diamondRegistryContract;
    const from = userWallet.myAddr;

    if (!contract || !from) {
      setError('Wallet not ready. Please reconnect and try again.');
      return;
    }

    if (!ensureWalletConnection()) {
      return;
    }

    const ready = await ensureProviderReady();
    if (!ready) {
      return;
    }

    setPendingStage('confirm');
    setError(null);

    try {
      await renewName(contract, from, name, getGasPriceSafe, () => setPendingStage('mining'));
      toast.success(`${fullName} renewed 💎`);
      setPendingStage(null);
      setSuccess(true);
      onComplete?.();
    } catch (err: any) {
      setPendingStage(null);
      const message = formatTxError(
        web3,
        (contract.options.jsonInterface as any[]) || [],
        err,
        'Renewal failed. Please try again.',
      );
      setError(message);
      toast.error(message);
    }
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} closable>
        <div className="dmd-modal dmd-modal-success">
          <div className="dmd-modal-success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>&quot;{fullName}&quot; renewed successfully.</h2>
          <p>The 10-year validity window has been reset.</p>
          <p>New expiration: 10 years from the renewal date</p>
          <div className="dmd-modal-notice dmd-modal-notice-success">
            <i className="fas fa-check-circle"></i>
            <p>Keep-alive recorded on-chain.</p>
          </div>
          <div className="dmd-modal-actions">
            <Link
              href={userWallet.myAddr ? `/dmd-names/${userWallet.myAddr}` : '#'}
              className="btn-primary"
              onClick={handleClose}
            >
              Go to My DMD Names
            </Link>
            <Link href={`/names/${name}?from=my-names`} className="btn-secondary" onClick={handleClose}>
              View history
            </Link>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closable={!pendingStage}>
      <div className="dmd-modal">
        <h2>Renew &quot;{fullName}&quot;</h2>

        {pendingStage ? (
          <div className="dmd-modal-pending-card">
            <span className="dmd-modal-spinner" aria-hidden="true"></span>
            {pendingStage === 'confirm' ? (
              <div>
                <strong>Confirm in wallet</strong>
                <p>Approve the transaction in your connected wallet to continue.</p>
              </div>
            ) : (
              <div>
                <strong>Renewal pending</strong>
                <p>You are renewing &quot;{fullName}&quot;. This may take up to 1 minute. Do not close the window until the transaction is completed.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <dl className="dmd-modal-fees">
              <div className="dmd-modal-fees-row">
                <dt>Current expiration</dt>
                <dd>{currentExpiresAt ? formatDmdDate(currentExpiresAt) : '—'}</dd>
              </div>
              <div className="dmd-modal-fees-row">
                <dt>Renewal action</dt>
                <dd>Keep-alive transaction</dd>
              </div>
              <div className="dmd-modal-fees-row">
                <dt>Estimated gas fee</dt>
                <dd>{loadingEstimate ? '…' : estimate?.estimatedGas ?? '—'}</dd>
              </div>
              <div className="dmd-modal-fees-row dmd-modal-fees-row-total">
                <dt>Total estimated cost</dt>
                <dd>{loadingEstimate ? '…' : estimate?.totalEstimatedCost ?? '—'}</dd>
              </div>
            </dl>

            <div className="dmd-modal-notice dmd-modal-notice-info">
              <i className="fas fa-info-circle"></i>
              <p>Renew sends a keep-alive transaction and resets the 10-year validity window from the time of confirmation.</p>
            </div>

            {error && (
              <div className="dmd-modal-notice dmd-modal-notice-warn">
                <i className="fas fa-times-circle"></i>
                <p>{error}</p>
              </div>
            )}

            <div className="dmd-modal-actions">
              <button type="button" className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirm}>
                {error ? 'Try again' : 'Confirm & Renew'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
