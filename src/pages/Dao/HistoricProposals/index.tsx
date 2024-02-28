import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./historicproposals.module.css";
import Table from "../../../components/Table";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";
import Navigation from "../../../components/Navigation";
import { Proposal } from "../../../contexts/DaoContext/types";

const HistoricProposals = () => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const [filterQuery, setFilterQuery] = useState<string>('');
  const [allDaoProposals, setAllDaoProposals] = useState<Proposal[]>([]);

  const handleDetailsClick = (proposalId: string) => {
    // Navigate to the dynamic route with the proposalId parameter
    startTransition(() => {
      navigate(`/proposal-details/${proposalId}`);
    });
  };

  const fetchHistoricProposals = async () => {
    await web3Context.contractsManager.daoContract?.getPastEvents(
      'ProposalCreated',
      {
        filter: {},
        fromBlock: 0,
        toBlock: 'latest'
      }).then(async (events) => {
        const detailsPromises = events.map(async (event) => {
          const proposalId = event.returnValues.proposalId;
          const proposalTimestamp: number = await daoContext.getProposalTimestamp(proposalId);
          const proposalDetails = await web3Context.contractsManager.daoContract?.methods.getProposal(proposalId).call();
          const proposalVotes = await web3Context.contractsManager.daoContract?.methods.getProposalVotersCount(proposalId).call();
  
          return {
            ...proposalDetails,
            values: proposalDetails?.[4],
            votes: proposalVotes,
            id: proposalId,
            timestamp: daoContext.timestampToDate(proposalTimestamp),
            type: 'open'
          };
        });
  
        const details = await Promise.all(detailsPromises);
        setAllDaoProposals(details as any);
        web3Context.setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!daoContext.daoInitialized) {
      web3Context.setIsLoading(true);
      daoContext.initialize().then(() => {
        daoContext.getActiveProposals().then(() => {
          web3Context.setIsLoading(false);
        });
      });
    } else {
      if (!allDaoProposals.length) {
        web3Context.setIsLoading(true);
        fetchHistoricProposals();
      }
    }
  }, [daoContext.activeProposals])

  return (
    <div className="mainContainer">
      <Navigation start="/dao" />

      <div className={styles.historicProposalsInfoContainer}>
        <div>
          <h1 className={styles.historicProposalsHeading}>Historic Proposals</h1>

          <input type="text" placeholder="Search" className={styles.historicProposalsSearch} onChange={e => setFilterQuery(e.target.value)}/>
        </div>
      </div>

      <Table
        data={allDaoProposals}
        handleDetailsClick={handleDetailsClick}
        getStateString={daoContext.getStateString}
        filterQuery={filterQuery}
      />
    </div>
  );
};

export default HistoricProposals;
