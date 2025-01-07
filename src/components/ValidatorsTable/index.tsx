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
import Navigation from "../Navigation";
import copy from "copy-to-clipboard";
import { toast } from "react-toastify";
import ColumnsFilterModal from "./ColumnsFilter";

let tableFieldsDefault = [
    { key: "jazzIcon", label: "", sortAble: false, updateAble: false, hide: false },
    { key: "isActive", label: "Status", sortAble: true, updateAble: true, hide: false },
    { key: "stakingAddress", label: "Wallet", sortAble: false, updateAble: true, hide: false },
    { key: "totalStake", label: "Total Stake", sortAble: true, updateAble: true, hide: false },
    { key: "votingPower", label: "Voting Power", sortAble: true, updateAble: true, hide: false },
    { key: "score", label: "Score", sortAble: true, updateAble: true, hide: false },
    { key: "connectivityReport", label: "CR", sortAble: true, updateAble: true, hide: false },
    { key: "myStake", label: "My Stake", sortAble: true, updateAble: false, hide: false },
    { key: "stakeBtn", label: "", sortAble: false, updateAble: false, hide: false },
    { key: "unstakeClaimBtn", label: "", sortAble: false, updateAble: false, hide: false },
];

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

    const [tableFields, setTableFields] = useState(tableFieldsDefault);

    useEffect(() => {
        // If a filter is passed via state, apply it
        if (location.state?.filter) {
            setFilter(location.state.filter);
        }
    }, [location.state]);

    // Load tableFieldsDefault from local storage if it exists, otherwise use the default
    useEffect(() => {
        const storedTableFields = localStorage.getItem('validatorFieldsData');
        if (storedTableFields) {
            setTableFields(JSON.parse(storedTableFields));
        } else {
            localStorage.setItem('validatorFieldsData', JSON.stringify(tableFieldsDefault));
        }
    }, []);

    // Update local storage whenever tableFields changes
    useEffect(() => {
        localStorage.setItem('validatorFieldsData', JSON.stringify(tableFields));
    }, [tableFields]);

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

    const copyData = (e: React.MouseEvent<HTMLDivElement>, data: string, msg: string) => {
        e.stopPropagation();
        copy(data);
        toast.success(msg);
    };
    
    // Apply filters and search
    let poolsCopy = [...pools];

    if (filter === 'valid') {
        poolsCopy = poolsCopy.filter(pool => pool.isToBeElected && !pool.isActive);
    } else if (filter === 'active') {
        poolsCopy = poolsCopy.filter(pool => pool.isActive);
    } else if (filter === 'invalid') {
        poolsCopy = poolsCopy.filter(pool => !pool.isActive && !pool.isToBeElected);
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
            let keyA, keyB;
    
            if (sortConfig.key === 'myStake' || sortConfig.key === 'score' || sortConfig.key === 'connectivityReport') {
                keyA = parseFloat(a[sortConfig.key] || '0');
                keyB = parseFloat(b[sortConfig.key] || '0');
            } else {
                keyA = a[sortConfig.key];
                keyB = b[sortConfig.key];
            }
    
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

    const renderHeaders = () => {
        return (
            <thead>
                <tr>
                    {tableFields.filter(field => !field.hide).map((column, index) => {
                        if (column.key === 'myStake' && !userWallet.myAddr) {
                            return <th key={index}></th>; // Skip rendering "My Stake" column if userWallet.myAddr is not present
                        }
                        return (
                            <th
                                key={index}
                                className={getClassNamesFor(column.key)}
                                onClick={() => column.sortAble && requestSort(column.key)}
                            >
                                {column.label}
                                {column.sortAble && column.key && column.key !== 'stakingAddress' && column.key !== 'jazzIcon' && column.key != 'stakeBtn' && column.key != 'unstakeClaimBtn' && (
                                    <>
                                        {column.key !== 'myStake' && <Tooltip text={getTooltipText(column.key)} />}
                                        <FontAwesomeIcon icon={faSort} size="xs" />
                                    </>
                                )}
                            </th>
                        );
                    })}
                </tr>
            </thead>
        );
    };
    
    const renderRows = (currentItems: any[]) => {
        return currentItems.map((pool, index) => (
            <tr onClick={() => navigate(`/staking/details/${pool.stakingAddress}`)} className={styles.tableBodyRow} key={index}>
                {tableFields.filter(field => !field.hide).map((column, colIndex) => {
                    if (column.key === 'jazzIcon') {
                        return (
                            <td key={colIndex}>
                                <Jazzicon diameter={40} seed={jsNumberForAddress(pool.stakingAddress)} />
                            </td>
                        );
                    } else if (column.key === 'isActive') {
                        return (
                            <td key={colIndex} className={pool?.isActive || (pool.isToBeElected || pool.isPendingValidator) ? styles.poolActive : styles.poolBanned}>
                                {typeof pool.isActive === 'boolean'
                                    ? pool.isActive ? <strong>Active</strong> : (pool.isToBeElected || pool.isPendingValidator) ? "Valid" : "Invalid"
                                    : (<div className={styles.loader}></div>)}
                            </td>
                        );
                    } else if (column.key === 'stakingAddress') {
                        return (
                            <td key={colIndex} className={styles.addressesContainer + " " + styles.walletColumn}>
                                {pool.stakingAddress ? (
                                    <>
                                        <div onClick={(e) => copyData(e, pool.miningAddress, "Copied staking address")}>{pool.stakingAddress}</div>
                                        {pool.miningAddress && (
                                            <div onClick={(e) => copyData(e, pool.miningAddress, "Copied mining address")}>{pool.miningAddress}</div>
                                        )}
                                    </>
                                ) : (
                                    <div className={styles.loader}></div>
                                )}
                            </td>
                        );
                    } else if (column.key === 'totalStake') {
                        return (
                            <td key={colIndex}>
                                {BigNumber(pool.totalStake ?? 0) ? BigNumber(BigNumber(pool.totalStake ?? 0)).dividedBy(10**18).toFixed(4) + " DMD" : (<div className={styles.loader}></div>)}
                            </td>
                        );
                    } else if (column.key === 'votingPower') {
                        return (
                            <td key={colIndex}>
                                {pool.votingPower && pool.votingPower.toString() !== 'NaN' && pool.votingPower.toString() !== 'Infinity'
                                    ? `${pool.votingPower.toString()} %`
                                    : <div className={styles.loader}></div>}
                            </td>
                        );
                    } else if (column.key === 'score') {
                        return (
                            <td key={colIndex}>{pool.score !== undefined && pool.score !== null ? pool.score : (<div className={styles.loader}></div>)}</td>
                        );
                    } else if (column.key === 'connectivityReport') {
                        return (
                            <td key={colIndex} style={{ color: pool.isFaultyValidator ? 'red' : (Number(pool.connectivityReport) > 0 ? 'orange' : 'inherit'), fontWeight: pool.isFaultyValidator ? 'bold' : 'normal' }}>
                                {pool.connectivityReport !== undefined && pool.connectivityReport !== null ? pool.connectivityReport : (<div className={styles.loader}></div>)}
                            </td>
                        );
                    } else if (column.key === 'myStake' && userWallet.myAddr) {
                        return (
                            <td key={colIndex}>{userWallet.myAddr && BigNumber(pool.myStake) ? BigNumber(pool.myStake).dividedBy(10**18).toFixed(0) : (<div className={styles.loader}></div>)} DMD</td>
                        );
                    } else if (column.key === 'stakeBtn' && userWallet.myAddr) {
                        return (
                            <td key={colIndex}>
                                {(pool.isActive || pool.isToBeElected || pool.isPendingValidator) && BigNumber(pool.totalStake ?? 0).isLessThan(BigNumber(50000).multipliedBy(10**18)) && (
                                    <StakeModal buttonText="Stake" pool={pool} />
                                )}
                            </td>
                        );
                    } else if (column.key === 'unstakeClaimBtn' && userWallet.myAddr) {
                        return (
                            <td key={colIndex}>
                                {BigNumber(pool.orderedWithdrawAmount).isGreaterThan(0) && BigNumber(pool.orderedWithdrawUnlockEpoch).isLessThanOrEqualTo(stakingEpoch) ? (
                                    <button className="primaryBtn" onClick={(e) => {e.stopPropagation(); claimOrderedUnstake(pool)}}>Claim</button>
                                ) : (
                                    BigNumber(pool.myStake).isGreaterThan(0) && (
                                        <UnstakeModal buttonText="Unstake" pool={pool} />
                                    )
                                )}
                            </td>
                        );
                    } else {
                        return <td key={colIndex}></td>;
                    }
                })}
            </tr>
        ));
    };    
    
    const getTooltipText = (key: string) => {
        switch (key) {
            case 'isActive':
                return "Active candidate is part of the active set; Valid - is not part of the active set, but can be elected; Invalid - a candidate who is flagged unavailable on the blockchain or has not enough stake";
            case 'totalStake':
                return "Total delegated DMD (self-staked DMD + delegates' stake)";
            case 'votingPower':
                return "Value that approximates a node’s influence in the DAO participation";
            case 'score':
                return "Combined score value, based on the results of generating the shared key, the stability of the validator connection and misbehaviour reports from other validators";
            case 'connectivityReport':
                return "Connectivity report value, based on how many other active validators did report bad connectivity towards that node.";
            default:
                return "";
        }
    };    

    return (
        <div className={styles.sectionContainer + " sectionContainer"}>
            <Navigation start="/" toPage="/" />
            <div className={styles.stakingHeading}>
                <h1>
                    Validators
                </h1>
                <span>
                    <span style={{ color: "black", fontWeight: "normal" }}>
                        <Tooltip text="Total" width="60px" heading={pools.length.toString()} />
                    </span>
                    {" "}|
                    <strong style={{ color: "green" }}>
                        <Tooltip text="Active" width="60px" heading={pools.filter((p) => p.isActive).length.toString()} />
                    </strong>
                    {" "}|
                    <span style={{ color: "green", fontWeight: "normal" }}>
                        <Tooltip text="Valid" width="60px" heading={pools.filter((p) => p.isToBeElected && !p.isActive).length.toString()} />
                    </span>
                    {" "}|
                    <span style={{ color: "red" }}>
                        <Tooltip text="Invalid" width="60px" heading={pools.filter((p) => !p.isActive && !p.isToBeElected).length.toString()} />
                    </span>
                </span>
            </div>

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

                <ColumnsFilterModal buttonText="Customize" tableFields={tableFields} setTableFields={setTableFields} defaultFields={tableFieldsDefault} />
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.styledTable}>
                    {renderHeaders()}
                    {/* <thead>
                        <tr>
                            <th></th>
                            <th className={getClassNamesFor('isActive')} onClick={() => requestSort('isActive')}>
                                Status
                                <Tooltip text="Active candidate is part of the active set; Valid - is not part of the active set, but can be elected; Invalid - a candidate who is flagged unavailable on the blockchain or has not enough stake" />
                                <FontAwesomeIcon icon={faSort} size="xs" />
                            </th>
                            <th className={getClassNamesFor('stakingAddress') + " " + styles.walletColumnHeader}>
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
                            <th className={getClassNamesFor('connectivityReport')} onClick={() => requestSort('connectivityReport')}>
                                CR
                                <Tooltip text="Connectivity report value, based on how many other active validators did report bad connectivity towards that node." />
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
                    </thead> */}
                    <tbody>
                        {renderRows(currentItems)}
                        {/* {currentItems.length <= 0 ? (
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
                                <td className={pool?.isActive || (pool.isToBeElected || pool.isPendingValidator) ? styles.poolActive : styles.poolBanned}>
                                    {typeof pool.isActive === 'boolean'
                                        ? pool.isActive ? <strong>Active</strong> : (pool.isToBeElected || pool.isPendingValidator) ? "Valid" : "Invalid"
                                        : (<div className={styles.loader}></div>)}
                                </td>
                                <td className={styles.addressesContainer + " " + styles.walletColumn}>
                                    {pool.stakingAddress ? (
                                        <>
                                            <div onClick={(e) => copyData(e, pool.miningAddress, "Copied staking address")}>{pool.stakingAddress}</div>
                                            {pool.miningAddress && (
                                                <div onClick={(e) => copyData(e, pool.miningAddress, "Copied mining address")}>{pool.miningAddress}</div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={styles.loader}></div>
                                    )}
                                </td>
                                <td>{
                                    BigNumber(pool.totalStake ?? 0) ? BigNumber(BigNumber(pool.totalStake ?? 0)).dividedBy(10**18).toFixed(4) + " DMD" : (<div className={styles.loader}></div>)
                                }</td>
                                <td>
                                    {pool.votingPower && pool.votingPower.toString() !== 'NaN' && pool.votingPower.toString() !== 'Infinity'
                                        ? `${pool.votingPower.toString()} %`
                                        : <div className={styles.loader}></div>}
                                </td>
                                <td>{pool.score !== undefined && pool.score !== null ? pool.score : (<div className={styles.loader}></div>)}</td>
                                <td style={{ color: pool.isFaultyValidator ? 'red' : (Number(pool.connectivityReport) > 0 ? 'orange' : 'inherit'), fontWeight: pool.isFaultyValidator ? 'bold' : 'normal' }}>
                                    {pool.connectivityReport !== undefined && pool.connectivityReport !== null ? pool.connectivityReport : (<div className={styles.loader}></div>)}
                                </td>
                                {
                                    userWallet.myAddr ? <>
                                        <td>{userWallet.myAddr && BigNumber(pool.myStake) ? BigNumber(pool.myStake).dividedBy(10**18).toFixed(0) : (<div className={styles.loader}></div>) } DMD</td>
                                        <td>
                                            {
                                                (pool.isActive || pool.isToBeElected || pool.isPendingValidator) && BigNumber(pool.totalStake ?? 0).isLessThan(BigNumber(50000).multipliedBy(10**18)) && (
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
                        } */}
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
