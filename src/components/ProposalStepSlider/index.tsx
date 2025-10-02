import React, { useEffect, useState, useRef } from "react";
import styles from "./styles.module.css";
import BigNumber from "bignumber.js";
import { formatCryptoUnitValue } from "../../utils/common";

interface ProposalStepSliderProps {
    state: string;
    parameterName: string;
    paramsRange: string[];
    setState: (value: string) => void;
}

const ProposalStepSlider: React.FC<ProposalStepSliderProps> = ({ parameterName, paramsRange, state, setState }) => {
    const [startingVal, setStartingVal] = useState<string | undefined>(undefined);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        setStartingVal(state);
    }, [paramsRange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = BigNumber(e.target.value);

        if (startingVal) {
            const currIndex = paramsRange.indexOf(startingVal);
            const leftVal = currIndex > 0 ? paramsRange[currIndex - 1] : paramsRange[0];
            const rightVal =
                currIndex < paramsRange.length - 1 ? paramsRange[currIndex + 1] : paramsRange[paramsRange.length - 1];

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

    const getSliderPercentage = () => {
        const current = BigNumber(state);
        const min = BigNumber(paramsRange[0]);
        const max = BigNumber(paramsRange[paramsRange.length - 1]);
        return current.minus(min).dividedBy(max.minus(min)).multipliedBy(100).toFixed(4, BigNumber.ROUND_DOWN);
    };

    const getAdjustedLeft = () => {
        const percentage = parseFloat(getSliderPercentage());
        const textWidth = textRef.current?.offsetWidth || 0;
        const containerWidth = textRef.current?.parentElement?.offsetWidth || 0;

        let leftOffset = percentage - (textWidth / containerWidth) * 50;

        if (leftOffset < 0) {
            leftOffset = 0;
        }

        if (leftOffset > 100 - (textWidth / containerWidth) * 100) {
            leftOffset = 100 - (textWidth / containerWidth) * 100;
        }

        return `${leftOffset}%`;
    };

    const formatValue = (value: string) => {
        if (parameterName === "Governance Pot Share Nominator") {
            return `${value} %`;
        }
        if (parameterName === "Report Disallow Period") {
            return `${Number(value) / 60} minutes`;
        }
        if (parameterName === "Block Gas Limit") {
            return `${Number(value) / 10**6} mGas`;
        }
        if (parameterName === "Standby Bonus") {
            return value;
        }
        return formatCryptoUnitValue(value);
    };

    return (
        <div className={styles.sliderContainer}>
            <div className={styles.valContainer}>
                <span
                    ref={textRef}
                    className={styles.currentValue}
                    style={{
                        left: getAdjustedLeft(),
                    }}
                >
                    {state === startingVal ? "Current" : "Change to"}: <strong>{formatValue(state)}</strong>
                </span>
            </div>
            <div>
                <input
                    type="range"
                    min={paramsRange[0]}
                    max={paramsRange[paramsRange.length - 1]}
                    value={state}
                    onChange={handleChange}
                    className={styles.rangeInput}
                />

                <div className={styles.valContainer}>
                    <div>
                        <span>Min. </span>
                        <span>{formatValue(paramsRange[0])}</span>
                    </div>
                    <div>
                        <span>Max. </span>
                        <span>{formatValue(paramsRange[paramsRange.length - 1])}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProposalStepSlider;

