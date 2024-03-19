import React, { useEffect } from "react";
import { useStakingContext } from "../../../contexts/StakingContext";

import "./styles.module.css";

interface PoolsProps {}

const Pools: React.FC<PoolsProps> = ({}) => {
  
  let StakingContext = useStakingContext();

  useEffect(() => {
    StakingContext.initializeStakingDataAdapter();
  }, []);

  return (
    <div className="App">
      <span>Pools Synced: {StakingContext.stakingDataAdapter ? (StakingContext.stakingDataAdapter.context.pools.length).toString() : ""}</span>
    </div>
  );
};

export default Pools;
