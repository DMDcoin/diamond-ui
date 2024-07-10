import BigNumber from "bignumber.js";
import styles from "./styles.module.css";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { useStakingContext } from "../../../contexts/StakingContext";
import { Pool } from "../../../contexts/StakingContext/models/model";
import React, { useState, useEffect, useRef, FormEvent } from "react";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const RemoveValidatorModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { removePool, setPools } = useStakingContext();
  const { web3, ensureWalletConnection } = useWeb3Context();

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

    removePool(pool, BigNumber(pool.ownStake).dividedBy(10**18)).then((success: boolean) => {
      closeModal();
    });
  }

  useEffect(() => {
    console.log({pool})
  }, [pool])

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
            <h3>{`Remove node ${pool.stakingAddress}`}</h3>

            <form className={styles.form} onSubmit={handleWithdrawStake}>

              <input
                type="number"
                value={BigNumber(pool.ownStake).dividedBy(10**18).toString()}
                className={styles.formInput}
                onChange={() => {}}
              />

              <p className={styles.unstakeWarning}>
                Only your entire stake in the pool is available for withdrawal.
                Please note, if you remove that pool from the candidate list, a
                new pool can never be setup with the same address that was used
                in the previous pool.
              </p>

              <button className={styles.formSubmit} type="submit" disabled={pool.delegators.length > 0}>
                Remove
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default RemoveValidatorModal;