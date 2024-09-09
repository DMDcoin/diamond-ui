import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef, startTransition } from "react";

interface ModalProps {
    buttonText: string;
}
  
const FinalizeProposalsWarn: React.FC<ModalProps> = ({ buttonText }) => {
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
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
        <button
          className="primaryBtn"
          onClick={(e) => {
            e.stopPropagation();
            openModal();
          }}
        >
          {buttonText}
        </button>

        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.modalOverlay}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={styles.modalContent}
              ref={modalRef}
            >
              <button className={styles.modalClose} onClick={closeModal}>
                &times;
              </button>
              <h3>Proposal creation is not available</h3>

              <section>
                <p>
                  New proposals can not be created till all the proposals from
                  previous phases are not finalized. Anyone can finalize them
                  with minimal fee cost. Please go to Historic proposals list and
                  finalize those, which have the status 'needs finalization'
                </p>
                <button onClick={() => {startTransition(() => {navigate("/dao/historic")})}} className="primaryBtn">Go to the list</button>
              </section>
            </div>
          </div>
        )}
      </>
    );
};

export default FinalizeProposalsWarn;