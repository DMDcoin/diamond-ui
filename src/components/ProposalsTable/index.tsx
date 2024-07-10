import styles from './styles.module.css';
import { toast } from 'react-toastify';
import React, { useEffect, useState } from 'react';
import { useDaoContext } from '../../contexts/DaoContext';
import { Proposal } from '../../contexts/DaoContext/types';
import { useWeb3Context } from '../../contexts/Web3Context';

interface TableProps {
  data: any[];
  searchQuery?: string;
  filterQuery?: string;
  handleDetailsClick: (id: string) => void;
  getStateString: (state: string) => string;
  itemsPerPage?: number;
  columns?: string[];
}

const ProposalsTable = (props: TableProps) => {
  const {
    data,
    searchQuery,
    filterQuery,
    handleDetailsClick,
    getStateString,
    itemsPerPage = 10,
    columns = []
  } = props;

  const web3Context = useWeb3Context();
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
    let filteredData: any[] = data;
    const lastItemIndex = currentPage * itemsPerPage;
    const firstItemIndex = lastItemIndex - itemsPerPage;

    if (filterQuery) {
      if (filterQuery === 'unfinalized') {
        filteredData = filteredData.filter((proposal: Proposal) => proposal.state === "3");
      } else if (filterQuery === 'myProposals') {
        filteredData = filteredData.filter((proposal: Proposal) => proposal.proposer === web3Context.userWallet?.myAddr);
      }
    }

    if (searchQuery) {
      filteredData = filteredData.filter((proposal: Proposal) =>
        proposal.proposer.toLowerCase().match(searchQuery.toLowerCase()) ||
        proposal.description.toLowerCase().match(searchQuery.toLowerCase()) ||
        getStateString(proposal.state).toLowerCase().match(searchQuery.toLowerCase()) ||
        proposal.timestamp.toLowerCase().match(searchQuery.toLowerCase())
      );
    }

    setCurrentItems(filteredData.slice(firstItemIndex, lastItemIndex))
    setTotalPages(Math.ceil(filteredData.length / itemsPerPage));
    setFilteredData(filteredData);
  }, [data, filterQuery, searchQuery, currentPage, web3Context.userWallet.myAddr]);

  const handleChangePage = (page: number) => {
    setCurrentPage(page);
  }

  return (
    <div className={styles.tableContainer}>
      <div>
        <table className={styles.styledTable}>
          <thead>
            <tr>
              {defaultCoulmns.map((column: string, key: number) => (
                <th key={key}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!currentItems.length ? 
              <tr>
                <td colSpan={defaultCoulmns.length} className={styles.noData}>
                  No proposals found
                </td>
              </tr>
            : currentItems.map((proposal: any, key: number) => {
              return (
                <tr className={styles.tableBodyRow} key={key} onClick={() => handleDetailsClick(proposal.id)}>
                  <td>
                    {
                      proposal.timestamp || (<div className={styles.loader}></div>)
                    }
                  </td>
                  <td>
                    {
                      proposal.proposer || (<div className={styles.loader}></div>)
                    }
                  </td>
                  <td>
                    {
                      proposal.title || (<div className={styles.loader}></div>)
                    }
                  </td>
                  <td>
                    {
                      proposal.proposalType || (<div className={styles.loader}></div>)
                    }
                  </td>

                  {
                    defaultCoulmns.length > 0 && (
                      <td>
                        {
                          daoContext.getStateString(proposal.state) !== 'Unknown' ? daoContext.getStateString(proposal.state) : (<div className={styles.loader}></div>)
                        }
                      </td>
                    )
                  }

                  <td>
                    {proposal.state === "3" ? (
                      <button className={styles.tableButton}>
                        Needs Finalization
                      </button>
                    ) : (
                      <button className={styles.tableButtonHidden}></button>
                    )}
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
