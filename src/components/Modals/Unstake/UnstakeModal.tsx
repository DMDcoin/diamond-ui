import BigNumber from "bignumber.js";
import styles from "./UnstakeModal.module.css";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import { Pool } from "@/contexts/types/models";
import React, { useState, useEffect, useRef, useId, FormEvent } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import { truncateAddress } from "@/utils/common";
import { formatDmd, formatDmdFromWei } from "@/utils/format";
import { formatDmdName } from "@/utils/dmdNaming";
import { isOrderClaimable } from "@/components/OrderedStakeTag";
import { useDmdNamesForAddresses } from "@/hooks/useDmdNamesForAddresses";

interface ModalProps {
  buttonText: string;
  pool: Pool;
}

const ValidatorName: React.FC<{ address: string }> = ({ address }) => {
  const names = useDmdNamesForAddresses([address]);
  const name = names[address.toLowerCase()];
  return <>{name ? formatDmdName(name) : truncateAddress(address)}</>;
};

const SummaryRow: React.FC<{ label: string; wei: BigNumber; total?: boolean }> = ({ label, wei, total }) => (
  <div className={total && wei.isGreaterThan(0) ? `${styles.summaryRow} ${styles.summaryTotal}` : styles.summaryRow}>
    <span>{label}</span>
    <span>{formatDmdFromWei(wei)}</span>
  </div>
);

const UnstakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const amountInputId = useId();
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [addUnstake, setAddUnstake] = useState<boolean>(false);
  const [ownPool, setOwnPool] = useState<boolean>(false);
  const { userWallet, web3, contractsManager, ensureWalletConnection } = useWeb3Context();
  const [canBeOrderedAmount, setCanBeOrderedAmount] = useState<BigNumber>(new BigNumber(0));
  const [canBeUnstakedAmount, setCanBeUnstakedAmount] = useState<BigNumber>(new BigNumber(0));
  const [amountsLoaded, setAmountsLoaded] = useState<boolean>(false);
  const { unstake, setPools, getWithdrawableAmounts, candidateMinStake, delegatorMinStake, stakingEpoch, claimOrderedUnstake } = useStakingContext();

  const orderedWei = BigNumber(pool.orderedWithdrawAmount ?? 0);
  const isClaimable = isOrderClaimable(pool, stakingEpoch);
  const isLoading = !amountsLoaded && !isClaimable;
  const isPending = !isClaimable && orderedWei.isGreaterThan(0);
  const hasUnstakable = canBeUnstakedAmount.isGreaterThan(0) || canBeOrderedAmount.isGreaterThan(0);
  const isOrder = canBeUnstakedAmount.isZero() && canBeOrderedAmount.isGreaterThan(0);
  const showUnstakeFields = hasUnstakable && (!isClaimable || addUnstake);
  const hasAmount = showUnstakeFields && BigNumber(unstakeAmount).isGreaterThan(0);
  const unstakeVerb = isOrder ? "order" : "unstake";

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
      setAmountsLoaded(true);
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

  const lockedAmountDmd = ownPool
    ? BigNumber.maximum(0, canBeOrderedAmount.minus(candidateMinStake)).dividedBy(10 ** 18)
    : BigNumber.maximum(0, canBeOrderedAmount.dividedBy(10 ** 18));

  const availableUnstakableDmd = ownPool
    ? BigNumber.maximum(0, canBeUnstakedAmount.minus(candidateMinStake)).dividedBy(10 ** 18)
    : BigNumber.maximum(0, canBeUnstakedAmount.dividedBy(10 ** 18));

  const maxInputAmount = ownPool
    ? canBeUnstakedAmount.isGreaterThan(0) ? BigNumber.maximum(0, Number(canBeUnstakedAmount.minus(candidateMinStake).dividedBy(10**18))).toString() : BigNumber.maximum(0, Number(canBeOrderedAmount.minus(candidateMinStake).dividedBy(10**18))).toString()
    : canBeUnstakedAmount.isGreaterThan(0) ? canBeUnstakedAmount.dividedBy(10**18).toString() : canBeOrderedAmount.dividedBy(10**18).toString();

  const isOverMax = hasAmount && BigNumber(unstakeAmount).isGreaterThan(maxInputAmount);
  const enteredWei = hasAmount && !isOverMax ? BigNumber(unstakeAmount).multipliedBy(10 ** 18) : new BigNumber(0);
  const receiveNowWei = (isClaimable ? orderedWei : new BigNumber(0)).plus(isOrder ? 0 : enteredWei);
  const remainingStakeWei = BigNumber.maximum(0, BigNumber(pool.myStake ?? 0).minus(enteredWei));
  const showOrderSummary = showUnstakeFields && isOrder;

  const amountLabel = isOrder
    ? "Amount to order (DMD)"
    : isClaimable ? "Additional amount (DMD)" : "Amount to unstake (DMD)";

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
            <div className={styles.modalHeader}>
              <h3>Unstake DMD</h3>
              <p className={styles.modalSubtitle}>
                Validator <ValidatorName address={pool.stakingAddress} />
              </p>
            </div>

            <form className={styles.form} onSubmit={handleWithdrawStake}>

              {isClaimable && (
                <div className={`${styles.statusPanel} ${styles.claimReady}`}>
                  <span className={styles.statusTitle}>Ready to withdraw now</span>
                  <strong className={styles.statusAmount}>{formatDmdFromWei(orderedWei)}</strong>
                  <span className={styles.statusNote}>From your previous unstake order.</span>
                </div>
              )}

              {isPending && (
                <div className={`${styles.statusPanel} ${styles.orderPending}`}>
                  <span className={styles.statusTitle}>Pending unstake</span>
                  <strong className={styles.statusAmount}>{formatDmdFromWei(orderedWei)}</strong>
                  <span className={styles.statusNote}>Not ready to withdraw yet.</span>
                  <span className={styles.statusNote}>Return here and click Unstake when these funds are ready.</span>
                </div>
              )}

              {isClaimable && hasUnstakable && (
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={addUnstake}
                    onChange={(e) => setAddUnstake(e.target.checked)}
                  />
                  <span>{isOrder ? "Also place an unstake order" : "Also unstake additional funds now"}</span>
                </label>
              )}

              {showUnstakeFields && (<>
                {isOrder ? (
                  <span className={styles.available} data-tooltip="This amount is currently locked in an active Epoch and cannot be unstaked right now. You can pre-order an unstake, and it will become claimable after the Epoch ends.">
                    Available to order: <strong>{formatDmd(lockedAmountDmd)}</strong>
                  </span>
                ) : (
                  <span className={styles.available} data-tooltip="This is the amount of DMD that can be unstaked and claimed immediately because it is not currently active in an Epoch.">
                    Available to unstake now: <strong>{formatDmd(availableUnstakableDmd)}</strong>
                  </span>
                )}

                <div className={styles.field}>
                  <label htmlFor={amountInputId} className={styles.fieldLabel}>{amountLabel}</label>
                  <div className={styles.inputWrapper}>
                    <input
                      id={amountInputId}
                      min={
                        canBeUnstakedAmount.isZero()
                          ? BigNumber.maximum(0, BigNumber.minimum(1, canBeOrderedAmount.dividedBy(10 ** 18))).toString()
                          : BigNumber.maximum(0, BigNumber.minimum(1, canBeUnstakedAmount.dividedBy(10 ** 18))).toString()
                      }
                      max={maxInputAmount}
                      type="number"
                      step="any"
                      value={unstakeAmount || ''}
                      className={isOverMax ? `${styles.formInput} ${styles.invalid}` : styles.formInput}
                      aria-invalid={isOverMax}
                      placeholder={isOrder ? "Enter the amount to order unstake" : "Enter the amount to unstake"}
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
                          amountWei = ownPool
                            ? BigNumber.maximum(0, canBeOrderedAmount.minus(candidateMinStake))
                            : canBeOrderedAmount;
                        } else {
                          amountWei = ownPool
                            ? BigNumber.maximum(0, canBeUnstakedAmount.minus(candidateMinStake))
                            : canBeUnstakedAmount;
                        }

                        const amountDmdBn = amountWei.dividedBy(10 ** 18).decimalPlaces(18, BigNumber.ROUND_DOWN);
                        setUnstakeAmount(amountDmdBn.toString(10));
                      }}
                      aria-label="Fill max amount"
                    >
                      Max
                    </button>
                  </div>
                  {!isClaimable && !isOrder && (
                    <span className={styles.fieldHint}>Withdraw now without creating an order.</span>
                  )}
                </div>

                {!isClaimable && isOrder && (
                  <p className={styles.unstakeWarning}>
                    <i className="fas fa-circle-info" aria-hidden="true"></i>
                    Claim after the required epoch transition.
                  </p>
                )}

                {pool.isActive && canBeUnstakedAmount.isGreaterThan(0) && canBeOrderedAmount.isGreaterThan(0) && (
                  <p className={styles.unstakeWarning}>
                    Please note, that this node is a part of current Epoch
                    validators set. You can unstake the available amount, and
                    after that it is possible to order the coins to be claimed as
                    soon as Epoch ends.
                  </p>
                )}
              </>)}

              {!isLoading && (<div className={styles.summary}>
                {!isClaimable && !hasUnstakable ? (
                  <SummaryRow label="Available now" wei={new BigNumber(0)} />
                ) : (<>
                  {isClaimable && showUnstakeFields && !isOrder && (<>
                    <SummaryRow label="Previous order" wei={orderedWei} />
                    <SummaryRow label="Additional unstake" wei={enteredWei} />
                  </>)}
                  <SummaryRow label="Receive now" wei={receiveNowWei} total />
                  {showOrderSummary && <SummaryRow label="New order" wei={enteredWei} />}
                  {!isClaimable && showUnstakeFields && <SummaryRow label="Remaining stake" wei={remainingStakeWei} />}
                </>)}

                {receiveNowWei.isGreaterThan(0) && !showOrderSummary && (
                  <span className={styles.summaryNote}>Before network fees</span>
                )}
                {isClaimable && showOrderSummary && (
                  <span className={styles.orderNote}>New order: claim after the required epoch transition.</span>
                )}
              </div>)}

              {isClaimable && hasAmount && (
                <p className={styles.claimNote}>
                  Claim and {unstakeVerb} are sent as two separate transactions.
                </p>
              )}

              {isClaimable || hasUnstakable || isLoading ? (
                <button className={"btn-primary " + styles.formSubmit} type="submit" disabled={isLoading}>
                  {isClaimable
                    ? hasAmount ? (isOrder ? "Claim & Place order" : "Claim & Unstake") : "Claim"
                    : isOrder ? "Place unstake order" : "Unstake"}
                </button>
              ) : (
                <button className={"btn-cancel " + styles.formSubmit} type="button" onClick={closeModal}>
                  Close
                </button>
              )}
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") as HTMLElement
      )}
    </>
  );
};

export default UnstakeModal;
