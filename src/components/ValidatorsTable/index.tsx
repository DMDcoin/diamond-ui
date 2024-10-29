import React, { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import { useLocation, useNavigate } from "react-router-dom";
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort } from '@fortawesome/free-solid-svg-icons';
import StakeModal from "../Modals/StakeModal";
import UnstakeModal from "../Modals/UnstakeModal";
import { useWeb3Context } from "../../contexts/Web3Context";
import { useStakingContext } from "../../contexts/StakingContext";
import styles from "./styles.module.css";
import Tooltip from "../Tooltip";

interface ValidatorsTableProps {
    itemsPerPage?: number;
}

const ValidatorsTable: React.FC<ValidatorsTableProps> = ({ itemsPerPage = 100 }) => {
    const navigate = useNavigate();
    const location = useLocation();  // Use useLocation to get the passed state
    const { userWallet } = useWeb3Context();
    const { pools, stakingEpoch, claimOrderedUnstake } = useStakingContext();

    const [currentPage, setCurrentPage] = useState(0);
    const [filter, setFilter] = useState<'default' | 'valid' | 'active' | 'invalid' | 'stakedOn'>('default');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: string } | null>(null);

    useEffect(() => {
        // If a filter is passed via state, apply it
        if (location.state?.filter) {
            setFilter(location.state.filter);
        }
    }, [location.state]);

    // Handle filter change
    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter(event.target.value as 'default' | 'valid' | 'active' | 'invalid' | 'stakedOn');
        setCurrentPage(0); // Reset to first page when changing filter
    };

    // Handle search term change
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setCurrentPage(0); // Reset to first page when starting a new search
    };

    // Apply filters and search
    let poolsCopy = [...pools];

    if (filter === 'valid') {
        poolsCopy = poolsCopy.filter(pool => pool.isActive && !pool.isActive);
    } else if (filter === 'active') {
        poolsCopy = poolsCopy.filter(pool => pool.isActive);
    } else if (filter === 'invalid') {
        poolsCopy = poolsCopy.filter(pool => !pool.isActive && !pool.isActive);
    } else if (filter === 'stakedOn') {
        poolsCopy = poolsCopy.filter(pool => BigNumber(pool.myStake).isGreaterThan(0));
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
            <h1>Validators</h1>

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
                    <option value="valid">Valid Candidates</option>
                    <option value="active">Active Candidates</option>
                    <option value="invalid">Invalid Candidates</option>
                    <option value="stakedOn">Candidates I've staked on</option>
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
                                <Tooltip text="Active candidate is part of the active set; Valid - is not part of the active set, but can be elected; Invalid - a candidate, who is inactive for some period of time" />
                                <FontAwesomeIcon icon={faSort} size="xs" />
                            </th>
                            <th className={getClassNamesFor('stakingAddress')}>
                                Wallet
                            </th>
                            <th className={getClassNamesFor('totalStake')} onClick={() => requestSort('totalStake')}>
                                Total Stake
                                <Tooltip text="Total delegated DMD (self-staked DMD + delegates' stake)" />
                                <FontAwesomeIcon icon={faSort} size="xs" />
                            </th>
                            <th className={getClassNamesFor('votingPower')} onClick={() => requestSort('votingPower')}>
                                Voting Power
                                <Tooltip text="Value that approximates a node’s influence in the DAO participation" />
                                <FontAwesomeIcon icon={faSort} size="xs" />
                            </th>
                            <th className={getClassNamesFor('score')} onClick={() => requestSort('score')}>
                                Score
                                <Tooltip text="Combined score value, based on the results of generating the shared key,
                                the stability of the validator connection and misbehaviour reports from other validators" />
                                <FontAwesomeIcon icon={faSort} size="xs" />
                            </th>
                            <th className={getClassNamesFor('myStake')} onClick={() => requestSort('myStake')}>
                                {userWallet.myAddr ? (
                                    <>
                                        My stake <FontAwesomeIcon icon={faSort} size="xs" />
                                    </>
                                ) : ""}
                            </th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length <= 0 ? (
                            <tr>
                                <td colSpan={9} className={styles.noData}>
                                    No validators found
                                </td>
                            </tr>
                        ) : currentItems.map((pool, index) => (
                            <tr onClick={() => navigate(`/staking/details/${pool.stakingAddress}`)} className={styles.tableBodyRow} key={index}>
                                <td>
                                    <Jazzicon diameter={40} seed={jsNumberForAddress(pool.stakingAddress)} />
                                </td>
                                <td className={pool?.isActive || pool.isActive ? styles.poolActive : styles.poolBanned}>
                                    {typeof pool.isActive === 'boolean'
                                        ? pool.isActive ? "Active" : pool.isActive ? "Valid" : "Invalid"
                                        : (<div className={styles.loader}></div>)}
                                </td>
                                <td>{pool.stakingAddress ? pool.stakingAddress : (<div className={styles.loader}></div>)}</td>
                                <td>{
                                    pool.totalStake ? BigNumber(pool.totalStake).dividedBy(10**18).toFixed(2) + " DMD" : (<div className={styles.loader}></div>)
                                }</td>
                                <td>
                                    {pool.votingPower && pool.votingPower.toString() !== 'NaN' && pool.votingPower.toString() !== 'Infinity'
                                        ? `${pool.votingPower.toString()} %`
                                        : <div className={styles.loader}></div>}
                                </td>
                                <td>{pool.score !== undefined && pool.score !== null ? pool.score : (<div className={styles.loader}></div>)}</td>
                                {
                                    userWallet.myAddr ? <>
                                        <td>{userWallet.myAddr && BigNumber(pool.myStake) ? BigNumber(pool.myStake).dividedBy(10**18).toFixed(0) : (<div className={styles.loader}></div>) } DMD</td>
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
                                                    <button className="primaryBtn" onClick={(e) => {e.stopPropagation(); claimOrderedUnstake(pool)}}>Claim</button>
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
                        ))
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {poolsCopy.length > itemsPerPage && (
                <ul className={styles.pagination}>
                    <li
                        onClick={() => {
                            if (currentPage !== 0) {
                                handlePageClick(currentPage - 1);
                            }
                        }}
                        className={currentPage === 0 ? styles.disabled : ""}
                    >
                        Previous
                    </li>
                    {renderPageNumbers()}
                    <li
                        onClick={() => {
                            if (currentPage !== pageCount - 1) {
                                handlePageClick(currentPage + 1);
                            }
                        }}
                        className={currentPage === pageCount - 1 ? styles.disabled : ""}
                    >
                        Next
                    </li>
                </ul>
            )}
        </div>
    );
};

export default ValidatorsTable;
