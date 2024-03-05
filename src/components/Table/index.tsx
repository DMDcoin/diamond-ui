import React, { useEffect, useState } from 'react';
import './table.module.css';
import { useWeb3Context } from '../../contexts/Web3Context';
import { toast } from 'react-toastify';
import { Proposal } from '../../contexts/DaoContext/types';
import { useDaoContext } from '../../contexts/DaoContext';

interface TableProps {
  data: any[];
  userWallet?: {
    myAddr: string;
  };
  filterQuery?: string;
  handleDetailsClick: (id: string) => void;
  getStateString: (state: string) => string;
  itemsPerPage?: number;
}

const Table = (props: TableProps) => {
  const {
    data,
    userWallet,
    filterQuery,
    handleDetailsClick,
    getStateString,
    itemsPerPage = 10
  } = props;

  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState<Proposal[]>([]);
  const [indexOfLastItem, setIndexOfLastItem] = useState(0);
  const [indexOfFirstItem, setIndexOfFirstItem] = useState(0);
  const [currentItems, setCurrentItems] = useState<Proposal[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const columns = [
    'Date',
    'Account',
    'Title',
    'Type',
    '',
    ''
  ]

  useEffect(() => {
    const lastItemIndex = currentPage * itemsPerPage;
    const firstItemIndex = lastItemIndex - itemsPerPage;
    setIndexOfLastItem(lastItemIndex);
    setIndexOfFirstItem(firstItemIndex);

    if (filterQuery) {
      const updatedData = data.filter((proposal: Proposal) =>
        proposal.proposer.toLowerCase().match(filterQuery.toLowerCase()) ||
        proposal.description.toLowerCase().match(filterQuery.toLowerCase()) ||
        getStateString(proposal.state).toLowerCase().match(filterQuery.toLowerCase()) ||
        proposal.timestamp.toLowerCase().match(filterQuery.toLowerCase())
      );

      setCurrentItems(updatedData.slice(firstItemIndex, lastItemIndex))
      setTotalPages(Math.ceil(updatedData.length / itemsPerPage));
      setFilteredData(updatedData);
    } else {
      setCurrentItems(data.slice(firstItemIndex, lastItemIndex))
      setTotalPages(Math.ceil(data.length / itemsPerPage));
      setFilteredData(data);
    }
  }, [data, filterQuery]);

  const handleChangePage = (page: number) => {
    setCurrentPage(page);
  };

  const handleProposalFinalization = async (proposalId: string) => {
    try {
      daoContext.finalizeProposal(proposalId)
    } catch (error) {}
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            {columns.map((column: string, key: number) => (
              <th key={key}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentItems.map((proposal: any, key: number) => {
            if (!userWallet || proposal.proposer === userWallet.myAddr) {
              return (
                <tr key={key}>
                  <td>{proposal.timestamp || 'Loading...'}</td>
                  <td>{proposal.proposer || 'Loading...'}</td>
                  <td>{proposal.description || 'Loading...'}</td>
                  <td>Type</td>

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

                  <td>
                    <button onClick={() => handleDetailsClick(proposal.id)}>
                      Details
                    </button>
                  </td>
                </tr>
              );
            } else {
              return null;
            }
          })}
        </tbody>
      </table>

      {filteredData.length > itemsPerPage && (
        <div className='tablePagination'>
          {/* Pagination buttons... */}
        </div>
      )}
    </div>
  );
};

export default Table;
