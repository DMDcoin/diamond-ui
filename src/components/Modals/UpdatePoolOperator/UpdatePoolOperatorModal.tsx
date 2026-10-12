import logger from '@/utils/logger';
import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./UpdatePoolOperatorModal.module.css";
import { isValidAddress } from "@/utils/common";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import ReactDOM from "react-dom";
import { Pool } from "@/contexts/types/models";
import InfoTooltip from "@/components/InfoTooltip";

interface ModalProps {
  buttonText: string;
  pool?: Pool | undefined;
}

const UpdatePoolOperatorModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [canUpdate, setCanUpdate] = useState<boolean>(false);
  const [poolOperator, setPoolOperator] = useState<string>("");
  const [poolOperatorShare, setPoolOperatorShare] = useState<BigNumber | null>(null);

  const { ensureWalletConnection } = useWeb3Context();
  const { updatePoolOperatorRewardsShare, canUpdatePoolOperatorRewards } = useStakingContext();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
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
    if (!pool) return;
    setPoolOperator(pool.poolOperator || "");
    setPoolOperatorShare(pool.poolOperatorShare ? pool.poolOperatorShare : null);
    canUpdatePoolOperatorRewards(pool).then((res) => setCanUpdate(res)).catch(() => setCanUpdate(false));
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    if (!pool) return;

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
      const success = await updatePoolOperatorRewardsShare(pool, nOperatorAddress, nOperatorShare || new BigNumber(0));
      if (success) closeModal();
    } catch (err) {
      logger.error(err);
      toast.error("Error in updating pool");
      closeModal();
    }
  };

  return (
    <>
      <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openModal(); checks(); }}>
        {buttonText}
      </button>

      {isOpen && ReactDOM.createPortal(
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal} aria-label="Close update pool modal">&times;</button>
            <h2 className={styles.modalTitle}>Set up a rewards share</h2>

            <p className={styles.modalDescription}>Don’t want to run the node yourself? Add a trusted operator’s address and choose what % of your node rewards to send them automatically.</p>

            <form className={styles.form} onSubmit={handleUpdate}>
              <label className={styles.fieldLabel}>
                <span>
                  Node Operator Address
                  <InfoTooltip
                    id="node-operator-address-tooltip"
                    placement="top"
                    content={
                      <>
                        <p>The wallet address of the person or service running your validator node.</p>
                        <p>
                          Rewards will be forwarded to this address based on the configured percentage. Only native
                          (EOA) addresses are supported.
                        </p>
                      </>
                    }
                  >
                    <span className={styles.infoIcon}>i</span>
                  </InfoTooltip>
                </span>
                <input
                  type="text"
                  minLength={42}
                  maxLength={42}
                  value={poolOperator}
                  className={styles.formInput}
                  placeholder="Enter pool operator address"
                  onChange={(e) => setPoolOperator(e.target.value)}
                />
              </label>

              <label className={styles.fieldLabel}>
                <span>
                  Reward Share Percentage (%)
                  <InfoTooltip
                    id="reward-share-percentage-tooltip"
                    placement="top"
                    content={
                      <>
                        <p>The portion of your 20% node owner reward to share with the operator.</p>
                        <p>
                          Enter a value between 0.01% and 20%. This share is paid automatically at the end of each Epoch.
                        </p>
                      </>
                    }
                  >
                    <span className={styles.infoIcon}>i</span>
                  </InfoTooltip>
                </span>
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.01}
                    className={styles.formInput}
                    placeholder="Operator share %"
                    value={poolOperatorShare ? poolOperatorShare.dividedBy(100).toString() : ""}
                    onChange={(e) => {
                      const percentage = parseFloat(e.target.value);
                      const scaledValue = isNaN(percentage) ? null : new BigNumber(percentage * 100);
                      setPoolOperatorShare(scaledValue);
                    }}
                  />
                  <span className={styles.percentageSign}>%</span>
                </div>
              </label>

              {!canUpdate ? (
                <p className={styles.stakeWarning}>You can update the pool operator rewards share only once per Epoch</p>
              ) : (
                <button className={`${styles.formSubmit} btn-primary`} type="submit">Update</button>
              )}
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") as HTMLElement
      )}
    </>
  );
};

export default UpdatePoolOperatorModal;
