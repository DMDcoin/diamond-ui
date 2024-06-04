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

  const handleStake = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;
    const amountInWei = web3.utils.toWei(stakeAmount.toString());

    stake(pool, new BigNumber(stakeAmount)).then((success: boolean) => {
    //   if (success) {
    //     setPools((pools) => {
    //       const updatedPools = pools.map((p) => {
    //         if (p.stakingAddress === pool.stakingAddress) {
    //           return {
    //             ...p,
    //             myStake: p.myStake.plus(amountInWei),
    //             totalStake: p.totalStake.plus(amountInWei),
    //           };
    //         }
    //         return p;
    //       });
    //       return updatedPools as Pool[];
    //     });
    //   }

      closeModal();
    });
  }

  return (
    <>
      <button className={styles.tableButton} onClick={(e) => { e.stopPropagation(); openModal(); }}>
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
                Please enter the amount you want to stake
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
