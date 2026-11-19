import BigNumber from "bignumber.js";
import styles from "./UnstakeModal.module.css";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import { Pool } from "@/contexts/types/models";
import React, { useState, useEffect, useRef, useId, FormEvent } from "react";
import ReactDOM from "react-dom";
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

const AMOUNT_PATTERN = /^-?(\d+(\.\d{0,18})?|\.\d{1,18})$/;

const SummaryRow: React.FC<{ label: string; wei: BigNumber | null; total?: boolean }> = ({ label, wei, total }) => (
  <div className={total && wei?.isGreaterThan(0) ? `${styles.summaryRow} ${styles.summaryTotal}` : styles.summaryRow}>
    <span>{label}</span>
    <span>{wei ? formatDmdFromWei(wei) : "—"}</span>
  </div>
);

const UnstakeModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const amountInputId = useId();
  const amountErrorId = useId();
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [amountTouched, setAmountTouched] = useState<boolean>(false);
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

  const openModal = () => {
    setUnstakeAmount('');
    setAddUnstake(false);
    setAmountTouched(false);
    if (pool.stakingAddress) fetchWithdrawableAmounts();
    setIsOpen(true);
  };
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
    if (amountError) {
      setAmountTouched(true);
      return;
    }

    if (isClaimable) {
      const claimed = await claimOrderedUnstake(pool);
      if (!claimed) return;
      if (!hasAmount) return closeModal();
    }

    await performUnstake(amountText);
  }

  const performUnstake = async (amountNumber: string) => {
    const amountInWei = web3.utils.toWei(amountNumber);

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

  const maxInputWei = canBeUnstakedAmount.isGreaterThan(0)
    ? (ownPool ? BigNumber.maximum(0, canBeUnstakedAmount.minus(candidateMinStake)) : canBeUnstakedAmount)
    : (ownPool ? BigNumber.maximum(0, canBeOrderedAmount.minus(candidateMinStake)) : canBeOrderedAmount);
  const maxInputAmount = maxInputWei.dividedBy(10 ** 18).decimalPlaces(18, BigNumber.ROUND_DOWN);
  const minInputAmount = BigNumber.maximum(0, BigNumber.minimum(1, (canBeUnstakedAmount.isZero() ? canBeOrderedAmount : canBeUnstakedAmount).dividedBy(10 ** 18)));

  const amountText = unstakeAmount.trim();
  const parsedAmount = AMOUNT_PATTERN.test(amountText) ? BigNumber(amountText) : null;
  const isOverMax = showUnstakeFields && Boolean(parsedAmount?.isGreaterThan(maxInputAmount));

  const amountError = ((): string | null => {
    if (!showUnstakeFields) return null;
    if (!amountText) return isClaimable ? null : "Amount must be greater than 0 DMD.";
    if (!parsedAmount) return "Please enter a valid unstake amount";
    if (!parsedAmount.isGreaterThan(0)) return "Amount must be greater than 0 DMD.";
    if (parsedAmount.isLessThan(minInputAmount)) return `Value must be greater than or equal to ${minInputAmount.toString(10)}.`;
    if (isOverMax) return `Cannot ${unstakeVerb} more than ${formatDmd(maxInputAmount)}`;
    const amountWei = parsedAmount.multipliedBy(10 ** 18);
    const limitWei = isOrder ? canBeOrderedAmount : canBeUnstakedAmount;
    const minStake = isOrder || !ownPool ? delegatorMinStake : candidateMinStake;
    if (!amountWei.isEqualTo(limitWei) && limitWei.minus(amountWei).isLessThan(minStake)) {
      return isOrder
        ? `Ordered amount is invalid. You must order the full amount or leave at least the minimum stake of ${formatDmdFromWei(minStake)}.`
        : `Unstake amount is invalid. You must unstake the full amount or leave at least the minimum stake of ${formatDmdFromWei(minStake)}.`;
    }
    return null;
  })();
  const amountBlocked = Boolean(amountError) && amountText !== "";
  const showAmountError = Boolean(amountError) && (amountTouched || isOverMax);
  const summaryUnknown = showAmountError && amountText !== "";

  const enteredWei = showUnstakeFields && !amountError && parsedAmount ? parsedAmount.multipliedBy(10 ** 18) : new BigNumber(0);
  const receiveNowWei = summaryUnknown && !isOrder ? null : (isClaimable ? orderedWei : new BigNumber(0)).plus(isOrder ? 0 : enteredWei);
  const remainingStakeWei = summaryUnknown ? null : BigNumber.maximum(0, BigNumber(pool.myStake ?? 0).minus(enteredWei));
  const enteredSummaryWei = summaryUnknown ? null : enteredWei;
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
                      min={minInputAmount.toString(10)}
                      max={maxInputAmount.toString(10)}
                      type="number"
                      step="any"
                      value={unstakeAmount || ''}
                      className={showAmountError ? `${styles.formInput} ${styles.invalid}` : styles.formInput}
                      aria-invalid={showAmountError}
                      aria-describedby={showAmountError ? amountErrorId : undefined}
                      placeholder={isOrder ? "Enter the amount to order unstake" : "Enter the amount to unstake"}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      onBlur={(e) => { if (e.target.value.trim()) setAmountTouched(true); }}
                      onKeyDown={(e) => { if (e.key === "Enter") setAmountTouched(true); }}
                    />

                    <button
                      type="button"
                      className={styles.maxButton}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setUnstakeAmount(maxInputAmount.toString(10));
                      }}
                      aria-label="Fill max amount"
                    >
                      Max
                    </button>
                  </div>
                  {showAmountError && (
                    <span id={amountErrorId} className={styles.fieldError}>{amountError}</span>
                  )}
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
                    <SummaryRow label="Additional unstake" wei={enteredSummaryWei} />
                  </>)}
                  <SummaryRow label="Receive now" wei={receiveNowWei} total />
                  {showOrderSummary && <SummaryRow label="New order" wei={enteredSummaryWei} />}
                  {!isClaimable && showUnstakeFields && <SummaryRow label="Remaining stake" wei={remainingStakeWei} />}
                </>)}

                {receiveNowWei?.isGreaterThan(0) && !showOrderSummary && (
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
                <button className={"btn-primary " + styles.formSubmit} type="submit" disabled={isLoading || amountBlocked}>
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
