import ReactDOM from "react-dom";
import BigNumber from "bignumber.js";
import copy from "copy-to-clipboard";
import { toast } from "react-toastify";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import { useDmdNamesForAddresses } from "@/hooks/useDmdNamesForAddresses";
import InfoTooltip from "@/components/InfoTooltip";
import { formatDmdFromWei } from "@/utils/format";
import { formatDmdName } from "@/utils/dmdNaming";
import { formatDuration, formatElapsedSince, truncateAddress } from "@/utils/common";
import styles from "./RecoverAbandonedStakesModal.module.css";
import React, { useState, useEffect, useMemo, useRef, FormEvent } from "react";

const DEFAULT_INACTIVITY_THRESHOLD = 10 * 365 * 24 * 60 * 60;

interface ModalProps {
  buttonText: string;
  tooltip?: React.ReactNode;
}

const RecoverAbandonedStakesModal: React.FC<ModalProps> = ({ buttonText, tooltip }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { abandonedPools, inactivityThreshold, recoverAbandonedStakes } = useStakingContext();
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

  const entries = useMemo(
    () => Object.values(abandonedPools).sort((a, b) => b.recoverableStake.comparedTo(a.recoverableStake) ?? 0),
    [abandonedPools]
  );

  const names = useDmdNamesForAddresses(entries.map(entry => entry.stakingAddress));

  const combined = useMemo(
    () => entries.reduce((sum, entry) => sum.plus(entry.recoverableStake), new BigNumber(0)),
    [entries]
  );

  const governanceShare = combined.dividedToIntegerBy(2);
  const reinsertShare = combined.minus(governanceShare);
  const isSingle = entries.length === 1;

  const handleRecover = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    const recovered = await recoverAbandonedStakes();
    if (recovered) closeModal();
  };

  const trigger = (
    <button className="btn-recover" onClick={(e) => { e.stopPropagation(); openModal(); }}>
      {buttonText}
    </button>
  );

  return (
    <>
      {tooltip ? (
        <InfoTooltip content={tooltip} focusable={false} disabled={isOpen}>
          {trigger}
        </InfoTooltip>
      ) : trigger}

      {isOpen && ReactDOM.createPortal(
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal} aria-label="Close modal">
              &times;
            </button>

            <h3 className={styles.headerTitle}>Transfer abandoned coins to the pots</h3>

            <p className={styles.lede}>
              {isSingle ? 'This validator has' : 'These validators have'} not been part of the active validator set for more than{' '}
              {formatDuration(inactivityThreshold || DEFAULT_INACTIVITY_THRESHOLD, 1)}, so {isSingle ? 'its' : 'their'} coins
              can be transferred to the pots.
            </p>

            <ul className={styles.breakdown}>
              {entries.map(entry => {
                const name = names[entry.stakingAddress.toLowerCase()];
                return (
                  <li key={entry.stakingAddress} className={styles.breakdownRow}>
                    <div className={styles.breakdownIdentity}>
                      {name && <span className={styles.identityName}>{formatDmdName(name)}</span>}
                      <button
                        type="button"
                        className={styles.identityAddress}
                        title="Copy staking address"
                        onClick={() => { copy(entry.stakingAddress); toast.success('Copied staking address'); }}
                      >
                        {truncateAddress(entry.stakingAddress)}
                        <i className="fas fa-copy" aria-hidden="true"></i>
                      </button>
                    </div>
                    <div className={styles.breakdownFigures}>
                      <span className={styles.breakdownStake}>{formatDmdFromWei(entry.recoverableStake)}</span>
                      <span className={styles.breakdownLastActive}>Last active {formatElapsedSince(entry.lastActive)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={styles.split}>
              <div className={styles.splitHeader}>
                <span>Coins will be distributed</span>
                <span className={styles.splitTotal}>{formatDmdFromWei(combined)}</span>
              </div>
              <div className={styles.splitRow}>
                <span><span className={styles.splitShare}>50%</span> to Reinsert Pot</span>
                <span className={styles.amount}>{formatDmdFromWei(reinsertShare)}</span>
              </div>
              <div className={styles.splitRow}>
                <span><span className={styles.splitShare}>50%</span> to Governance Pot</span>
                <span className={styles.amount}>{formatDmdFromWei(governanceShare)}</span>
              </div>
            </div>

            <div className={styles.importantBlock} role="alert">
              <span className={styles.importantIcon} aria-hidden>⚠️</span>
              <span className={styles.importantLabel}>Important:</span>
              <p className={styles.importantText}>
                Transferring the coins to the pots cannot be reversed, and the affected pools
                are permanently removed from the validator candidate list.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleRecover}>
              <button
                className={"btn-primary " + styles.formSubmit}
                type="submit"
                disabled={combined.isZero()}
              >
                Transfer to pots
              </button>
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") as HTMLElement
      )}
    </>
  );
};

export default RecoverAbandonedStakesModal;
