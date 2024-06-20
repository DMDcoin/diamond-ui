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

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: string } | null>(null);

    // Handle filter change
    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter(event.target.value as 'default' | 'active' | 'banned' | 'unavailable');
        setCurrentPage(0); // Reset to first page when changing filter
    };

    // Handle search term change
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setCurrentPage(0); // Reset to first page when starting a new search
    };

    // Apply filters and search
    let poolsCopy = [...pools];

    if (filter === 'active') {
        poolsCopy = poolsCopy.filter(pool => pool.isCurrentValidator);
    } else if (filter === 'unavailable') {
        poolsCopy = poolsCopy.filter(pool => !pool.isCurrentValidator);
    } else if (filter === 'banned') {
        poolsCopy = poolsCopy.filter(pool => Number(pool?.bannedUntil ?? 0) > Math.floor(new Date().getTime() / 1000));
    }

    if (searchTerm.trim() !== '') {
        poolsCopy = poolsCopy.filter(pool =>
            pool.stakingAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (pool.miningAddress && pool.miningAddress.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    // Apply sorting if sortConfig is set
    if (sortConfig !== null) {
        poolsCopy.sort((a: any, b: any) => {
            const keyA = sortConfig.key === 'myStake' ? parseFloat(a[sortConfig.key] || '0') : a[sortConfig.key];
            const keyB = sortConfig.key === 'myStake' ? parseFloat(b[sortConfig.key] || '0') : b[sortConfig.key];
    
            if (keyA < keyB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (keyA > keyB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    const pageCount = Math.ceil(poolsCopy.length / itemsPerPage);
    const offset = currentPage * itemsPerPage;
    const currentItems = poolsCopy.slice(offset, offset + itemsPerPage);

    const handlePageClick = (pageIndex: number) => {
        setCurrentPage(pageIndex);
    };

    const requestSort = (key: string) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getClassNamesFor = (column: string) => {
        if (!sortConfig) {
            return;
        }
        return sortConfig.key === column ? sortConfig.direction : undefined;
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

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.styledTable}>
                    <thead>
                        <tr>
                            <th></th>
                            <th className={getClassNamesFor('isCurrentValidator')} onClick={() => requestSort('isCurrentValidator')}>
                                Status
                            </th>
                            <th className={getClassNamesFor('stakingAddress')} onClick={() => requestSort('stakingAddress')}>
                                Wallet
                            </th>
                            <th className={getClassNamesFor('totalStake')} onClick={() => requestSort('totalStake')}>
                                Total Stake
                            </th>
                            <th className={getClassNamesFor('votingPower')} onClick={() => requestSort('votingPower')}>
                                Voting Power
                            </th>
                            <th className={getClassNamesFor('score')} onClick={() => requestSort('score')}>
                                Score
                            </th>
                            <th className={getClassNamesFor('myStake')} onClick={() => requestSort('myStake')}>{userWallet.myAddr ? "My stake" : ""}</th>
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

            {/* Pagination */}
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
