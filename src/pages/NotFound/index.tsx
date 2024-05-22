import React from "react";
import styles from "./styles.module.css";
import NotFoundIcon from "../../assets/images/not-found.svg";

interface NotFoundProps {}

const NotFound: React.FC<NotFoundProps> = ({}) => {
  return (
    <div className={styles.notFoundContainer}>
      <img height={200} src={NotFoundIcon} alt="404" />

      <h1>Page not found</h1>

      <p>The page you are looking for doesn't exist or has been moved.</p>
    </div>
  );
};

export default NotFound;
