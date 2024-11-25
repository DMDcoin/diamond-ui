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

const UpdatePoolOperatorModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { stake, setPools } = useStakingContext();
  const { web3, ensureWalletConnection, contractsManager } = useWeb3Context();
  const [poolOperator, setPoolOperator] = useState<string>("");
  const [poolOperatorShare, setPoolOperatorShare] = useState<BigNumber | null>(null);

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

  useEffect(() => {
    contractsManager.stContract?.methods.poolNodeOperator(pool.stakingAddress).call().then((operator: string) => {
      setPoolOperator(operator);
    });
    contractsManager.stContract?.methods.poolNodeOperatorShare(pool.stakingAddress).call().then((share: string) => {
      setPoolOperatorShare(new BigNumber(share));
    });
  }, [pool]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();

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
            <h2>Update rewards share</h2>

            <form className={styles.form} onSubmit={handleUpdate}>
              <input
                type="text"
                minLength={42}
                maxLength={42}
                value={poolOperator}
                className={styles.formInput}
                placeholder="Enter pool operator address"
                onChange={(e) => setPoolOperator(e.target.value)}
              />

              <input
                type="number"
                min={0}      // Minimum is 0%
                max={20}     // Maximum is 20%
                step={0.001} // Allows increments of 0.001%
                className={styles.formInput}
                placeholder="Enter pool operator address"
                value={poolOperatorShare ? (poolOperatorShare.div(1000).toNumber().toString() || "") : ""}
                onChange={(e) => {
                  const percentage = parseFloat(e.target.value);
                  const scaledValue = isNaN(percentage) ? null : new BigNumber(percentage * 1000);
                  setPoolOperatorShare(scaledValue);
                }}
              />

              <button className={styles.formSubmit} type="submit">
                Update
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdatePoolOperatorModal;
