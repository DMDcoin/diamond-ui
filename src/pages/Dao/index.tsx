import React, { useEffect, useState } from "react";
import { useDaoContext } from "../../contexts/DaoContext";

interface HomeProps {}

const Dao: React.FC<HomeProps> = ({}) => {
  const [activeProposals, setActiveProposals] = useState<string[]>([]);
  const daoContext = useDaoContext();

  useEffect(() => {
    daoContext.initialize().then(() => {
      daoContext.getActiveProposals().then((activeProposals) => {
        setActiveProposals(activeProposals || [])
      })  
    });
  }, [])

  return (
    <div className="daoContainer">
      DAO {activeProposals.map((proposal) => <div>{proposal}</div>) }
    </div>
  );
};

export default Dao;
