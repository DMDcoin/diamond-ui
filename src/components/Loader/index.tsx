import React from "react";
import styles from "./styles.module.css";
import dmdLogoWithoutText from "../../assets/images/logoWithoutText.png";

interface LoaderProps {
  loadingMessage?: string | null;
  isLoading?: boolean;
  size?: number;
}

const Loader: React.FC<LoaderProps> = ({ loadingMessage, isLoading, size = 50 }) => {
  return (
    <div className={isLoading ? styles.loaderActive : styles.loaderHidden}>
      <div className={styles.backdrop} />
      <img
        src={dmdLogoWithoutText}
        alt="Loading"
        className={`${styles.image} ${styles.pulse}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <p className={styles.loadingMsg}>{loadingMessage}</p>
    </div>
  );
};

export default Loader;