import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./styles.module.css";
import { useWeb3Context } from "../../contexts/Web3Context";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useStakingContext } from "../../contexts/StakingContext";
import { Pool } from "../../contexts/StakingContext/models/model";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const UnstakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [unstakeAmount, setUnstakeAmount] = useState(0);
  const { unstake } = useStakingContext();
  const { ensureWalletConnection } = useWeb3Context();

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

  const handleWithdrawStake = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    // unstake(pool, new BigNumber(unstakeAmount)).then(() => {
    //   // TODO: Refresh the pool data
    // });
  }

  return (
    <>
      <button className={styles.tableButton} onClick={(e) => { e.stopPropagation(); openModal(); }}>
        {buttonText}
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal}>
              &times;
            </button>
            <h2>Unstake DMD</h2>

            <form className={styles.form} onSubmit={handleWithdrawStake}>
              <span>
                Please enter the amount you want to unstake
              </span>

              <input
                min={0}
                max={pool.myStake.toNumber()}
                type="number"
                value={unstakeAmount}
                className={styles.formInput}
                placeholder="Enter the amount to unstake"
                onChange={(e) => setUnstakeAmount(Number(e.target.value))}
              />

              <button className={styles.formSubmit} type="submit">
                Unstake
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UnstakeModal;
