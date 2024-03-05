import React, { useEffect, useState } from "react";
import styles from "./loader.module.css";
import dmdLogoWithoutText from "../../assets/images/logoWithoutText.png";

interface LoaderProps {
  isLoading?: boolean;
  size?: number;
}

const Loader: React.FC<LoaderProps> = ({ isLoading, size = 50 }) => {
  return (
    <div className={isLoading ? styles.loaderActive : styles.loaderHidden}>
      <div className={styles.backdrop} />
      <img
        src={dmdLogoWithoutText}
        alt="Loading"
        className={`${styles.image} ${styles.pulse}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

export default Loader;
