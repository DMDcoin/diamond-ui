import React, { useEffect, useState } from "react";

import styles from "./styles.module.css";

interface ProposalStepSliderProps {
    min: string;
    max: string;
    step: string;
    state: string;
    stepOperation: string;
    setState: (value: string) => void;
}

const ProposalStepSlider: React.FC<ProposalStepSliderProps> = ({ min, max, step, state, stepOperation, setState }) => {
    const [startingVal, setStartingVal] = useState<string | undefined>(undefined);

    useEffect(() => {
        setStartingVal(state);
    }, [min, max]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {   
        if(parseFloat(state) === 0) return;
        const newValue = parseFloat(e.target.value);
        
        if (startingVal) {
            let newValueAfterOperation;
            if (newValue > parseFloat(startingVal)) {
                if (stepOperation === "add") {
                    newValueAfterOperation = parseFloat(startingVal) + parseFloat(step);
                    setState(newValueAfterOperation.toString());
                } else if (stepOperation === "multiply") {
        
                    newValueAfterOperation = parseFloat(startingVal) * parseFloat(step);
                    setState(newValueAfterOperation.toString());
                }
            } else if (newValue < parseFloat(startingVal)) {
                if (stepOperation === "add") {
                    newValueAfterOperation = parseFloat(startingVal) - parseFloat(step);
                    if (newValueAfterOperation > parseFloat(startingVal)) {
                        newValueAfterOperation = startingVal;
                    }
                    setState(newValueAfterOperation.toString());
                } else if (stepOperation === "multiply") {
        
                    newValueAfterOperation = parseFloat(startingVal) / parseFloat(step);
                    if (newValueAfterOperation < parseFloat(startingVal)) {
                        newValueAfterOperation = startingVal;
                    }
                    setState(newValueAfterOperation.toString());
                }
            } else {
                setState(e.target.value);
            }
        }
    };

    return (
        <div className={styles.sliderContainer}>
            <span>{state}</span>
            <div>
                <span>{min}</span>
                <input
                    type="range"
                    className={styles.rangeInput}
                    min={min}
                    max={max}
                    step={step}
                    value={state}
                    onChange={handleChange}
                />
                <span>{max}</span>
            </div>
        </div>
    );
}

export default ProposalStepSlider;