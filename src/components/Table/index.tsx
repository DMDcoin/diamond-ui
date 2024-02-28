import React, { useEffect, useState } from 'react';
import './table.module.css';
import { useWeb3Context } from '../../contexts/Web3Context';
import { toast } from 'react-toastify';
import { Proposal } from '../../contexts/DaoContext/types';

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
    if (filterQuery) {
      const updatedData = data.filter((proposal: Proposal) =>
        proposal.proposer.toLowerCase().match(filterQuery.toLowerCase()) ||
        proposal.description.toLowerCase().match(filterQuery.toLowerCase()) ||
        getStateString(proposal.state).toLowerCase().match(filterQuery.toLowerCase()) ||
        proposal.timestamp.toLowerCase().match(filterQuery.toLowerCase())
      );

      setCurrentItems(updatedData.slice(indexOfFirstItem, indexOfLastItem))
      setTotalPages(Math.ceil(updatedData.length / itemsPerPage));
      setFilteredData(updatedData);
    } else {
      setCurrentItems(data.slice(indexOfFirstItem, indexOfLastItem))
      setTotalPages(Math.ceil(data.length / itemsPerPage));
      setFilteredData(data);
    }

    setIndexOfLastItem(currentPage * itemsPerPage);
    setIndexOfFirstItem(indexOfLastItem - itemsPerPage);
  }, [data, filterQuery]);

  const handleChangePage = (page: number) => {
    setCurrentPage(page);
  };

  const handleVotingFinalization = async (proposalId: string) => {
    return new Promise<void>(async (resolve, reject) => {
        if (!web3Context.ensureWalletConnection()) return resolve();

        const toastid = toast.loading("Finalizing proposal");
        try {
          await web3Context.contractsManager.daoContract?.methods.finalize(proposalId).send({ from: web3Context.userWallet.myAddr });
          toast.update(toastid, { render: "Proposal Finalized!", type: "success", isLoading: false, autoClose: 5000 });
          resolve();
        } catch(err) {
          toast.update(toastid, { render: "Proposal Finalization Failed!", type: "error", isLoading: false, autoClose: 5000 });
          resolve();
        }
    }); 
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
                    <td>{proposal.timestamp}</td>
                    <td>{proposal.proposer}</td>
                    <td>{proposal.description}</td>
                    <td>Type</td>

                    <td>
                      {proposal.state === "3" ? (
                        <button
                          onClick={(e) => handleVotingFinalization(proposal.id)}
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

export default Table;
