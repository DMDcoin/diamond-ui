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

const UpdateRpcModal: React.FC<ModalProps> = ({ buttonText, pool }) => {
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

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
                        <h2>Change RPC</h2>

                        <form className={styles.form} onSubmit={e => e.preventDefault()}>
                            <span>
                                Provide your own RPC
                            </span>

                            <input
                                type="number"
                                className={styles.formInput}
                                placeholder="Enter your RPC"
                            />

                            <button className={styles.formSubmit} type="submit">
                                Change
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default UpdateRpcModal;
