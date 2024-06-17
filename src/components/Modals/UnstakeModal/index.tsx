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

const UnstakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { unstake, setPools } = useStakingContext();
  const [unstakeAmount, setUnstakeAmount] = useState(0);
  const [ownPool, setOwnPool] = useState<boolean>(false);
  const { userWallet, web3, ensureWalletConnection } = useWeb3Context();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    setOwnPool(pool.stakingAddress === userWallet.myAddr);
  }, [userWallet.myAddr, pool.stakingAddress]);

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
    const amountInWei = web3.utils.toWei(unstakeAmount.toString());

    unstake(pool, new BigNumber(unstakeAmount)).then((success: boolean) => {
      if (success) {
        setPools((pools) => {
          const updatedPools = pools.map((p) => {
            if (p.stakingAddress === pool.stakingAddress) {
              return {
                ...p,
                myStake: BigNumber(p.myStake).minus(amountInWei),
                totalStake: BigNumber(p.totalStake).minus(amountInWei),
              };
            }
            return p;
          });
          return updatedPools as Pool[];
        });
      }

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
            <h3>{ ownPool ? "Unstake DMD" : `Unstake from ${pool.stakingAddress}` }</h3>

            <form className={styles.form} onSubmit={handleWithdrawStake}>
              <span>
                Please enter the amount you want to unstake
              </span>

              <input
                max={pool.myStake.toNumber()}
                type="number"
                value={unstakeAmount}
                className={styles.formInput}
                placeholder="Enter the amount to unstake"
                onChange={(e) => setUnstakeAmount(Number(e.target.value))}
              />

              {
                pool.isCurrentValidator && ownPool ? (
                  <p className={styles.unstakeWarning}>
                    Please note that you are part of current Epoch's validators. Unstaked coins will need to be claimed by clicking on the "Claim" button after the current Epoch ends.
                  </p>
                ) : pool.isCurrentValidator && (
                  <p className={styles.unstakeWarning}>
                    Please note that this node is part of current Epoch's validators. Unstaked coins will need to be claimed by clicking on the "Claim" button after the current Epoch ends.
                  </p>
                )
              }

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
