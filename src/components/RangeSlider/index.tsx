import React from "react";

import styles from "./rangeslider.module.css";

interface RangeSliderProps {
    min: number;
    max: number;
    state: string;
    setState: (value: string) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({min, max, state, setState}) => {
    return ( 
        <div className={styles.sliderContainer}>
            <span>{state}</span>
            <div>
                <span>{min}</span>
                <input
                    type="range"
                    className={styles.rangeInput}
                    min="0"
                    max="100"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                />
                <span>{max}</span>
            </div>
        </div>
     );
}
 
export default RangeSlider;