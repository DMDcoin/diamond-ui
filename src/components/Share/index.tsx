"use client"

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import copy from 'copy-to-clipboard';
import './Share.css';

type ShareNetwork = {
  key: string;
  label: string;
  icon: string;
  buildHref: (url: string, text: string) => string;
};

const NETWORKS: ShareNetwork[] = [
  {
    key: 'twitter',
    label: 'X (Twitter)',
    icon: 'fab fa-twitter',
    buildHref: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: 'fab fa-telegram',
    buildHref: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: 'fab fa-linkedin',
    buildHref: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: 'fab fa-facebook',
    buildHref: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
];

const MENU_WIDTH = 244;
const MENU_OFFSET = 10;
const VIEWPORT_MARGIN = 12;

type Props = {
  /** Text used as the share message on social networks. */
  title: string;
  /** Link to share. Defaults to the current page without query or hash. */
  url?: string;
  /** `icon` sits next to the other round header buttons, `pill` next to status chips. */
  variant?: 'icon' | 'pill';
  /** Visible text of the pill trigger. */
  label?: string;
  /** Side of the trigger the menu lines up with. */
  align?: 'left' | 'right';
  className?: string;
};

export default function ShareMenu({
  title,
  url,
  variant = 'icon',
  label = 'Share',
  align = 'right',
  className = '',
}: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canUseNativeShare, setCanUseNativeShare] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' });
  const [positioned, setPositioned] = useState(false);

  useEffect(() => {
    setCanUseNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const resolveUrl = useCallback(() => {
    if (url) return url;
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}`;
  }, [url]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' =
      menuHeight > 0 && spaceBelow < menuHeight + MENU_OFFSET + VIEWPORT_MARGIN && rect.top > menuHeight
        ? 'top'
        : 'bottom';

    const top = placement === 'bottom' ? rect.bottom + MENU_OFFSET : rect.top - menuHeight - MENU_OFFSET;
    const preferredLeft = align === 'right' ? rect.right - MENU_WIDTH : rect.left;
    const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(preferredLeft, maxLeft));

    setPos({ top, left, placement });
    setPositioned(true);
  }, [align]);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  const handleCopy = async () => {
    const link = resolveUrl();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API needs a secure context; fall back to the execCommand path.
      copy(link);
    }
    setCopied(true);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url: resolveUrl() });
      setOpen(false);
    } catch {
      // Dismissing the system sheet is not an error worth surfacing.
    }
  };

  const shareUrl = open ? resolveUrl() : '';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`share-trigger share-trigger--${variant} ${open ? 'is-open' : ''} ${className}`.trim()}
        onClick={() => { setPositioned(false); setOpen((prev) => !prev); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={variant === 'icon' ? label : undefined}
        title={label}
      >
        <i className="fas fa-share-nodes" aria-hidden="true"></i>
        {variant === 'pill' && <span>{label}</span>}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Share this page"
          className={`share-menu share-menu--${pos.placement} ${positioned ? 'is-positioned' : ''}`}
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
        >
          <button type="button" role="menuitem" className="share-menu-item" onClick={handleCopy}>
            <i className={`fas ${copied ? 'fa-check share-menu-icon--done' : 'fa-link'}`} aria-hidden="true"></i>
            <span>{copied ? 'Link copied' : 'Copy link'}</span>
          </button>

          <div className="share-menu-divider" role="none"></div>

          {NETWORKS.map((network) => (
            <a
              key={network.key}
              role="menuitem"
              className="share-menu-item"
              href={network.buildHref(shareUrl, title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <i className={network.icon} aria-hidden="true"></i>
              <span>{network.label}</span>
            </a>
          ))}

          {canUseNativeShare && (
            <>
              <div className="share-menu-divider" role="none"></div>
              <button type="button" role="menuitem" className="share-menu-item" onClick={handleNativeShare}>
                <i className="fas fa-share-from-square" aria-hidden="true"></i>
                <span>More options</span>
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
