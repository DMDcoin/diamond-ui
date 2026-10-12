import logger from '@/utils/logger';
import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./CreatePoolModal.module.css";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import ReactDOM from "react-dom";
import { isValidAddress } from "@/utils/common";
import InfoTooltip from "@/components/InfoTooltip";

interface ModalProps {
  buttonText: string;
}

const CreatePoolModal: React.FC<ModalProps> = ({ buttonText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [publicKey, setPublicKey] = useState("");
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const { userWallet, ensureWalletConnection } = useWeb3Context();
  const { createPool } = useStakingContext();

  const [nodeOperatorAddress, setNodeOperatorAddress] = useState("");
  const [nodeOperatorShare, setNodeOperatorShare] = useState<BigNumber | null>(null);
  const [isDifferentNodeOperator, setIsDifferentNodeOperator] = useState(false);

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

  const handleCreatePool = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    let nOperatorShare = nodeOperatorShare;
    let nOperatorAddress = nodeOperatorAddress;

    if (!isDifferentNodeOperator) {
      nOperatorShare = new BigNumber(0);
      nOperatorAddress = "0x0000000000000000000000000000000000000000";
    } else {
      if (nOperatorAddress.length && !isValidAddress(nOperatorAddress)) {
        toast.error("Invalid node operator address");
        return;
      }
      if (nOperatorShare && (nOperatorShare.isLessThan(0) || nOperatorShare.dividedBy(100).isGreaterThan(20))) {
        toast.error("Node operator share must be between 0 and 20%");
        return;
      }
    }

    try {
      const success = await createPool(publicKey, new BigNumber(stakeAmount), nOperatorAddress, nOperatorShare || new BigNumber(0));
      if (success) {
        closeModal();
      }
    } catch (err) {
      logger.log(err);
      toast.error("Error in creating pool");
    }
  };

  return (
    <>
      <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openModal(); }}>
        {buttonText}
      </button>

      {isOpen && ReactDOM.createPortal(
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal} aria-label="Close create pool modal">&times;</button>
            <h2>Create a pool</h2>

            <form className={styles.form} onSubmit={handleCreatePool}>
              <span>Stake between 10,000 and 50,000 DMD to register as a validator candidate. You can operate the node yourself or assign a separate node operator.</span>

              <label className={styles.fieldLabel}>
                <span>
                  Validator Public Key
                  <InfoTooltip
                    id="validator-public-key-tooltip"
                    placement="top"
                    content={
                      <>
                        <p>Public key used to register your validator.</p>
                        <p>Must match the key configured in your node setup.</p>
                      </>
                    }
                  >
                    <span className={styles.infoIcon}>i</span>
                  </InfoTooltip>
                </span>
                <input
                  type="text"
                  minLength={130}
                  maxLength={130}
                  name="publicKey"
                  className={styles.formInput}
                  onChange={(e) => setPublicKey(e.currentTarget.value)}
                  placeholder="Public key"
                  required
                />
              </label>

              <label className={styles.fieldLabel}>
                <span>
                  Stake Amount (DMD)
                  <InfoTooltip
                    id="stake-amount-tooltip"
                    placement="top"
                    content={
                      <>
                        <p>Must be between 10,000 and 50,000 DMD.</p>
                      </>
                    }
                  >
                    <span className={styles.infoIcon}>i</span>
                  </InfoTooltip>
                </span>
                <input
                  min={10000}
                  max={50000}
                  type="number"
                  value={stakeAmount}
                  className={styles.formInput}
                  placeholder="Enter the amount of DMD to stake"
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                />
              </label>

              <div className={styles.checkboxWrapper}>
                <span>Assign a node operator to share your validator rewards?
                  <InfoTooltip
                    id="stake-amount-tooltip"
                    placement="top"
                    content={
                      <>
                        <p>Optionally assign a trusted node operator who runs the validator software. You can share a portion of your 20% validator reward with them.</p>
                      </>
                    }
                  >
                    <span className={styles.infoIcon}>i</span>
                  </InfoTooltip>
                </span>
                <input
                  type="checkbox"
                  checked={isDifferentNodeOperator}
                  onChange={() => setIsDifferentNodeOperator((prev) => !prev)}
                />
              </div>

              {isDifferentNodeOperator && (
                <>
                  <span>Please provide a node operator address to share the rewards and the %, which is forwarded to the address. Check the FAQs to learn more.</span>

                  <label className={styles.fieldLabel}>
                    <span>
                      Node Operator Address
                      <InfoTooltip
                        id="create-pool-node-operator-address-tooltip"
                        placement="top"
                        content={
                          <>
                            <p>Wallet address of the person or service operating your validator node.</p>
                            <p>
                              A share of your node owner rewards will be sent to this address each Epoch. Only native
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
                      name="nodeOperatorAddress"
                      className={styles.formInput}
                      value={nodeOperatorAddress}
                      onChange={(e) => setNodeOperatorAddress(e.target.value)}
                      placeholder="Node operator address"
                      required={isDifferentNodeOperator}
                    />
                  </label>

                  <label className={styles.fieldLabel}>
                    <span>
                      Node Operator Share Percentage
                      <InfoTooltip
                        id="create-pool-node-operator-share-tooltip"
                        placement="top"
                        content={
                          <>
                            <p>Percentage of your 20% node owner reward to share with the operator.</p>
                            <p>
                              Enter a value between 0.01% and 20%. The selected share is forwarded automatically at the
                              end of each Epoch.
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
                        name="nodeOperatorShare"
                        className={styles.formInput}
                        value={nodeOperatorShare ? nodeOperatorShare.dividedBy(100).toString() : ""}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value);
                          const scaledValue = isNaN(percentage) ? null : new BigNumber(percentage * 100);
                          setNodeOperatorShare(scaledValue);
                        }}
                        placeholder="Node operator share percentage"
                        required={isDifferentNodeOperator}
                      />
                      <span className={styles.percentageSign}>%</span>
                    </div>
                  </label>
                </>
              )}

              <button className={`${styles.formSubmit} btn-primary`} type="submit">Create</button>
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") as HTMLElement
      )}
    </>
  );
};

export default CreatePoolModal;
