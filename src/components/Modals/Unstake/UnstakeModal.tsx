import BigNumber from "bignumber.js";
import styles from "./UnstakeModal.module.css";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import { Pool } from "@/contexts/types/models";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import { truncateAddress } from "@/utils/common";
import { formatDmd, formatDmdFromWei } from "@/utils/format";
import { isOrderClaimable } from "@/components/OrderedStakeTag";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const UnstakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [ownPool, setOwnPool] = useState<boolean>(false);
  const { userWallet, web3, contractsManager, ensureWalletConnection } = useWeb3Context();
  const [canBeOrderedAmount, setCanBeOrderedAmount] = useState<BigNumber>(new BigNumber(0));
  const [canBeUnstakedAmount, setCanBeUnstakedAmount] = useState<BigNumber>(new BigNumber(0));
  const { unstake, setPools, getWithdrawableAmounts, candidateMinStake, delegatorMinStake, stakingEpoch, claimOrderedUnstake } = useStakingContext();

  const orderedWei = BigNumber(pool.orderedWithdrawAmount ?? 0);
  const isClaimable = isOrderClaimable(pool, stakingEpoch);
  const hasUnstakable = canBeUnstakedAmount.isGreaterThan(0) || canBeOrderedAmount.isGreaterThan(0);
  const showUnstakeFields = !isClaimable || hasUnstakable;
  const hasAmount = hasUnstakable && BigNumber(unstakeAmount).isGreaterThan(0);
  const unstakeVerb = canBeUnstakedAmount.isGreaterThan(0) || canBeOrderedAmount.isZero() ? "unstake" : "order";

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

    if (isClaimable) {
      if (hasAmount && !isValidUnstakeAmount(unstakeAmount)) return;
      const claimed = await claimOrderedUnstake(pool);
      if (!claimed) return;
      if (!hasAmount) return closeModal();
    }

    await performUnstake(unstakeAmount);
  }

  const isValidUnstakeAmount = (amountNumber: string): boolean => {
    if (!BigNumber(amountNumber).isGreaterThan(0)) {
      toast.warn("Cannot unstake 0 DMD 💎");
      return false;
    }
    const amountInWei = web3.utils.toWei(amountNumber.toString());

    if (canBeUnstakedAmount.isZero()) {
      const remainingStake = canBeOrderedAmount.minus(amountInWei);

      if (BigNumber(amountInWei).isGreaterThan(canBeOrderedAmount)) {
        toast.warn(`Cannot order more than ${formatDmdFromWei(canBeOrderedAmount)}`);
        return false;
      }

      if (
        !BigNumber(amountInWei).isEqualTo(canBeOrderedAmount) && remainingStake.isLessThan(delegatorMinStake)
      ) {
        toast.warn(`Ordered amount is invalid. You must order the full amount or leave at least the minimum stake of ${formatDmdFromWei(delegatorMinStake)}.`);
        return false;
      }
    } else {
      const remainingStake = canBeUnstakedAmount.minus(amountInWei);

      if (BigNumber(amountInWei).isGreaterThan(canBeUnstakedAmount)) {
        toast.warn(`Cannot unstake more than ${formatDmdFromWei(canBeUnstakedAmount)}`);
        return false;
      }

      if (
        !BigNumber(amountInWei).isEqualTo(canBeUnstakedAmount) && remainingStake.isLessThan(ownPool ? candidateMinStake : delegatorMinStake)
      ) {
        toast.warn(`Unstake amount is invalid. You must unstake the full amount or leave at least the minimum stake of ${formatDmdFromWei(ownPool ? candidateMinStake : delegatorMinStake)}.`);
        return false;
      }
    }

    return true;
  }

  const performUnstake = async (amountNumber: string) => {
    if (!isValidUnstakeAmount(amountNumber)) return;
    const amountInWei = web3.utils.toWei(amountNumber.toString());

    unstake(pool, new BigNumber(amountNumber)).then((success: boolean) => {
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
    if (isClaimable && !hasUnstakable) {
      return ownPool ? "Claim DMD" : `Claim DMD from ${truncateAddress(pool.stakingAddress)}`;
    } else if (ownPool && canBeOrderedAmount.isZero()) {
      return "Unstake DMD";
    } else if (!ownPool && canBeOrderedAmount.isZero()) {
      return `Unstake from ${truncateAddress(pool.stakingAddress)}`;
    } else if (ownPool && canBeUnstakedAmount.isGreaterThan(0) && canBeOrderedAmount.isGreaterThan(0)) {
      return "Unstake DMD";
    } else if (canBeUnstakedAmount.isGreaterThan(0) && canBeOrderedAmount.isGreaterThan(0)) {
      return `Unstake DMD from ${truncateAddress(pool.stakingAddress)}`;
    } else if (ownPool && !canBeOrderedAmount.isZero()) {
      return "Order DMD";
    } else {
      return `Order DMD from ${truncateAddress(pool.stakingAddress)}`;
    }
  };

  const lockedAmountDmd = ownPool
    ? BigNumber.maximum(0, canBeOrderedAmount.minus(candidateMinStake)).dividedBy(10 ** 18)
    : BigNumber.maximum(0, canBeOrderedAmount.dividedBy(10 ** 18));

  const availableUnstakableDmd = ownPool
    ? BigNumber.maximum(0, canBeUnstakedAmount.minus(candidateMinStake)).dividedBy(10 ** 18)
    : BigNumber.maximum(0, canBeUnstakedAmount.dividedBy(10 ** 18));

  return (
    <>
      <button className="btn-unstake" onClick={(e) => { e.stopPropagation(); openModal(); }}>
        {buttonText}
      </button>

      {isOpen && ReactDOM.createPortal(
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal}>
              &times;
            </button>
            <h3>{getActionHeading()}</h3>

            <form className={styles.form} onSubmit={handleWithdrawStake}>

              {isClaimable && (
                <div className={styles.claimReady}>
                  <i className="fas fa-circle-check" aria-hidden="true"></i>
                  <span><strong>{formatDmdFromWei(orderedWei)}</strong> ready to claim</span>
                </div>
              )}

              {showUnstakeFields && (<>
                {canBeUnstakedAmount.isZero() ? (
                  lockedAmountDmd.isGreaterThan(0) && (
                    <span className={styles.zeroPadding} data-tooltip="This amount is currently locked in an active Epoch and cannot be unstaked right now. You can pre-order an unstake, and it will become claimable after the Epoch ends.">
                      Locked : {formatDmd(lockedAmountDmd)}
                    </span>
                  )
                ) : (
                  <span className={styles.zeroPadding} data-tooltip="This is the amount of DMD that can be unstaked and claimed immediately because it is not currently active in an Epoch.">
                    Available for immediate unstaking: {formatDmd(availableUnstakableDmd)}
                  </span>
                )}

                {
                  !canBeUnstakedAmount.isZero() && lockedAmountDmd.isGreaterThan(0) && (
                    <span className={styles.zeroPadding} data-tooltip="This amount is currently locked in an active Epoch and cannot be unstaked right now. You can pre-order an unstake, and it will become claimable after the Epoch ends.">Locked: {formatDmd(lockedAmountDmd)}</span>
                  )
                }

                {!isClaimable && orderedWei.isGreaterThan(0) && (
                  <span className={styles.zeroMargin + " " + styles.zeroPadding}>
                    Amount already ordered: {formatDmdFromWei(orderedWei)}
                  </span>
                )}

                <div className={styles.inputWrapper}>
                  <input
                    min={
                      canBeUnstakedAmount.isZero()
                        ? BigNumber.maximum(0, BigNumber.minimum(1, canBeOrderedAmount.dividedBy(10 ** 18))).toString()
                        : BigNumber.maximum(0, BigNumber.minimum(1, canBeUnstakedAmount.dividedBy(10 ** 18))).toString()
                    }
                    max={
                      ownPool ? 
                      canBeUnstakedAmount.isGreaterThan(0) ? BigNumber.maximum(0, Number(canBeUnstakedAmount.minus(candidateMinStake).dividedBy(10**18))).toString() : BigNumber.maximum(0, Number(canBeOrderedAmount.minus(candidateMinStake).dividedBy(10**18))).toString()
                      : canBeUnstakedAmount.isGreaterThan(0) ? canBeUnstakedAmount.dividedBy(10**18).toString() : canBeOrderedAmount.dividedBy(10**18).toString()
                    }
                    type="number"
                    step="any"
                    value={unstakeAmount || ''}
                    className={styles.formInput}
                    placeholder={
                      (canBeUnstakedAmount.isGreaterThan(0)
                        ? "Enter the amount to unstake"
                        : canBeOrderedAmount.isGreaterThan(0)
                        ? "Enter the amount to order unstake"
                        : "Enter the amount to unstake") + (isClaimable ? " (optional)" : "")
                    }
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                  />

                  <button
                    type="button"
                    className={styles.maxButton}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      let amountWei: BigNumber;

                      if (canBeUnstakedAmount.isZero()) {
                        // When nothing can be unstaked immediately (order)
                        amountWei = ownPool
                          ? BigNumber.maximum(0, canBeOrderedAmount.minus(candidateMinStake))
                          : canBeOrderedAmount;
                      } else {
                        // When some can be unstaked immediately
                        amountWei = ownPool
                          ? BigNumber.maximum(0, canBeUnstakedAmount.minus(candidateMinStake))
                          : canBeUnstakedAmount;
                      }

                      const amountDmdBn = amountWei.dividedBy(10 ** 18).decimalPlaces(18, BigNumber.ROUND_DOWN);
                      setUnstakeAmount(amountDmdBn.toString(10));
                    }}
                    aria-label="Fill max amount"
                  >
                    max
                  </button>
                </div>

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
                        Note: This node is currently part of the active validator
                        set for this Epoch, so unstaking is not immediately
                        possible. However, you can place an unstake order now. The
                        coins will be prepared and frozen in the contract, and
                        you’ll be able to claim them by clicking ‘Unstake’ once the
                        Epoch ends.
                      </p>
                    )
                )}
              </>)}

              {isClaimable && hasAmount && (
                <p className={styles.claimNote}>
                  Claim and {unstakeVerb} are sent as two separate transactions.
                </p>
              )}

              <button className={"btn-primary " + styles.formSubmit} type="submit" disabled={!isClaimable && !hasUnstakable}>
                {isClaimable
                  ? hasAmount ? `Claim & ${unstakeVerb}` : "Claim"
                  : canBeUnstakedAmount.isGreaterThan(0) && canBeOrderedAmount.isGreaterThan(0) ? "Unstake" : canBeOrderedAmount.isGreaterThan(0) ? "Order" : "Unstake"}
              </button>
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") as HTMLElement
      )}
    </>
  );
};

export default UnstakeModal;
