import BigNumber from "bignumber.js";
import styles from "./styles.module.css";
import { useStakingContext } from "../../contexts/StakingContext";

interface ProgressProps {
  min: number;
  max: number;
  progress: BigNumber;
  bgColor: string;
}

const ProgressBar: React.FC<ProgressProps> = ({
  min,
  max,
  progress,
  bgColor,
}) => {
  const { totalDaoStake } = useStakingContext();

  const progressPercentage = progress
    .dividedBy(totalDaoStake)
    .multipliedBy(100)
    .toNumber();
  const percentage = new BigNumber(
    Math.min(Math.max((progressPercentage - min) / (max - min), 0), 1) * 100
  ).toFixed(4, BigNumber.ROUND_DOWN);

  // Format the progress value with commas
  const progressValue = progress.dividedBy(10 ** 18);
  const progressValueFormatted = Number(progressValue.toFixed(4)).toLocaleString(
    "en-US",
    { minimumFractionDigits: 4, maximumFractionDigits: 4 }
  );

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${percentage}%`, backgroundColor: `${bgColor}` }}
        />
        <span 
          className={styles.progressText}
          style={{ left: `${parseFloat(percentage) + 1}%`, marginLeft: "2px" }}
        >
          {progressValueFormatted} ({percentage}%)
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
