import React, { useState, useRef, useEffect } from "react";
import styles from "./styles.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { faRemove } from "@fortawesome/free-solid-svg-icons";
import { faColumns } from "@fortawesome/free-solid-svg-icons";

interface ModalProps {
  buttonText: string;
  tableFields: any[];
  setTableFields: any;
  defaultFields: any;
}

const ColumnsFilterModal: React.FC<ModalProps> = ({ buttonText, tableFields, setTableFields, defaultFields }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [tempSelectedColumns, setTempSelectedColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(tableFields.filter((field) => field.label && field.updateAble).map((field) => field.label));

  useEffect(() => {
    setSelectedColumns(tableFields.filter((field) => field.label && field.updateAble && !field.hide).map((field) => field.label));
  }, [tableFields]);

  const openModal = () => {
    setTempSelectedColumns(selectedColumns);
    setIsOpen(true);
  };
  const closeModal = () => setIsOpen(false);

  const handleColumnClick = (label: string) => {
    setTempSelectedColumns((prev) =>
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
    const target = event.currentTarget;
    target.classList.add(styles.dragOver); // Add the drag-over class
  };

  const handleDrop = (event: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.classList.remove(styles.dragOver); // Remove the drag-over class
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
  
    const updatedColumns = [...tempSelectedColumns];
    const draggedItem = updatedColumns[draggedItemIndex];
    updatedColumns.splice(draggedItemIndex, 1);
    updatedColumns.splice(dropIndex, 0, draggedItem);
  
    setTempSelectedColumns(updatedColumns);
    setDraggedItemIndex(null);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLIElement>) => {
    const target = event.currentTarget;
    target.classList.remove(styles.dragOver); // Remove the drag-over class
  };

  const handleTouchStart = (
    event: React.TouchEvent<HTMLLIElement>,
    index: number
  ) => {
    setDraggedItemIndex(index);
  };
  
  const handleTouchMove = (event: React.TouchEvent<HTMLLIElement>) => {
    event.preventDefault(); // Prevent scrolling while dragging
  };
  
  const handleTouchEnd = (
    event: React.TouchEvent<HTMLLIElement>,
    dropIndex: number
  ) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
  
    const updatedColumns = [...tempSelectedColumns];
    const draggedItem = updatedColumns[draggedItemIndex];
    updatedColumns.splice(draggedItemIndex, 1);
    updatedColumns.splice(dropIndex, 0, draggedItem);
  
    setTempSelectedColumns(updatedColumns);
    setDraggedItemIndex(null);
  };

  const handleColumnsChange = () => {
    // Create a copy of the tableFields array
    const updatedTableFields = [...tableFields];
  
    // Iterate over the tableFields array and update the hide property for updateable fields
    updatedTableFields.forEach((field) => {
      if (field.updateAble && field.label) {
        field.hide = !tempSelectedColumns.includes(field.label);
      }
    });
  
    // Filter out the updateable fields and sort them based on the tempSelectedColumns order
    const updateableFields = updatedTableFields.filter((field) => field.updateAble && field.label);
    updateableFields.sort((a, b) => tempSelectedColumns.indexOf(a.label) - tempSelectedColumns.indexOf(b.label));
  
    // Merge the sorted updateable fields back into their original positions
    let updateableIndex = 0;
    const finalTableFields = updatedTableFields.map((field) => {
      if (field.updateAble && field.label) {
        return updateableFields[updateableIndex++];
      }
      return field;
    });
  
    // Update the state with the final table fields
    setTableFields(finalTableFields);
    setSelectedColumns(tempSelectedColumns);
    closeModal();
  };

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
              {tempSelectedColumns.length === 0 ? (
              <span className={styles.alignStart}>Select columns to start</span>
              ) : (
              <ul id="items-list" className={styles.moveableItems}>
                {tempSelectedColumns.map((column, index) => (
                <li
                  key={column}
                  draggable={tableFields.findIndex(field => field.label === column) !== -1}
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDrop(event, index)}
                  onTouchStart={(event) => handleTouchStart(event, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(event) => handleTouchEnd(event, index)}
                >
                  <span>{index + 1}</span>
                  {column}
                  {tableFields.findIndex(field => field.label === column) !== -1 && <FontAwesomeIcon icon={faBars} />}
                </li>
                ))}
              </ul>
              )}
            </div>

            <div className={styles.columnSelectionContainer}>
              <ul className={styles.moveableItems}>
                {defaultFields.map((option: any) => (
                option.label && option.updateAble && (
                  <li
                    key={option.key}
                    className={`${tempSelectedColumns.includes(option.label) ? styles.coulmnSelected : styles.coulmnNotSelected}`}
                    onClick={() => handleColumnClick(option.label)}
                  >
                  {option.label}
                  {tempSelectedColumns.includes(option.label) && (
                    <FontAwesomeIcon icon={faRemove} />
                  )}
                  </li>
                )
                ))}
              </ul>
            </div>

            <div className={styles.modalFooter}>
              <button className="primaryBtn" onClick={closeModal}>Cancel</button>
              <button className="primaryBtn" onClick={handleColumnsChange}>Apply Changes</button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default ColumnsFilterModal;
