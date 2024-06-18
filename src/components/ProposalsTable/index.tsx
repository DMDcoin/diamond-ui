import styles from './styles.module.css';
import { toast } from 'react-toastify';
import React, { useEffect, useState } from 'react';
import { useDaoContext } from '../../contexts/DaoContext';
import { Proposal } from '../../contexts/DaoContext/types';
import { useWeb3Context } from '../../contexts/Web3Context';

interface TableProps {
  data: any[];
  userWallet?: {
    myAddr: string;
  };
  filterQuery?: string;
  handleDetailsClick: (id: string) => void;
  getStateString: (state: string) => string;
  itemsPerPage?: number;
  columns?: string[];
}

const ProposalsTable = (props: TableProps) => {
  const {
    data,
    userWallet,
    filterQuery,
    handleDetailsClick,
    getStateString,
    itemsPerPage = 10,
    columns = []
  } = props;

  const daoContext = useDaoContext();
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState<Proposal[]>([]);
  const [currentItems, setCurrentItems] = useState<Proposal[]>([]);

  const defaultCoulmns = [
    'Date',
    'Account',
    'Title',
    'Type',
    ...columns,
    '',
    ''
  ]

  useEffect(() => {
    const lastItemIndex = currentPage * itemsPerPage;
    const firstItemIndex = lastItemIndex - itemsPerPage;

    if (filterQuery) {
      let updatedData: any[] = [];
      if (filterQuery === 'unfinalized') {
        updatedData = data.filter((proposal: Proposal) => proposal.state === "3");
      } else {
        updatedData = data.filter((proposal: Proposal) =>
          proposal.proposer.toLowerCase().match(filterQuery.toLowerCase()) ||
          proposal.description.toLowerCase().match(filterQuery.toLowerCase()) ||
          getStateString(proposal.state).toLowerCase().match(filterQuery.toLowerCase()) ||
          proposal.timestamp.toLowerCase().match(filterQuery.toLowerCase())
        );
      }

      if (userWallet) {
        updatedData = updatedData.filter(
          (proposal: Proposal) => proposal.proposer === userWallet.myAddr
        );
      }

      setCurrentItems(updatedData.slice(firstItemIndex, lastItemIndex))
      setTotalPages(Math.ceil(updatedData.length / itemsPerPage));
      setFilteredData(updatedData);
    } else {
      let dataCopy = data;
      if (userWallet) {
        dataCopy = dataCopy.filter(
          (proposal: Proposal) => proposal.proposer === userWallet.myAddr && userWallet.myAddr !== ""
        );
      }
      setCurrentItems(dataCopy.slice(firstItemIndex, lastItemIndex))
      setTotalPages(Math.ceil(dataCopy.length / itemsPerPage));
      setFilteredData(dataCopy);
    }
  }, [data, filterQuery, currentPage, userWallet]);

  const handleChangePage = (page: number) => {
    setCurrentPage(page);
  };

  const handleProposalFinalization = async (proposalId: string) => {
    try {
      daoContext.finalizeProposal(proposalId)
    } catch (error) {}
  }

  return (
    <div className={styles.tableContainer}>
      <div>
        <table>
          <thead>
            <tr>
              {defaultCoulmns.map((column: string, key: number) => (
                <th key={key}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((proposal: any, key: number) => {
              return (
                <tr className={styles.tr} key={key}>
                  <td className={styles.td}>
                    {
                      proposal.timestamp || (<div className={styles.loader}></div>)
                    }
                  </td>
                  <td className={styles.td}>
                    {
                      proposal.proposer || (<div className={styles.loader}></div>)
                    }
                  </td>
                  <td className={styles.td}>
                    {
                      proposal.title || (<div className={styles.loader}></div>)
                    }
                  </td>
                  <td className={styles.td}>
                    {
                      proposal.proposalType || (<div className={styles.loader}></div>)
                    }
                  </td>

                  {
                    defaultCoulmns.length > 0 && (
                      <td className={styles.td}>
                        {
                          daoContext.getStateString(proposal.state) !== 'Unknown' ? daoContext.getStateString(proposal.state) : (<div className={styles.loader}></div>)
                        }
                      </td>
                    )
                  }

                  <td>
                    {proposal.state === "3" ? (
                      <button
                        onClick={(e) => handleProposalFinalization(proposal.id)}
                      >
                        Needs Finalization
                      </button>
                    ) : (
                      <></>
                    )}
                  </td>

                  <td className={styles.td}>
                    {
                      proposal.description ? (
                        <button onClick={() => handleDetailsClick(proposal.id)}>
                          Details
                        </button>
                      ) : (<div className={styles.loader}></div>)
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredData.length > itemsPerPage && (
          <div className={styles.tablePagination}>
              <button disabled={currentPage === 1} onClick={() => handleChangePage(currentPage - 1)}>
                  Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => (
                  <button key={index} onClick={() => handleChangePage(index + 1)} disabled={currentPage === index + 1}>
                      {index + 1}
                  </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => handleChangePage(currentPage + 1)}>
                  Next
              </button>
          </div>
      )}
    </div>
  );
};

export default ProposalsTable;
