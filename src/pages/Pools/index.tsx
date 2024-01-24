import React, { useEffect } from "react";
import { useStakingContext } from "../../contexts/StakingContext";
import { useRecoilState } from "recoil";


interface PoolsProps {}

const Pools: React.FC<PoolsProps> = ({}) => {
  
  let StakingContext = useStakingContext();

  useEffect(() => {
    StakingContext.initializeDataAdapter();
  }, []);

  return (
    <div className="App">
      <span>Pools Synced: {StakingContext.dataAdapter ? (StakingContext.dataAdapter.context.pools.length).toString() : ""}</span>
    </div>
  );
};

export default Pools;
