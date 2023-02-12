import BN from "bn.js";
import React from "react";
import "./styles/pooldetails.css"
import { Pool } from './model/model';
import Accordion from 'react-bootstrap/Accordion';
import { ModelDataAdapter } from './model/modelDataAdapter';

interface PoolProps {
    pool: Pool
    adapter: ModelDataAdapter
}

class PoolDetail extends React.Component<PoolProps> {

    constructor(props: PoolProps) {
        super(props)
    }

    handleDelegateStake = async (e: any) => {
        e.preventDefault();
        const stakeAmount = e.target[0].value;

        const { adapter, pool } = this.props;
        const context = adapter.context;
        const previousStakeAmount = pool.myStake;
        const minStake = pool === context.myPool ? context.candidateMinStake : context.delegatorMinStake as any / 10**18;

        const accBalance = await adapter.postProvider.eth.getBalance(context.myAddr);

        if (stakeAmount > accBalance) {
            console.log(context.myBalance.toString())
            alert(`insufficient balance (${context.myBalance}) for selected amount ${stakeAmount}`);
        } else if (!context.canStakeOrWithdrawNow) {
            alert('outside staking/withdraw time window');
        } else if (pool !== context.myPool && pool.candidateStake < context.candidateMinStake) {
            // TODO: this condition should be checked before even enabling the button
            alert('insufficient candidate (pool owner) stake');
        } else if (previousStakeAmount + stakeAmount < minStake) {
            alert(`min staking amount is ${minStake}`);
        } else if (pool.isBanned()) {
            alert('cannot stake on a pool which is currently banned');
        } else {
            await adapter.stake(pool.stakingAddress, stakeAmount);
        }
    }

    public render(): JSX.Element {
        
        const result = (
            <>
                <Accordion>
                    <Accordion.Item eventKey="0">
                        <Accordion.Header>Bans</Accordion.Header>
                        <Accordion.Body>{this.props.pool.banCount}</Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="1">
                        <Accordion.Header>Delegators</Accordion.Header>
                        <Accordion.Body>{this.props.pool.delegators.length}</Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="2">
                        <Accordion.Header>Candidate Stake</Accordion.Header>
                        <Accordion.Body>{this.props.pool.candidateStake.toString()}</Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="3">
                        <Accordion.Header>Total Stake</Accordion.Header>
                        <Accordion.Body>{this.props.pool.totalStake.toString()}</Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="4">
                        <Accordion.Header>My Stake</Accordion.Header>
                        <Accordion.Body>{this.props.pool.myStake.toString()}</Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="5">
                        <Accordion.Header>Claimable Reward</Accordion.Header>
                        <Accordion.Body>{this.props.pool.claimableReward}</Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="6">
                        <Accordion.Header>Minning Address</Accordion.Header>
                        <Accordion.Body>{this.props.pool.miningAddress}</Accordion.Body>
                    </Accordion.Item>
                </Accordion>

                {/* <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>Bans</th>
                            <th>Delegators</th>
                            <th>Candidate Stake</th>
                            <th>Total Stake</th>
                            <th>My Stake</th>
                            <th>Claimable Reward</th>
                            <th>Minning Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{this.props.pool.banCount}</td>
                            <td>{this.props.pool.delegators.length}</td>
                            <td>{this.props.pool.candidateStake.toString()}</td>
                            <td>{this.props.pool.totalStake.toString()}</td>
                            <td>{this.props.pool.myStake.toString()}</td>
                            <td>{this.props.pool.claimableReward}</td>
                            <td>{this.props.pool.miningAddress}</td>
                        </tr>
                    </tbody>
                </Table> */}

                <div className="poolDetailsContainer">
                   <h1 className="delegateStakeHeading">Delegate Stake</h1>

                   <form onSubmit={e => this.handleDelegateStake(e)} className="delegateStakeForm">
                        <input type="number" placeholder="Stake Amount" className="stakeAmountInput" required/>
                        <button type="submit" className="stakeSubmitBtn">Stake</button>
                   </form>
                </div>
            </>
        )
        return result
    }

}

export default PoolDetail;