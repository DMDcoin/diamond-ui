import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TableField {
  key: string;
  label: string;
  sortAble: boolean;
  updateAble: boolean;
  hide: boolean;
}

interface ColumnsFilterModalProps {
  buttonText: string;
  tableFields: TableField[];
  setTableFields: (fields: TableField[]) => void;
  defaultFields: TableField[];
}

const ColumnsFilterModal: React.FC<ColumnsFilterModalProps> = ({ 
  buttonText, 
  tableFields, 
  setTableFields, 
  defaultFields 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [tempSelectedColumns, setTempSelectedColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    tableFields.filter((field) => field.label && field.updateAble).map((field) => field.label)
  );

  useEffect(() => {
    setSelectedColumns(
      tableFields.filter((field) => field.label && field.updateAble && !field.hide).map((field) => field.label)
    );
  }, [tableFields]);

  const openModal = () => {
    setTempSelectedColumns(selectedColumns);
    setIsOpen(true);
    // Prevent page shift by calculating scrollbar width and adding padding
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  };

  const closeModal = () => {
    setIsOpen(false);
    document.body.style.overflow = '';
    document.body.style.paddingRight = '0px';
  };

  const handleColumnClick = (label: string) => {
    setTempSelectedColumns((prev) =>
      prev.includes(label) ? prev.filter((column) => column !== label) : [...prev, label]
    );
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.classList.add('drag-over');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.classList.remove('drag-over');
    
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const updatedColumns = [...tempSelectedColumns];
    const draggedItem = updatedColumns[draggedItemIndex];
    updatedColumns.splice(draggedItemIndex, 1);
    updatedColumns.splice(dropIndex, 0, draggedItem);

    setTempSelectedColumns(updatedColumns);
    setDraggedItemIndex(null);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.classList.remove('drag-over');
  };

  const handleColumnsChange = () => {
    const selectedSet = new Set(tempSelectedColumns);

    // Visible, customizable columns
    const selectedFields = tempSelectedColumns
      .map((label) => tableFields.find((f) => f.updateAble && f.label === label))
      .filter((f): f is TableField => !!f)
      .map((f) => ({ ...f, hide: false }));

    // Customizable columns the user didn't pick — order among themselves doesn't
    // matter since they're hidden, so just keep their existing relative order.
    const hiddenFields = tableFields
      .filter((f) => f.updateAble && f.label && !selectedSet.has(f.label))
      .map((f) => ({ ...f, hide: true }));

    // Fixed columns (e.g. My Stake / stake buttons) aren't user-reorderable.
    const fixedFields = tableFields.filter((f) => !(f.updateAble && f.label));

    setTableFields([...selectedFields, ...fixedFields, ...hiddenFields]);
    setSelectedColumns(tempSelectedColumns);
    closeModal();
  };

  const handleResetToDefault = () => {
    const resetFields = defaultFields.map((f) => ({ ...f }));
    const newSelected = resetFields
      .filter((f) => f.updateAble && f.label && !f.hide)
      .map((f) => f.label);

    setTableFields(resetFields);
    setSelectedColumns(newSelected);
    setTempSelectedColumns(newSelected);
    closeModal();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeModal();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  // Cleanup effect to reset body overflow when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '0px';
    };
  }, []);

  return (
    <>
      <button className="btn-customize" onClick={openModal}>
        <i className="fas fa-columns"></i> {buttonText}
      </button>

      {isOpen && createPortal(
        <div className={`modal ${isOpen ? 'show' : ''}`}>
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <h3>Customize your table view</h3>
              <span>Select, reorder, and manage columns to fit your workflow</span>
            </div>
            <div className="modal-body">
              <div className="columns-container">
                <div className="columns-section">
                  <div className="columns-section-title">CURRENT COLUMNS</div>
                  <div className="selected-columns">
                    {tempSelectedColumns.length === 0 ? (
                      <span className="align-start">Select columns to start</span>
                    ) : (
                      <div className="active-columns">
                        {tempSelectedColumns.map((column, index) => (
                          <div
                            key={column}
                            className="active-column"
                            draggable
                            onDragStart={(event) => handleDragStart(event, index)}
                            onDragOver={handleDragOver}
                            onDrop={(event) => handleDrop(event, index)}
                            onDragLeave={handleDragLeave}
                          >
                            <span className="column-number">{index + 1}</span>
                            <span className="column-name">{column}</span>
                            <i className="fas fa-grip-lines column-drag"></i>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="columns-section">
                  <div className="columns-section-title">AVAILABLE COLUMNS</div>
                  <div className="column-selection-container">
                    <div className="available-columns">
                      {defaultFields.map((option) => (
                        option.label && option.updateAble && (
                          <div
                            key={option.key}
                            className={`available-column ${tempSelectedColumns.includes(option.label) ? 'selected' : ''}`}
                            onClick={() => handleColumnClick(option.label)}
                          >
                            <span className="column-name">{option.label}</span>
                            {tempSelectedColumns.includes(option.label) && (
                              <i className="fas fa-times column-remove"></i>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-reset btn-secondary" onClick={handleResetToDefault}>
                Reset to Default
              </button>
              <button className="btn-apply" onClick={handleColumnsChange}>
                Apply Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ColumnsFilterModal;
