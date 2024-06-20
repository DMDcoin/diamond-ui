import BigNumber from "bignumber.js";
import React, { useState } from "react";
import styles from "./styles.module.css";
import StakeModal from "../Modals/StakeModal";
import { useNavigate } from "react-router-dom";
import UnstakeModal from "../Modals/UnstakeModal";
import { useWeb3Context } from "../../contexts/Web3Context";
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useStakingContext } from "../../contexts/StakingContext";

interface ValidatorsTableProps {
    itemsPerPage?: number;
}

const ValidatorsTable: React.FC<ValidatorsTableProps> = ({ itemsPerPage = 10 }) => {
    const navigate = useNavigate();
    const { userWallet } = useWeb3Context();
    const { pools, stakingEpoch, claimOrderedUnstake } = useStakingContext();

    const [currentPage, setCurrentPage] = useState(0);
    const [filter, setFilter] = useState<'default' | 'active' | 'banned' | 'unavailable'>('default');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Create a copy of pools to apply filters and search
    let poolsCopy = [...pools];

    // Apply filter
    if (filter === 'active') {
      poolsCopy = poolsCopy.filter(pool => pool.isCurrentValidator);
    } else if (filter === 'unavailable') {
      poolsCopy = poolsCopy.filter(pool => !pool.isAvailable);
    } else if (filter === 'banned') {
      poolsCopy = poolsCopy.filter(pool => Number(pool?.bannedUntil ?? 0) > Math.floor(new Date().getTime() / 1000));
    }

    // Apply search
    if (searchTerm.trim() !== '') {
      poolsCopy = poolsCopy.filter(pool => 
        pool.stakingAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pool.miningAddress && pool.miningAddress.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    const pageCount = Math.ceil(poolsCopy.length / itemsPerPage);
    const offset = currentPage * itemsPerPage;
    const currentItems = poolsCopy.slice(offset, offset + itemsPerPage);

    const handlePageClick = (pageIndex: number) => {
        setCurrentPage(pageIndex);
    };

    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter(event.target.value as 'default' | 'active' | 'banned' | 'unavailable');
        setCurrentPage(0); // Reset to first page when changing filter
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setCurrentPage(0); // Reset to first page when starting a new search
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

    return (
        <div className={styles.sectionContainer + " sectionContainer"}>
            <h1>Validator Candidates</h1>

            {/* Filter and Search */}
            <div className={styles.filterContainer}>
                <input
                    type="text"
                    placeholder="Search by address"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />

                <select id="filter" value={filter} onChange={handleFilterChange}>
                    <option value="default">All</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                    <option value="unavailable">Unavailable</option>
                </select>
            </div>

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
                            <th>{userWallet.myAddr ? "My stake" : ""}</th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map((pool, index) => (
                            <tr onClick={() => navigate(`/staking/details/${pool.stakingAddress}`)} className={styles.tableBodyRow} key={index}>
                                <td>
                                    <Jazzicon diameter={40} seed={jsNumberForAddress(pool.stakingAddress)} />
                                </td>
                                <td className={pool?.isCurrentValidator ? styles.poolActive : (Number(pool?.bannedUntil ?? 0) > Math.floor(new Date().getTime() / 1000) ? styles.poolBanned : styles.poolActive)}>
                                    {typeof pool.isCurrentValidator === 'boolean'
                                        ? (pool.isCurrentValidator ? "Active" : (Number(pool?.bannedUntil ?? 0) > Math.floor(new Date().getTime() / 1000) ? "Banned" : "Unavailable"))
                                        : (<div className={styles.loader}></div>)}
                                </td>
                                <td>{pool.stakingAddress ? pool.stakingAddress : (<div className={styles.loader}></div>)}</td>
                                <td>{
                                    pool.totalStake ? BigNumber(pool.totalStake).dividedBy(10**18).toString() + " DMD" : (<div className={styles.loader}></div>)
                                }</td>
                                <td>
                                    {pool.votingPower && pool.votingPower.toString() !== 'NaN'
                                        ? `${pool.votingPower.toString()} %`
                                        : <div className={styles.loader}></div>}
                                </td>
                                <td>{pool.score !== undefined && pool.score !== null ? pool.score : (<div className={styles.loader}></div>)}</td>
                                {
                                    userWallet.myAddr ? <>
                                        <td>{userWallet.myAddr && BigNumber(pool.myStake) ? BigNumber(pool.myStake).dividedBy(10**18).toString() : (<div className={styles.loader}></div>) } DMD</td>
                                        <td>
                                            {
                                                pool.isActive && (
                                                    <StakeModal buttonText="Stake" pool={pool} />
                                                )
                                            }
                                        </td>
                                        <td>
                                            { 
                                                BigNumber(pool.orderedWithdrawAmount).isGreaterThan(0) && BigNumber(pool.orderedWithdrawUnlockEpoch).isLessThanOrEqualTo(stakingEpoch) ? (
                                                    <button className={styles.tableButton} onClick={(e) => {e.stopPropagation(); claimOrderedUnstake(pool)}}>Claim</button>
                                                ) : (
                                                    BigNumber(pool.myStake).isGreaterThan(0) && (
                                                        <UnstakeModal buttonText="Unstake" pool={pool} />
                                                    )
                                                )
                                            }
                                        </td>
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
