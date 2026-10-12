'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface RowAction {
  key: string;
  label: string;
  icon: string;
  onSelect: () => void;
}

interface RowActionsProps {
  actions: RowAction[];
  label: string;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  right: number;
}

const MENU_GAP = 4;
const MENU_ESTIMATED_HEIGHT = 140;

export default function RowActions({ actions, label }: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const close = () => setOpen(false);

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const right = Math.max(window.innerWidth - rect.right, MENU_GAP);
      const fitsBelow = rect.bottom + MENU_GAP + MENU_ESTIMATED_HEIGHT <= window.innerHeight;
      setPosition(
        fitsBelow
          ? { top: rect.bottom + MENU_GAP, right }
          : { bottom: window.innerHeight - rect.top + MENU_GAP, right }
      );
    }
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="rl-actions-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <i className="fas fa-ellipsis-v" aria-hidden="true"></i>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="rl-actions-menu"
          role="menu"
          style={{ top: position.top, bottom: position.bottom, right: position.right }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className="rl-actions-item"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              <i className={`fas ${action.icon}`} aria-hidden="true"></i>
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
