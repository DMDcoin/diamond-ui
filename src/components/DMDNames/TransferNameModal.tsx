'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';
import InfoTooltip from '@/components/InfoTooltip';
import { useWeb3Context } from '@/contexts/Web3';
import { getTransferFee, getTransferGasEstimate, transferName } from '@/services/dmdNaming';
import { isValidAddress } from '@/utils/common';
import { formatTxError } from '@/utils/web3Errors';
import { formatDmdName } from '@/utils/dmdNaming';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  isActiveName: boolean;
  onComplete?: () => void;
};

type Estimate = { estimatedGas?: string; totalEstimatedCost?: string };
type PendingStage = 'confirm' | 'mining' | null;

export default function TransferNameModal({ isOpen, onClose, name, isActiveName, onComplete }: Props) {
  const { contractsManager, web3, userWallet, ensureWalletConnection, ensureProviderReady, getGasPriceSafe } = useWeb3Context();
  const [recipient, setRecipient] = useState('');
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [transferFeeWei, setTransferFeeWei] = useState<string | null>(null);
  const [transferFee, setTransferFee] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [pendingStage, setPendingStage] = useState<PendingStage>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [transferredTo, setTransferredTo] = useState('');
  const fullName = formatDmdName(name);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRecipient('');
    setRecipientTouched(false);
    setPendingStage(null);
    setError(null);
    setSuccess(false);
    setEstimate(null);
    setTransferFeeWei(null);
    setTransferFee(null);

    const namesContract = contractsManager.diamondNamesContract;
    if (!namesContract) {
      return;
    }

    getTransferFee(namesContract, web3)
      .then(({ transferFeeWei: feeWei, transferFee: fee }) => {
        setTransferFeeWei(feeWei);
        setTransferFee(fee);
      })
      .catch(() => {
        setTransferFeeWei(null);
        setTransferFee(null);
      });
  }, [isOpen, contractsManager.diamondNamesContract, web3]);

  const recipientIsValid = isValidAddress(recipient);
  const recipientIsSelf = recipientIsValid && userWallet.myAddr?.toLowerCase() === recipient.toLowerCase();
  const recipientError = !recipientTouched
    ? null
    : !recipient
      ? 'Recipient wallet address is required.'
      : !recipientIsValid
        ? 'Enter a valid wallet address.'
        : recipientIsSelf
          ? 'Recipient must be a different address than your own.'
          : null;

  useEffect(() => {
    const registrarContract = contractsManager.diamondRegistryContract;
    const namesContract = contractsManager.diamondNamesContract;
    const from = userWallet.myAddr;

    if (!registrarContract || !namesContract || !from || !transferFeeWei || !recipientIsValid || recipientIsSelf) {
      setEstimate(null);
      return;
    }

    let cancelled = false;
    setLoadingEstimate(true);
    getTransferGasEstimate(registrarContract, namesContract, web3, name, from, recipient, transferFeeWei)
      .then((result) => {
        if (!cancelled) setEstimate(result);
      })
      .catch(() => {
        if (!cancelled) setEstimate(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingEstimate(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recipient, recipientIsValid, recipientIsSelf, transferFeeWei, name, contractsManager.diamondRegistryContract, contractsManager.diamondNamesContract, userWallet.myAddr, web3]);

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = async () => {
    setRecipientTouched(true);

    const registrarContract = contractsManager.diamondRegistryContract;
    const namesContract = contractsManager.diamondNamesContract;
    const from = userWallet.myAddr;

    if (!registrarContract || !namesContract || !from || !transferFeeWei) {
      setError('Wallet not ready. Please reconnect and try again.');
      return;
    }

    if (!recipient || !recipientIsValid || recipientIsSelf) {
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
      await transferName(
        registrarContract,
        namesContract,
        from,
        recipient,
        name,
        transferFeeWei,
        getGasPriceSafe,
        () => setPendingStage('mining'),
      );
      toast.success(`${fullName} transferred 💎`);
      setTransferredTo(recipient);
      setPendingStage(null);
      setSuccess(true);
      onComplete?.();
    } catch (err: any) {
      setPendingStage(null);
      const message = formatTxError(
        web3,
        (namesContract.options.jsonInterface as any[]) || [],
        err,
        'Transfer failed. Please try again.',
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
          <h2>&quot;{fullName}&quot; transferred successfully.</h2>
          <p>The username NFT was transferred to {transferredTo} and removed from your My DMD Names list.</p>
          <div className="dmd-modal-notice dmd-modal-notice-success">
            <i className="fas fa-check-circle"></i>
            <p>Ownership transfer recorded on-chain.</p>
          </div>
          {isActiveName && (
            <div className="dmd-modal-notice dmd-modal-notice-info">
              <i className="fas fa-info-circle"></i>
              <p>Your address no longer has &quot;{fullName}&quot; as the active name. Recipient may optionally activate this name for their address.</p>
            </div>
          )}
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
        <h2>Transfer &quot;{fullName}&quot;</h2>

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
                <strong>Transfer pending</strong>
                <p>
                  You are transferring &quot;{fullName}&quot; to {recipient}. This may take up to 1 minute.
                  Do not close the window until the transaction is completed.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <label className="dmd-form-label" htmlFor="dmd-transfer-recipient">Recipient wallet address</label>
            <input
              id="dmd-transfer-recipient"
              type="text"
              className="dmd-form-input"
              placeholder="0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              onBlur={() => setRecipientTouched(true)}
            />
            {recipientError && <p className="dmd-form-error">{recipientError}</p>}

            <dl className="dmd-modal-fees">
              <div className="dmd-modal-fees-row">
                <dt>
                  Transfer fee{' '}
                  <InfoTooltip content="Fee required to transfer a DMD name to another address. Gas fees are paid separately.">
                    <i className="fas fa-info-circle"></i>
                  </InfoTooltip>
                </dt>
                <dd>{transferFee ?? '…'}</dd>
              </div>
              <div className="dmd-modal-fees-row">
                <dt>
                  Estimated gas fee{' '}
                  <InfoTooltip content="Estimated network fee for executing the transaction. The final amount may vary.">
                    <i className="fas fa-info-circle"></i>
                  </InfoTooltip>
                </dt>
                <dd>{loadingEstimate ? '…' : estimate?.estimatedGas ?? '—'}</dd>
              </div>
              <div className="dmd-modal-fees-row dmd-modal-fees-row-total">
                <dt>Total estimated cost</dt>
                <dd>{loadingEstimate ? '…' : estimate?.totalEstimatedCost ?? (transferFee ?? '—')}</dd>
              </div>
            </dl>

            <div className="dmd-modal-notice dmd-modal-notice-info">
              <i className="fas fa-info-circle"></i>
              <p>This transfer sends the username NFT to the recipient address and removes it from your name list.</p>
            </div>

            {isActiveName && (
              <div className="dmd-modal-notice dmd-modal-notice-warn">
                <i className="fas fa-triangle-exclamation"></i>
                <p>
                  This name is currently your active name. After transfer, your address will lose the active
                  name association. You may activate another owned name later.
                </p>
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
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirm}>
                {error ? 'Try again' : 'Confirm & Transfer'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
