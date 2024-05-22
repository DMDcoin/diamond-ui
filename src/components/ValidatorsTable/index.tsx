import BigNumber from "bignumber.js";
import React, { useEffect, useState } from "react";
import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { useWeb3Context } from "../../contexts/Web3Context";
import { useStakingContext } from "../../contexts/StakingContext";

interface ValidatorsTableProps {
    itemsPerPage?: number;
}

const ValidatorsTable: React.FC<ValidatorsTableProps> = ({ itemsPerPage = 10 }) => {
  const navigate = useNavigate();
  const { userWallet } = useWeb3Context();
  const { pools } = useStakingContext();
  const [currentPage, setCurrentPage] = useState(0);

  const pageCount = Math.ceil(pools.length / itemsPerPage);
  const offset = currentPage * itemsPerPage;
  const currentItems = pools.slice(offset, offset + itemsPerPage);

  const handlePageClick = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    for (let i = 0; i < pageCount; i++) {
      pageNumbers.push(
        <li
          key={i}
          className={currentPage === i ? styles.active : ""}
          onClick={() => handlePageClick(i)}
        >
          {i + 1}
        </li>
      );
    }
    return pageNumbers;
  };

  const handleLockCoins = (e: React.MouseEvent<HTMLButtonElement>, stakingAddress: string) => {
    e.stopPropagation();
  }

  const handleWithdraw = (e: React.MouseEvent<HTMLButtonElement>, stakingAddress: string) => {
    e.stopPropagation();
  }

  return (
    <div className="sectionContainer">
      <div className={styles.tableContainer}>
        <table className={styles.styledTable}>
          <thead>
            <tr>
              <th></th>
              <th>Status</th>
              <th>Wallet</th>
              <th>Total Stake</th>
              <th>Voting Power</th>
              <th>Score</th>
              <th>{userWallet.myAddr ? "My stake" : "" }</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((pool, index) => (
              <tr onClick={() => navigate(`/staking/details/${pool.stakingAddress}`)} className={styles.tableBodyRow} key={index}>
                <td>
                  <img src="https://via.placeholder.com/50" alt="Image 1" />
                </td>
                <td>{pool.isActive ? "Active" : "Banned"}</td>
                <td>{pool.stakingAddress}</td>
                <td>{BigNumber(Number(pool.totalStake)).dividedBy(10**18).toString()}</td>
                <td>{pool.votingPower.toString()} %</td>
                <td>1000</td>
                {
                  userWallet.myAddr ? <>
                    <td>{userWallet.myAddr ? BigNumber(Number(pool.myStake)).dividedBy(10**18).toString() : "" }</td>
                    {
                      pool.isActive ? <td><button onClick={(e) => handleLockCoins(e, pool.stakingAddress)} className={styles.tableButton}>Lock coins</button></td> : <td></td>
                    }
                    {
                      pool.myStake.isGreaterThan(0) ? <td><button onClick={(e) => handleWithdraw(e, pool.stakingAddress)} className={styles.tableButton}>Withdraw</button></td> : <td></td>
                    }
                  </> : <>
                    <td></td>
                    <td></td>
                    <td></td>
                  </>
                }
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={styles.pagination}>
        <li
          onClick={() => handlePageClick(currentPage - 1)}
          className={currentPage === 0 ? styles.disabled : ""}
        >
          Previous
        </li>
        {renderPageNumbers()}
        <li
          onClick={() => handlePageClick(currentPage + 1)}
          className={currentPage === pageCount - 1 ? styles.disabled : ""}
        >
          Next
        </li>
      </ul>
    </div>
  );
};

export default ValidatorsTable;
