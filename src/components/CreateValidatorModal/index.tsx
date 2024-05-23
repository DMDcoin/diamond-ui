import React, { useEffect } from "react";
import styles from "./styles.module.css";

interface CreateValidatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateValidatorModal: React.FC<CreateValidatorModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  console.log("isOpen", isOpen)

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>

        <button className={styles.modalClose} onClick={onClose}>&times;</button>

        <h1>Create Validator</h1>
        
        <form className={styles.form}>
          <button className={styles.formSubmit} type="submit">
            Create Validator
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateValidatorModal;
