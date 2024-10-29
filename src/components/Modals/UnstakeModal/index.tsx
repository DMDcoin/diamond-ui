import BigNumber from "bignumber.js";
import styles from "./styles.module.css";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { useStakingContext } from "../../../contexts/StakingContext";
import { Pool } from "../../../contexts/StakingContext/models/model";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import { toast } from "react-toastify";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const UnstakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [unstakeAmount, setUnstakeAmount] = useState(0);
  const [ownPool, setOwnPool] = useState<boolean>(false);
  const { userWallet, web3, contractsManager, ensureWalletConnection } = useWeb3Context();
  const [canBeOrderedAmount, setCanBeOrderedAmount] = useState<BigNumber>(new BigNumber(0));
  const [canBeUnstakedAmount, setCanBeUnstakedAmount] = useState<BigNumber>(new BigNumber(0));
  const { unstake, setPools, getWithdrawableAmounts, candidateMinStake, delegatorMinStake } = useStakingContext();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    setOwnPool(pool.stakingAddress === userWallet.myAddr);
  }, [userWallet.myAddr, pool.stakingAddress]);

  useEffect(() => {
    if (pool.stakingAddress) fetchWithdrawableAmounts();
  }, [pool]);

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

  const fetchWithdrawableAmounts = async () => {
    getWithdrawableAmounts(pool).then((amounts: any) => {
      setCanBeUnstakedAmount(amounts.maxWithdrawAmount);
      setCanBeOrderedAmount(amounts.maxWithdrawOrderAmount);
    });
  }

  const handleWithdrawStake = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    if (unstakeAmount <= 0) return toast.warn("Cannot unstake 0 DMD 💎");
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
          fetchWithdrawableAmounts();
          return updatedPools as Pool[];
        });
      }

      closeModal();
    });
  }

  const getActionHeading = () => {
    if (ownPool && canBeOrderedAmount.isZero()) {
      return "Unstake DMD";
    } else if (!ownPool && canBeOrderedAmount.isZero()) {
      return `Unstake from ${pool.stakingAddress}`;
    } else if (ownPool && canBeUnstakedAmount.isGreaterThan(0) && canBeOrderedAmount.isGreaterThan(0)) {
      return "Unstake DMD";
    } else if (canBeUnstakedAmount.isGreaterThan(0) && canBeOrderedAmount.isGreaterThan(0)) {
      return `Unstake DMD from ${pool.stakingAddress}`;
    } else if (ownPool && !canBeOrderedAmount.isZero()) {
      return "Order DMD";
    } else {
      return `Order DMD from ${pool.stakingAddress}`;
    }
  };

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
            <h3>{getActionHeading()}</h3>

            <form className={styles.form} onSubmit={handleWithdrawStake}>

              {canBeUnstakedAmount.isZero() ? (
                <span>
                  Amount to be ordered:{" "}
                  {canBeOrderedAmount.minus(ownPool ? candidateMinStake : pool.isActive ? delegatorMinStake : 0).dividedBy(10 ** 18).toFixed(2)} DMD
                </span>
              ) : (
                <span>
                  Amount available to be unstaked:{" "}
                  {canBeUnstakedAmount.minus(ownPool ? candidateMinStake : 0).dividedBy(10 ** 18).toFixed(2)} DMD
                </span>
              )}

              <input
                min={
                  canBeUnstakedAmount.isZero()
                    ? Math.max(0, Math.min(1, Number(canBeOrderedAmount.minus(ownPool ? candidateMinStake : pool.isActive ? delegatorMinStake : 0).dividedBy(10 ** 18).toFixed(0))))
                    : Math.max(0, Math.min(1, Number(canBeUnstakedAmount.minus(ownPool ? candidateMinStake : 0).dividedBy(10 ** 18).toFixed(0))))
                }
                max={
                  canBeUnstakedAmount.isZero()
                  ? Math.max(0, Number(canBeOrderedAmount.minus(ownPool ? candidateMinStake : pool.isActive ? delegatorMinStake : 0).dividedBy(10 ** 18).toFixed(0)))
                  : Math.max(0, Number(canBeUnstakedAmount.minus(ownPool ? candidateMinStake : 0).dividedBy(10 ** 18).toFixed(0)))
                }
                type="number"
                value={unstakeAmount}
                className={styles.formInput}
                placeholder="Enter the amount to unstake"
                onChange={(e) => setUnstakeAmount(Number(e.target.value))}
              />

              {
                !canBeUnstakedAmount.isZero() && (<span>Amount to be ordered: {Math.max(0, Number(canBeOrderedAmount.minus(ownPool ? candidateMinStake : pool.isActive ? delegatorMinStake : 0).dividedBy(10 ** 18).toFixed(2)))} DMD</span>)
              }

              {pool.isActive && canBeUnstakedAmount.isGreaterThan(0) &&
                canBeOrderedAmount.isGreaterThan(0) ? (
                  <p className={styles.unstakeWarning}>
                    Please note, that this node is a part of current Epoch
                    validators set. You can unstake the available amount, and
                    after that it is possible to order the coins to be claimed as
                    soon as Epoch ends.
                  </p>
                ) : (
                  pool.isActive && canBeOrderedAmount.isGreaterThan(0) && (
                    <p className={styles.unstakeWarning}>
                      Please note, that this node is a part of current Epoch
                      validators set. We will prepare the coins, but you need to
                      claim them by clicking 'Claim' as soon as the Epoch ends
                    </p>
                  )
              )}

              <button className={styles.formSubmit} type="submit" disabled={
                canBeUnstakedAmount.isZero()
                ? Math.max(0, canBeOrderedAmount.minus(ownPool ? candidateMinStake : delegatorMinStake).dividedBy(10 ** 18).toNumber()) >= 1 ? false : true
                : Math.max(0, canBeUnstakedAmount.minus(ownPool ? candidateMinStake : 0).dividedBy(10 ** 18).toNumber()) >= 1 ? false : true
              }>
                {canBeUnstakedAmount.isGreaterThan(0) && canBeOrderedAmount.isGreaterThan(0) ? "Unstake" : canBeOrderedAmount.isGreaterThan(0) ? "Order" : "Unstake"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UnstakeModal;