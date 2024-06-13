import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { useStakingContext } from "../../../contexts/StakingContext";
import React, { useState, useEffect, useRef, FormEvent } from "react";

interface ModalProps {
  buttonText: string;
}

const CreateValidatorModal: React.FC<ModalProps> = ({ buttonText }) => {
  const navigate = useNavigate();
  const { createPool } = useStakingContext();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [publicKey, setPublicKey] = useState("");
  const [stakeAmount, setStakeAmount] = useState(10000);
  const { userWallet, ensureWalletConnection } = useWeb3Context();

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
    try {
      createPool(publicKey, new BigNumber(stakeAmount)).then((res) => {
        if (res) navigate(`/staking/details/${userWallet.myAddr}`);
      });
    } catch (err) {
      console.log(err);
      toast.error("Error in creating pool");
    }
  }

  return (
    <>
      <button className={styles.tableButton} onClick={openModal}>
        {buttonText}
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal}>
              &times;
            </button>
            <h2>Create a pool</h2>

            <form className={styles.form} onSubmit={handleCreatePool}>
              <span>
                Please stake atleast 10,000 DMD
                coins (50,000 max) to become a validator candidate.
              </span>

              <input
                type="text"
                minLength={130}
                maxLength={130}
                name="publicKey"
                className="publicKey"
                onChange={e => setPublicKey(e.currentTarget.value)}
                placeholder="Public Key"
                required
              />

              <input
                min={10000}
                max={50000}
                type="number"
                value={stakeAmount}
                className={styles.formInput}
                placeholder="Enter the amount of DMD to stake"
                onChange={(e) => setStakeAmount(Number(e.target.value))}
              />

              <button className={styles.formSubmit} type="submit">
                Create
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateValidatorModal;
