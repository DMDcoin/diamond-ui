import React, { useEffect } from "react";
import ValidatorsTable from "../../../components/ValidatorsTable";

interface PoolsProps {}

const Pools: React.FC<PoolsProps> = ({}) => {
  return (
    <div className="section">
      <ValidatorsTable/>
    </div>
  );
};

export default Pools;
