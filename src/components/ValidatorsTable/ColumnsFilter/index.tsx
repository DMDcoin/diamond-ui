import React, { useState, useRef, useEffect } from "react";
import styles from "./styles.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { faRemove } from "@fortawesome/free-solid-svg-icons";
import { faColumns } from "@fortawesome/free-solid-svg-icons";

interface ModalProps {
  buttonText: string;
}

const ColumnsFilterModal: React.FC<ModalProps> = ({ buttonText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const columnOptions = [
    { key: "isActive", label: "Status" },
    { key: "stakingAddress", label: "Wallet" },
    { key: "totalStake", label: "Total Stake" },
    { key: "votingPower", label: "Voting Power" },
    { key: "score", label: "Score" },
    { key: "connectivityReport", label: "CR" },
    { key: "myStake", label: "My Stake" },
  ];

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleColumnClick = (label: string) => {
    setSelectedColumns((prev) =>
      prev.includes(label) ? prev.filter((column) => column !== label) : [...prev, label]
    );
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLLIElement>,
    index: number
  ) => {
    setDraggedItemIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    event.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const updatedColumns = [...selectedColumns];
    const [draggedItem] = updatedColumns.splice(draggedItemIndex, 1);
    updatedColumns.splice(dropIndex, 0, draggedItem);

    setSelectedColumns(updatedColumns);
    setDraggedItemIndex(null);
  };

  const handleColumnsChange = () => {}

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <button className={styles.openBtn + " primaryBtn"} onClick={openModal}>
        <FontAwesomeIcon icon={faColumns} />
        {buttonText}
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} ref={modalRef}>
            <button className={styles.modalClose} onClick={closeModal}>
              &times;
            </button>
            <p>Add, delete and sort columns just how you need it</p>

            <div className={styles.selectedColumns}>
              {selectedColumns.length === 0 ? (
              <span className={styles.alignStart}>Select columns to start</span>
              ) : (
              <ul id="items-list" className={styles.moveableItems}>
                {selectedColumns.map((column, index) => (
                <li
                  key={column}
                  draggable
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDrop(event, index)}
                >
                  <span>{index + 1}</span>
                  {column}
                  <FontAwesomeIcon icon={faBars} />
                </li>
                ))}
              </ul>
              )}
            </div>

            <div className={styles.columnSelectionContainer}>
              <ul className={styles.moveableItems}>
              {columnOptions.map((option) => (
                <li
                  key={option.key}
                  className={`${selectedColumns.includes(option.label) ? styles.coulmnSelected : styles.coulmnNotSelected}`}
                  onClick={() => handleColumnClick(option.label)}
                >
                  {option.label}
                  {selectedColumns.includes(option.label) && (
                  <FontAwesomeIcon icon={faRemove} />
                )}
                </li>
              ))}
              </ul>
            </div>

            <div className={styles.modalFooter}>
              <button className="primaryBtn" onClick={closeModal}>Cancle</button>
              <button className="primaryBtn" onClick={handleColumnsChange}>Apply Changes</button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default ColumnsFilterModal;
