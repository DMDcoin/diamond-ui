import React, { useEffect, useRef } from 'react';
import Portal from '../Portal';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closable?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = '', closable = true }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (closable && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      if (isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, onClose, closable]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className={`${styles.modalOverlay} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.modalContent}
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          {closable && (
            <button
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Close modal"
            >
              &times;
            </button>
          )}
          {children}
        </div>
      </div>
    </Portal>
  );
};

export default Modal;
