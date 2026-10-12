import React, { useEffect, useState } from "react";
import styles from "./Loader.module.css";
import Image from "next/image";

interface LoaderProps {
  loadingMessage?: string | null;
  isLoading?: boolean;
  onDismiss?: () => void;
}

const DISMISS_DELAY_MS = 20000;

const Loader: React.FC<LoaderProps> = ({ loadingMessage, isLoading, onDismiss }) => {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isLoading ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading || !onDismiss) {
      setCanDismiss(false);
      return;
    }
    const timer = setTimeout(() => setCanDismiss(true), DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, loadingMessage, onDismiss]);

  return (
    <div className={isLoading ? styles.loaderActive : styles.loaderHidden}>
      <div className={styles.backdrop} />

      <div
        className={styles.imageWrapper}
      >
        <Image
          src="/logos/dmd-logo-vector.svg"
          alt="Loading"
          fill
          className={`${styles.image} ${styles.pulse}`}
        />
      </div>

      <p className={styles.loadingMsg}>{loadingMessage}</p>

      {canDismiss && onDismiss && (
        <div className={styles.dismissBlock}>
          <p className={styles.dismissHint}>
            Taking longer than expected. If your wallet didn&apos;t prompt you, the request may not have gone through.
          </p>
          <button type="button" className={styles.dismissBtn} onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default Loader;
