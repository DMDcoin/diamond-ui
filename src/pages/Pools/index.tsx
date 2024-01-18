import React, { useEffect } from "react";
import { useDataContext } from "../../contexts/DataContext";
import { useRecoilState } from "recoil";


interface PoolsProps {}

const Pools: React.FC<PoolsProps> = ({}) => {
  
  let dataContext = useDataContext();

  useEffect(() => {
    dataContext.initializeDataAdapter();
  }, []);

  return (
    <div className="App">
      <span>Pools Synced: {dataContext.dataAdapter ? (dataContext.dataAdapter.context.pools.length).toString() : ""}</span>
    </div>
  );
};

export default Pools;
