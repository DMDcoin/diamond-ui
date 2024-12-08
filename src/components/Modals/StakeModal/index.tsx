import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./styles.module.css";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { useStakingContext } from "../../../contexts/StakingContext";
import { Pool } from "../../../contexts/StakingContext/models/model";
import React, { useState, useEffect, useRef, FormEvent } from "react";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const StakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [stakeAmount, setStakeAmount] = useState(0);
  const { stake, setPools } = useStakingContext();
  const { updateWalletBalance, ensureWalletConnection, userWallet } = useWeb3Context();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

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

    stake(pool, new BigNumber(stakeAmount)).then((success: boolean) => {
      updateWalletBalance();
      closeModal();
    });
  }

  return (
    <>
      <button className="primaryBtn" onClick={(e) => { e.stopPropagation(); openModal(); }}>
        {buttonText}
      </button>

      {isOpen && (
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal}>
              &times;
            </button>
            <h2>Stake DMD</h2>

            <form className={styles.form} onSubmit={handleStake}>
                <span>
                  Please enter the amount you want to stake (Available {userWallet.myBalance.dividedBy(10**18).toFixed(2)} DMD)
                </span>
              <input
                // min={0}
                // max={pool.myStake.toNumber()}
                type="number"
                value={stakeAmount}
                className={styles.formInput}
                placeholder="Enter the amount to stake"
                onChange={(e) => setStakeAmount(Number(e.target.value))}
              />

              {
                pool.isActive && (
                  <span className={styles.stakeWarning}>
                    Please note that these coins will become active in the next epoch, as the validator candidate is part of an active set. You can unstake them at any time before they become active
                  </span>
                )
              }

              <button className={styles.formSubmit} type="submit">
                Stake
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default StakeModal;
