'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BigNumber from 'bignumber.js';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';
import config from '@/lib/config';
import { useWeb3Context } from '@/contexts/Web3';
import { setOwnName } from '@/services/dmdNaming';
import { formatTxError } from '@/utils/web3Errors';
import type { DmdNameAvailabilityResult } from '@/types/dmdNaming';
import { formatDmdAmount, formatDmdName } from '@/utils/dmdNaming';
import ActivateNameModal from './ActivateNameModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  availability?: DmdNameAvailabilityResult | null;
  currentName?: string | null;
  onComplete?: () => void;
};

type PendingStage = 'confirm' | 'mining' | 'stuck' | null;

const STUCK_TX_POLL_MS = 6000;

function isBlockTimeout(err: any): boolean {
  return err?.name === 'TransactionBlockTimeoutError'
    || /not mined within/i.test(String(err?.message ?? ''));
}

export default function RegisterNameModal({
  isOpen,
  onClose,
  name,
  availability,
  currentName,
  onComplete,
}: Props) {
  const {
    contractsManager,
    web3,
    userWallet,
    ensureWalletConnection,
    ensureProviderReady,
    getGasPriceSafe,
    getUpdatedBalance,
  } = useWeb3Context();
  const [pendingStage, setPendingStage] = useState<PendingStage>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [autoActivatedSnapshot, setAutoActivatedSnapshot] = useState<boolean | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [balanceWei, setBalanceWei] = useState<BigNumber | null>(null);
  const txHashRef = useRef<string | null>(null);
  const fullName = formatDmdName(name);
  const willAutoActivate = success ? autoActivatedSnapshot ?? !currentName : !currentName;

  const registrationFee = availability?.registrationFee ?? '—';
  const estimatedGas = availability?.estimatedGas ?? '—';
  const totalCost = availability?.totalEstimatedCost ?? registrationFee;

  const requiredWei = availability?.registrationFeeWei
    ? new BigNumber(availability.registrationFeeWei).plus(availability.estimatedGasWei ?? 0)
    : null;
  const insufficientFunds = !!balanceWei && !!requiredWei && balanceWei.isLessThan(requiredWei);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPendingStage(null);
    setError(null);
    setSuccess(false);
    setActivateOpen(false);
    setAutoActivatedSnapshot(null);
    setTxHash(null);
    setBalanceWei(null);
    txHashRef.current = null;

    // Checked up front so the modal can flag a top-up before the wallet is opened.
    let cancelled = false;
    getUpdatedBalance()
      .then((balance) => {
        if (!cancelled) setBalanceWei(balance);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, name]);

  useEffect(() => {
    if (pendingStage !== 'stuck' || !txHash || !web3) {
      return;
    }

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (cancelled || !receipt) {
          return;
        }

        clearInterval(timer);
        if (receipt.status === true || Number(receipt.status) === 1) {
          toast.success(`${fullName} registered 💎`);
          setPendingStage(null);
          setSuccess(true);
          onComplete?.();
        } else {
          setPendingStage(null);
          setError('The transaction was mined but reverted. Please try again.');
        }
      } catch {}
    }, STUCK_TX_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStage, txHash, web3]);

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = async () => {
    const contract = contractsManager.diamondRegistryContract;
    const from = userWallet.myAddr;
    const valueWei = availability?.registrationFeeWei;

    if (!contract || !from || !valueWei) {
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
    const willAutoActivateThisTx = !currentName;
    setAutoActivatedSnapshot(willAutoActivateThisTx);

    try {
      await setOwnName(contract, web3, from, name, valueWei, getGasPriceSafe, (hash) => {
        txHashRef.current = hash;
        setTxHash(hash);
        setPendingStage('mining');
      });
      toast.success(`${fullName} registered 💎`);
      setPendingStage(null);
      setSuccess(true);
      onComplete?.();
    } catch (err: any) {
      if (isBlockTimeout(err) && txHashRef.current) {
        setPendingStage('stuck');
        return;
      }

      setPendingStage(null);
      const message = formatTxError(
        web3,
        (contract.options.jsonInterface as any[]) || [],
        err,
        'Registration failed. Please try again.',
      );
      setError(message);
      toast.error(message);
    }
  };

  if (success) {
    return (
      <>
        <Modal isOpen={isOpen} onClose={handleClose} closable>
          <div className="dmd-modal dmd-modal-success">
            <div className="dmd-modal-success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            {willAutoActivate ? (
              <>
                <h2>The name &quot;{fullName}&quot; was successfully created and activated automatically.</h2>
                <p>Because this address had no active name yet, the new name became the active name automatically.</p>
                <div className="dmd-modal-notice dmd-modal-notice-success">
                  <i className="fas fa-star"></i>
                  <p>First activation: Free (gas only)</p>
                </div>
              </>
            ) : (
              <>
                <h2>The name &quot;{fullName}&quot; was successfully created.</h2>
                <div className="dmd-modal-notice dmd-modal-notice-warn">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>It is not active yet because another name ({currentName ? formatDmdName(currentName) : 'your current active name'}) owns this address.</p>
                </div>
                <div className="dmd-modal-notice dmd-modal-notice-success">
                  <i className="fas fa-star"></i>
                  <p>Activate this name now? You&apos;ll replace your current active one.</p>
                </div>
              </>
            )}
            <div className="dmd-modal-actions">
              {!willAutoActivate && (
                <button type="button" className="btn-primary" onClick={() => setActivateOpen(true)}>
                  Activate name
                </button>
              )}
              <Link
                href={userWallet.myAddr ? `/dmd-names/${userWallet.myAddr}` : '#'}
                className={willAutoActivate ? 'btn-primary' : 'btn-secondary'}
                onClick={handleClose}
              >
                Go to My DMD Names
              </Link>
              {willAutoActivate && (
                <Link href="/profile" className="btn-secondary" onClick={handleClose}>
                  View Profile
                </Link>
              )}
            </div>
          </div>
        </Modal>
        <ActivateNameModal
          isOpen={activateOpen}
          onClose={() => setActivateOpen(false)}
          name={name}
          currentActiveName={currentName}
          onComplete={() => {
            setActivateOpen(false);
            handleClose();
            onComplete?.();
          }}
        />
      </>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closable={!pendingStage || pendingStage === 'stuck'}>
      <div className="dmd-modal">
        <h2>Create &quot;{fullName}&quot;</h2>

        {pendingStage === 'stuck' ? (
          <>
            <div className="dmd-modal-notice dmd-modal-notice-warn">
              <i className="fas fa-triangle-exclamation"></i>
              <div>
                <p><strong>Transaction stuck — most likely the gas price is too low</strong></p>
                <p>
                  It was sent but not mined within 50 blocks. Open your wallet and either speed it
                  up with a higher gas price or cancel it, then create the name again. Sending
                  another transaction now would queue behind this one and stay pending too.
                </p>
              </div>
            </div>

            <div className="dmd-modal-notice dmd-modal-notice-info">
              <i className="fas fa-circle-info"></i>
              <p>
                This window keeps checking the transaction — if it still gets mined, it finishes
                on its own.
              </p>
            </div>

            <div className="dmd-modal-actions">
              {txHash && (
                <a
                  className="btn-secondary"
                  href={`${config.explorerUrl}tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View transaction <i className="fas fa-external-link-alt"></i>
                </a>
              )}
              <button type="button" className="btn-primary" onClick={handleClose}>
                Close
              </button>
            </div>
          </>
        ) : pendingStage ? (
          <div className="dmd-modal-pending-card">
            <span className="dmd-modal-spinner" aria-hidden="true"></span>
            {pendingStage === 'confirm' ? (
              <div>
                <strong>Confirm in wallet</strong>
                <p>Approve the transaction in your connected wallet to continue.</p>
              </div>
            ) : (
              <div>
                <strong>Minting name</strong>
                <p>Your transaction is pending. You will be notified in your wallet once complete. Do not close the window until the transaction is completed.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <dl className="dmd-modal-fees">
              <div className="dmd-modal-fees-row">
                <dt>Minting fee</dt>
                <dd>{registrationFee}</dd>
              </div>
              <div className="dmd-modal-fees-row">
                <dt>Estimated gas fee</dt>
                <dd>{estimatedGas}</dd>
              </div>
              <div className="dmd-modal-fees-row dmd-modal-fees-row-total">
                <dt>Total estimated cost</dt>
                <dd>{totalCost}</dd>
              </div>
            </dl>

            <div className={`dmd-modal-notice ${willAutoActivate ? 'dmd-modal-notice-info' : 'dmd-modal-notice-warn'}`}>
              <i className={`fas ${willAutoActivate ? 'fa-info-circle' : 'fa-exclamation-triangle'}`}></i>
              <p>
                {willAutoActivate
                  ? 'This address has no active name yet. The new name will be created, and this address will become its active name automatically.'
                  : 'This address already owns another active name. The new name will be created, but it will stay inactive until you activate it.'}
              </p>
            </div>

            {insufficientFunds && (
              <div className="dmd-modal-notice dmd-modal-notice-warn">
                <i className="fas fa-wallet"></i>
                <p>
                  This address holds {formatDmdAmount(web3, balanceWei!.toFixed(0))}, which does not
                  cover the minting fee plus gas ({totalCost}). Top it up before creating the name.
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
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirm}
                disabled={!availability?.registrationFeeWei || insufficientFunds}
              >
                Confirm & Create
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
