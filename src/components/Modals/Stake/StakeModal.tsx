import BigNumber from "bignumber.js";
import styles from "./StakeModal.module.css";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import { Pool } from "@/contexts/types/models";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import { toast } from 'react-toastify';
import ReactDOM from "react-dom";
import { formatDmdFromWei } from "@/utils/format";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const StakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const { stake, setPools, delegatorMinStake } = useStakingContext();
  const { updateWalletBalance, ensureWalletConnection, userWallet } = useWeb3Context();
  const [maxStakeAmount, setMaxStakeAmount] = useState(0);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    try {
      const maxUserBalance = userWallet.myBalance || new BigNumber(0); // in wei
      const maxPoolTotalWei = new BigNumber(50000).multipliedBy(10 ** 18);
      const remainingPoolWei = maxPoolTotalWei.minus(pool.totalStake || new BigNumber(0));
      const mStakeAmountWei = maxUserBalance.isGreaterThan(remainingPoolWei) ? remainingPoolWei : maxUserBalance;
      const mStakeAmountDmd = mStakeAmountWei.dividedBy(10 ** 18);
      setMaxStakeAmount(Number(mStakeAmountDmd.toFixed(4, BigNumber.ROUND_DOWN)));
    } catch (err) {
      setMaxStakeAmount(0);
    }
  }, [pool, userWallet.myAddr, userWallet.myBalance]);

  const calculateMaxStakeable = (): BigNumber => {
    const walletBalanceWei = userWallet.myBalance || new BigNumber(0);
    const walletBalanceDmd = walletBalanceWei.dividedBy(10 ** 18);
    const currentValidatorStakeDmd = (pool.totalStake || new BigNumber(0)).dividedBy(10 ** 18);
    const remaining = new BigNumber(50000).minus(currentValidatorStakeDmd);
    if (remaining.isLessThanOrEqualTo(0)) return new BigNumber(0);
    return walletBalanceDmd.isGreaterThan(remaining) ? remaining.decimalPlaces(18, BigNumber.ROUND_DOWN) : walletBalanceDmd.decimalPlaces(18, BigNumber.ROUND_DOWN);
  }

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleStake = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    if (!stakeAmount || stakeAmount === '') {
      toast.warn('Please enter a valid stake amount');
      return;
    }

    stake(pool, new BigNumber(stakeAmount)).then((success: boolean) => {
      updateWalletBalance();
      closeModal();
    });
  };

  const handleFillMax = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!ensureWalletConnection()) return;

    const maxAmount = calculateMaxStakeable();
    if (maxAmount.isLessThanOrEqualTo(0)) {
      if ((userWallet.myBalance || new BigNumber(0)).isZero()) {
        toast.warn('Wallet balance is zero. Nothing to stake.');
      } else {
        toast.warn('Validator already has maximum stake (50,000 DMD) or no stakeable amount available.');
      }
      return;
    }

    setStakeAmount(maxAmount.toString(10));
  }

  // Determine whether the Stake button should be disabled based on minimum and maximum stake rules.
  const stakeAmountWei = stakeAmount && stakeAmount !== '' ? new BigNumber(stakeAmount).multipliedBy(new BigNumber(10).pow(18)) : new BigNumber(0);
  const poolMyStakeWei = pool.myStake || new BigNumber(0);
  const poolTotalStakeWei = pool.totalStake || new BigNumber(0);
  const poolMaxCapWei = new BigNumber(50000).multipliedBy(new BigNumber(10).pow(18));
  const minDelegatorStakeWei = delegatorMinStake || new BigNumber(0);
  const isBelowDelegatorMin = new BigNumber(poolMyStakeWei).plus(stakeAmountWei).isLessThan(minDelegatorStakeWei);
  const isAbovePoolMax = new BigNumber(poolTotalStakeWei).plus(stakeAmountWei).isGreaterThan(poolMaxCapWei);
  const remainingToPoolMaxWei = new BigNumber(poolMaxCapWei).minus(poolTotalStakeWei).isGreaterThan(0) ? poolMaxCapWei.minus(poolTotalStakeWei) : new BigNumber(0);
  const remainingToPoolMaxDmd = formatDmdFromWei(remainingToPoolMaxWei, { unit: false });
  const isStakeButtonDisabled = !stakeAmount || stakeAmount === '' || new BigNumber(stakeAmount).isLessThanOrEqualTo(0) || isBelowDelegatorMin || isAbovePoolMax;
  const minDelegatorStakeDmd = formatDmdFromWei(minDelegatorStakeWei, { unit: false });

  return (
    <>
      <button className="btn-stake" onClick={(e) => { e.stopPropagation(); openModal(); }}>
        {buttonText}
      </button>

      {isOpen && ReactDOM.createPortal(
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal}>
              &times;
            </button>
            <h2>Stake DMD</h2>

            <form className={styles.form} onSubmit={handleStake}>
              <span className={styles.spanLeft}>
                Please enter the amount you want to stake
              </span>

              <div className={styles.inputWrapper}>
                <input
                  min={1}
                  max={calculateMaxStakeable().toString(10)}
              step="any"
              type="number"
              value={stakeAmount || ''}
              className={styles.formInput}
              placeholder="Enter the amount to stake"
              onChange={(e) => setStakeAmount(e.target.value)}
                />

                <button
                  type="button"
                  className={styles.maxButton}
                  onClick={(e) => { e.stopPropagation(); handleFillMax(e); }}
                  aria-label="Fill max amount"
                >
                  max
                </button>
              </div>

              <span className={styles.spanLeft}>Your wallet balance: {formatDmdFromWei(userWallet.myBalance)}</span>

              {stakeAmount && stakeAmount !== '' && isAbovePoolMax ? (
                <span className={styles.disabledNotice}>
                  The entered amount would make the validator exceed 50,000 DMD. You can stake up to {remainingToPoolMaxDmd} DMD.
                </span>
              ) : stakeAmount && stakeAmount !== '' && isBelowDelegatorMin ? (
                <span className={styles.disabledNotice}>
                  The entered amount is below the minimum required to stake {minDelegatorStakeDmd} DMD.
                </span>
              ) : null}

              {
                pool.isActive && (
                  <span className={styles.stakeWarning}>
                    Note: These coins will become active in the next epoch, as the validator candidate is part of the current active set. You may unstake at any time before activation if you change your mind.
                  </span>
                )
              }

              <div className={styles.formActions}>
                <button
                  className={"btn-primary " + styles.formSubmit}
                  type="submit"
                  disabled={isStakeButtonDisabled}
                  title={isStakeButtonDisabled ? (isAbovePoolMax ? `Validator cap reached: you can stake up to ${remainingToPoolMaxDmd} DMD` : isBelowDelegatorMin ? `Minimum total stake per delegator is ${minDelegatorStakeDmd} DMD` : undefined) : undefined}
                >
                  Stake
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") as HTMLElement
      )}
    </>
  );
};

export default StakeModal;
