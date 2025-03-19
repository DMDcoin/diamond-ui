import { toast } from "react-toastify";
import styles from "./styles.module.css";
import React, { useState, useEffect, useRef, FormEvent } from "react";

interface ModalProps {
    buttonText: string;
}

const UpdateRpcModal: React.FC<ModalProps> = ({ buttonText }) => {
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [rpc, setRpc] = useState<string>(localStorage.getItem("rpcUrl") || "");

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    const updateRpc = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validate the RPC URL
        try {
            new URL(rpc);
        } catch (error) {
            toast.error("Provided RPC is invalid");
            return;
        }
        localStorage.setItem("rpcUrl", rpc);
        toast.success("RPC updated successfully");
        toast.success("Page will reload in 5 seconds");
        closeModal();
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    };

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

                        <form className={styles.form} onSubmit={updateRpc}>
                            <span>
                                Provide your own RPC
                            </span>

                            <input
                                type="text"
                                className={styles.formInput}
                                placeholder="Enter your RPC"
                                value={rpc}
                                onChange={(e) => setRpc(e.target.value)}
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
