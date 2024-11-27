import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./styles.module.css";
import { isValidAddress } from "../../../utils/common";
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
  const [canUpdate, setCanUpdate] = useState(false);
  const [poolOperator, setPoolOperator] = useState<string>("");
  const [poolOperatorShare, setPoolOperatorShare] = useState<BigNumber | null>(null);

  const { ensureWalletConnection } = useWeb3Context();
  const { updatePoolOperatorRewardsShare, canUpdatePoolOperatorRewards } = useStakingContext();

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

  const checks = () => {
    setPoolOperator(pool.poolOperator);
    setPoolOperatorShare(pool.poolOperatorShare);
    canUpdatePoolOperatorRewards(pool).then((res) => {
      setCanUpdate(res)
    });
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    let nOperatorAddress = poolOperator;
    let nOperatorShare = poolOperatorShare;    

    if (nOperatorAddress.length && !isValidAddress(nOperatorAddress)) {
      toast.error("Invalid node operator address");
      return;
    }

    if (nOperatorShare && (nOperatorShare.isLessThan(0) || nOperatorShare.dividedBy(100).isGreaterThan(20))) {
      toast.error("Node operator share must be between 0 and 20%");
      return;
    }

    try {
      await updatePoolOperatorRewardsShare(pool, nOperatorAddress, nOperatorShare || new BigNumber(0));
      closeModal();
    } catch (err) {
      console.log(err);
      toast.error("Error in creating pool");
      closeModal();
    }
  }

  return (
    <>
      <button className="primaryBtn" onClick={(e) => { e.stopPropagation(); openModal(); checks(); }}>
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

              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  min={0}      // Minimum is 0%
                  max={20}     // Maximum is 20%
                  step={0.01} // Allows increments of 0.001%
                  className={styles.nodeOperatorShare}
                  placeholder="Enter pool operator address"
                  value={poolOperatorShare ? (poolOperatorShare.div(100).toNumber().toString() || "") : ""}
                  onChange={(e) => {
                    const percentage = parseFloat(e.target.value);
                    const scaledValue = isNaN(percentage) ? null : new BigNumber(percentage * 100);
                    setPoolOperatorShare(scaledValue);
                  }}
                />

                <span className={styles.percentageSign}>%</span>
              </div>

              {
                !canUpdate ? (
                  <p className={styles.stakeWarning}>
                    You can update the pool operator rewards share only once per Epoch
                  </p>
                ) : (
                  <button className={styles.formSubmit} type="submit">
                    Update
                  </button>
                )
              }
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdatePoolOperatorModal;
