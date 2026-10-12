import ReactDOM from "react-dom";
import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import { Pool } from "@/contexts/types/models";
import { useWeb3Context } from "@/contexts/Web3";
import { truncateAddress } from "@/utils/common";
import styles from "./RemoveValidatorModal.module.css";
import { useStakingContext } from "@/contexts/Staking";
import React, { useState, useEffect, useRef, FormEvent } from "react";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const RemoveValidatorModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { removePool } = useStakingContext();
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

  const handleRemovePool = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;
    if (!confirmed) return toast.warn("You must confirm the irreversible action.");

    const ownStakeDmd = BigNumber(pool.ownStake).dividedBy(10 ** 18);
    removePool(pool, ownStakeDmd).then(() => {
      closeModal();
    });
  };

  const ownStakeDisplay = BigNumber(pool.ownStake).dividedBy(10 ** 18).toString();

  return (
    <>
      <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openModal(); }}>
        {buttonText}
      </button>

      {isOpen && ReactDOM.createPortal(
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal} aria-label="Close modal">
              &times;
            </button>

            <h3 className={styles.headerTitle}>Confirm pool removal</h3>
            <div className={styles.addressLine}>Address: {truncateAddress(pool.stakingAddress)}</div>

            <div className={styles.importantBlock} role="alert">
              <span className={styles.importantIcon} aria-hidden>⚠️</span>
              <span className={styles.importantLabel}>Important:</span>
              <p className={styles.importantText}>You can only remove your entire stake from this pool.</p>
              <p className={styles.importantText}>Once the node is removed from the validator candidate list, neither the miner address nor the wallet address connected to Diamond UI can be reused to create a new pool in the future.</p>
            </div>

            <form className={styles.form} onSubmit={handleRemovePool}>
              <input
                type="number"
                value={ownStakeDisplay}
                className={styles.formInput}
                onChange={() => {}}
                readOnly
              />

              <label className={styles.confirmLabel}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                /> I understand that this action is irreversible and that neither the miner address nor the connected wallet address can be reused for a new pool.
              </label>

              <button className={"btn-primary " + styles.formSubmit} type="submit">
                Remove
              </button>
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") as HTMLElement
      )}
    </>
  );
};

export default RemoveValidatorModal;
