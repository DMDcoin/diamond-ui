import React from 'react';
import styles from "./styles.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface TooltipProps {
    text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
    return (
        <div className={styles.tooltipContainer}>
            <FontAwesomeIcon icon={faInfoCircle} />
            <div className={styles.tooltipContent}>
                <p>{text}</p>
            </div>
        </div>
    );
};

export default Tooltip;
