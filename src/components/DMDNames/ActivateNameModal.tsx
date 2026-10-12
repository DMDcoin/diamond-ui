'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';
import { useWeb3Context } from '@/contexts/Web3';
import { activateName, getActivationEstimate, getActivationFeeSchedule } from '@/services/dmdNaming';
import { formatTxError } from '@/utils/web3Errors';
import { formatDmdName } from '@/utils/dmdNaming';
import type { ActivationFeeTier } from '@/types/dmdNaming';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  currentActiveName?: string | null;
  onComplete?: () => void;
};

type Estimate = { feeWei: string; fee: string; estimatedGas?: string; totalEstimatedCost: string };
type PendingStage = 'confirm' | 'mining' | null;

export default function ActivateNameModal({
  isOpen,
  onClose,
  name,
  currentActiveName,
  onComplete,
}: Props) {
  const { contractsManager, web3, userWallet, ensureWalletConnection, ensureProviderReady, getGasPriceSafe } = useWeb3Context();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [feeSchedule, setFeeSchedule] = useState<ActivationFeeTier[] | null>(null);
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
    setFeeSchedule(null);

    const contract = contractsManager.diamondRegistryContract;
    const from = userWallet.myAddr;
    if (!contract || !from) {
      return;
    }

    setLoadingEstimate(true);
    getActivationEstimate(contract, web3, name, from)
      .then(setEstimate)
      .catch(() => setEstimate(null))
      .finally(() => setLoadingEstimate(false));

    getActivationFeeSchedule(contract, web3, from)
      .then(setFeeSchedule)
      .catch(() => setFeeSchedule(null));
  }, [isOpen, name, contractsManager.diamondRegistryContract, userWallet.myAddr, web3]);

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = async () => {
    const contract = contractsManager.diamondRegistryContract;
    const from = userWallet.myAddr;

    if (!contract || !from || !estimate) {
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
      await activateName(contract, from, name, estimate.feeWei, getGasPriceSafe, () => setPendingStage('mining'));
      toast.success(`${fullName} is now active 💎`);
      setPendingStage(null);
      setSuccess(true);
      onComplete?.();
    } catch (err: any) {
      setPendingStage(null);
      const message = formatTxError(
        web3,
        (contract.options.jsonInterface as any[]) || [],
        err,
        'Activation failed. Please try again.',
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
          <h2>The name &quot;{fullName}&quot; is now active.</h2>
          <p>Your active public name has been updated.</p>
          {currentActiveName && (
            <p>
              Previous active name ({formatDmdName(currentActiveName)}) stays owned, but is no longer the active one.
            </p>
          )}
          <div className="dmd-modal-actions">
            <Link
              href={userWallet.myAddr ? `/dmd-names/${userWallet.myAddr}` : '#'}
              className="btn-primary"
              onClick={handleClose}
            >
              Go to My DMD Names
            </Link>
            <Link href="/profile" className="btn-secondary" onClick={handleClose}>
              View Profile
            </Link>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closable={!pendingStage}>
      <div className="dmd-modal">
        <h2>Activate &quot;{fullName}&quot;</h2>

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
                <strong>Activating name</strong>
                <p>You are activating &quot;{fullName}&quot;. This may take up to 1 minute. Do not close the window until the transaction is completed.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="dmd-modal-notice dmd-modal-notice-info">
              <i className="fas fa-info-circle"></i>
              <p>Activating this name will replace your current active name. Only one active name is allowed per address.</p>
            </div>

            <dl className="dmd-modal-fees">
              <div className="dmd-modal-fees-row">
                <dt>Activation fee</dt>
                <dd>{loadingEstimate ? '…' : estimate?.fee ?? '—'}</dd>
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

            {feeSchedule && (
              <div className="dmd-fee-schedule">
                <h4>Activation fee schedule</h4>
                <dl>
                  {feeSchedule.map((tier) => (
                    <div
                      key={tier.label}
                      className={`dmd-fee-schedule-row${tier.isCurrent ? ' dmd-fee-schedule-row--current' : ''}`}
                    >
                      <dt>{tier.label}</dt>
                      <dd>{tier.amount}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {error && (
              <div className="dmd-modal-notice dmd-modal-notice-warn">
                <i className="fas fa-times-circle"></i>
                <p>{error}</p>
              </div>
            )}

            <div className="dmd-modal-actions">
              <button type="button" className="btn-secondary" onClick={handleClose}>
                Later
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirm}
                disabled={loadingEstimate || !estimate}
              >
                {error ? 'Try again' : 'Activate'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
