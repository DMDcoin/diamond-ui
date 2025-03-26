import { toast } from "react-toastify";
import styles from "./styles.module.css";
import React, { useState, useEffect, useRef, FormEvent, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

interface ModalProps {
    buttonText: string;
    icon: React.ReactNode;
}

const UpdateRpcModal: React.FC<ModalProps> = ({ buttonText, icon }) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [rpc, setRpc] = useState<string>(localStorage.getItem("rpcUrl") || "");

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    const updateRpc = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const currentRpc = localStorage.getItem("rpcUrl") || "";
        if (rpc === currentRpc) {
            toast.info("Provided RPC is same as already set");
            return;
        }

        // Validate the RPC URL
        try {
            new URL(rpc);
        } catch (error) {
            toast.error("Provided RPC is invalid");
            return;
        }
        localStorage.setItem("rpcUrl", rpc);
        toast.success("RPC updated successfully, reloading...");
        closeModal();
        setTimeout(() => {
            startTransition(() => { navigate('') });
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
            <div style={{ color: "#0145b2", gap: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); openModal(); }}>
                {icon} {buttonText}
            </div>

            {isOpen && (
                <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
                    <div onClick={(e) => e.stopPropagation()} className={styles.modalContent} ref={modalRef}>
                        <button className={styles.modalClose} onClick={closeModal}>
                            &times;
                        </button>
                        <h2>Change RPC</h2>

                        <form className={styles.form} onSubmit={updateRpc}>
                            <span>
                                You are connected to <strong>{localStorage.getItem("rpcUrl") || import.meta.env.VITE_APP_RPC_URL || "https://beta-rpc.bit.diamonds/"}</strong>
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
