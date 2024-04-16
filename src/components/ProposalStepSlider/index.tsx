import React, { useEffect, useState } from "react";

import styles from "./styles.module.css";
import BigNumber from "bignumber.js";

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
            <span>{BigNumber(state).dividedBy(10**18).toString()} DMD</span>
            <div>
                <span>{BigNumber(paramsRange[0]).dividedBy(10**18).toString()} DMD</span>
                <input
                    type="range"
                    min={paramsRange[0]}
                    max={paramsRange[paramsRange.length - 1]}
                    value={state}
                    onChange={handleChange}
                    className={styles.rangeInput}
                />
                <span>{BigNumber(paramsRange[paramsRange.length - 1]).dividedBy(10**18).toString()} DMD</span>
            </div>
        </div>
    );
}

export default ProposalStepSlider;