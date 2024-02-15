import React, { useState } from 'react';
import './table.css';

interface TableProps {
  columns: string[];
  data: any[];
  userWallet?: {
    myAddr: string;
  };
  handleDetailsClick: (id: string) => void;
  getStateString: (state: string) => string;
  itemsPerPage?: number;
}

const Table = (props: TableProps) => {
  const {
    columns,
    data,
    userWallet,
    handleDetailsClick,
    getStateString,
    itemsPerPage = 10
  } = props;

  const [currentPage, setCurrentPage] = useState(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const handleChangePage = (page: number) => {
    setCurrentPage(page);
  };

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
                    <td>{proposal.proposer}</td>
                    <td>{proposal.description}</td>
                    <td>{proposal.votes}</td>
                    <td>{getStateString(proposal.state)}</td>
                    <td>14 Hours</td>
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

        {data.length > itemsPerPage && (
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
