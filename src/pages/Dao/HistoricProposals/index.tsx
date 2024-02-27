import { startTransition, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./historicproposals.module.scss";
import Table from "../../../components/Table";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";

const HistoricProposals = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const fetchHistoricProposals = async () => {
    const events = await web3Context.contractsManager.daoContract?.getPastEvents(
      'ProposalCreated',
      {
        filter: {},
        fromBlock: 0,
        toBlock: 'latest'
      });
    console.log(events);
  }

  useEffect(() => {
    fetchHistoricProposals();
  }, [])

  return (
    <div className="mainContainer">
      <h1>Historic Proposals</h1>
      {/* <Table /> */}
    </div>
  );
};

export default HistoricProposals;
