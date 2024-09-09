import React, { useEffect, useState } from "react";

import styles from "./styles.module.css";
import BigNumber from "bignumber.js";
import { formatCryptoUnitValue } from "../../utils/common";

interface ProposalStepSliderProps {
    state: string;
    paramsRange: string[];
    setState: (value: string) => void;
}

const ProposalStepSlider: React.FC<ProposalStepSliderProps> = ({ paramsRange, state, setState }) => {
    const [startingVal, setStartingVal] = useState<string | undefined>(undefined);

    useEffect(() => {
        setStartingVal(state);
    }, [paramsRange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {   
        const newValue = BigNumber(e.target.value);
        
        if (startingVal) {
            const currIndex = paramsRange.indexOf(startingVal);
            const leftVal = (currIndex > 0) ? paramsRange[currIndex - 1] : paramsRange[0];
            const rightVal = (currIndex < paramsRange.length - 1) ? paramsRange[currIndex + 1] : paramsRange[paramsRange.length - 1];

            if (newValue.isGreaterThan(leftVal) && newValue.isLessThan(rightVal)) {
                setState(startingVal.toString());
            } else {
                if (newValue.isLessThanOrEqualTo(leftVal)) {
                    setState(leftVal);
                } else {
                    setState(rightVal);
                }
            }
        }
    };

    return (
        <div className={styles.sliderContainer}>
            <span>{formatCryptoUnitValue(state)}</span>
            <div>
                <span>{formatCryptoUnitValue(paramsRange[0])}</span>
                <input
                    type="range"
                    min={paramsRange[0]}
                    max={paramsRange[paramsRange.length - 1]}
                    value={state}
                    onChange={handleChange}
                    className={styles.rangeInput}
                />
                <span>{formatCryptoUnitValue(paramsRange[paramsRange.length - 1])}</span>
            </div>
        </div>
    );
}

export default ProposalStepSlider;