import styles from "./styles.module.css";

interface ProgressProps {
  min: number;
  max: number;
  progress: number;
  bgColor: string;
}

const ProgressBar: React.FC<ProgressProps> = ({
  min,
  max,
  progress,
  bgColor,
}) => {
  const percentage = (Math.min(Math.max((progress - min) / (max - min), 0), 1) * 100).toFixed(4, BigNumber.ROUND_DOWN);

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${percentage}%`, backgroundColor: `${bgColor}` }}
        />
        <span 
        className={styles.progressText}
        style={{ left: `${percentage+1}%` }}
        >{percentage}%</span>
      </div>
    </div>
  );
};

export default ProgressBar;
