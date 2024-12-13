import React from 'react';
import styles from "./styles.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface TooltipProps {
    text: string;
    width?: string;
    heading?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, width, heading }) => {
    return (
        <div className={styles.tooltipContainer}>
            { heading ? heading : <FontAwesomeIcon icon={faInfoCircle} /> }
            <div className={styles.tooltipContent} style={{minWidth: width}}>
                {text}
            </div>
        </div>
    );
};

export default Tooltip;
