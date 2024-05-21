import React, { useEffect } from "react";
import { useStakingContext } from "../../../contexts/StakingContext";

import "./styles.module.css";
import ValidatorsTable from "../../../components/ValidatorsTable";

interface PoolsProps {}

const Pools: React.FC<PoolsProps> = ({}) => {
  
  let StakingContext = useStakingContext();

  useEffect(() => {
    StakingContext.initializeStakingDataAdapter();
  }, []);

  return (
    <div className="App">
      <ValidatorsTable/>
    </div>
  );
};

export default Pools;
