import BN from "bn.js";
import React from "react";
import "./styles/pooldetails.css";
import { Pool } from "./model/model";
import { Table } from "react-bootstrap";
import "react-toastify/dist/ReactToastify.css";
import Accordion from "react-bootstrap/Accordion";
import { ToastContainer, toast } from "react-toastify";
import { ModelDataAdapter } from "./model/modelDataAdapter";

interface PoolProps {
  pool: Pool;
  adapter: ModelDataAdapter;
}

class PoolDetail extends React.Component<PoolProps> {
  notify = (msg: string) => toast(msg);

  constructor(props: PoolProps) {
    super(props);
  }

  handleDelegateStake = async (e: any) => {
    e.preventDefault();
    const stakeAmount = e.target[0].value;

    const { adapter, pool } = this.props;
    const context = adapter.context;

    if (!context.myAddr) {
      this.notify("Please connect wallet!");
      return true;
    }

    const previousStakeAmount = pool.myStake;
    const minStake =
      pool === context.myPool
        ? context.candidateMinStake
        : (context.delegatorMinStake as any) / 10 ** 18;

    const accBalance = await adapter.postProvider.eth.getBalance(
      context.myAddr
    );

    if (stakeAmount > accBalance) {
      console.log(context.myBalance.toString());
      alert(
        `insufficient balance (${context.myBalance}) for selected amount ${stakeAmount}`
      );
    } else if (!context.canStakeOrWithdrawNow) {
      alert("outside staking/withdraw time window");
    } else if (
      pool !== context.myPool &&
      pool.candidateStake < context.candidateMinStake
    ) {
      // TODO: this condition should be checked before even enabling the button
      alert("insufficient candidate (pool owner) stake");
    } else if (previousStakeAmount + stakeAmount < minStake) {
      alert(`min staking amount is ${minStake}`);
    } else if (pool.isBanned()) {
      alert("cannot stake on a pool which is currently banned");
    } else {
      await adapter.stake(pool.stakingAddress, stakeAmount);
    }
  };

  public render(): JSX.Element {
    const result = (
      <>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />

        <Accordion>
          <Accordion.Item eventKey="0">
            <Accordion.Header>General Details</Accordion.Header>
            <Accordion.Body>
              <div className="stakingInfo">
                <div>
                  <span>Bans</span>
                  <span>{this.props.pool.banCount}</span>
                </div>

                <div>
                  <span>Minning Address</span>
                  <span>{this.props.pool.miningAddress}</span>
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Staking Info</Accordion.Header>
            <Accordion.Body>
              <div className="stakingInfo">
                <div>
                  <span>Candidate Stake</span>
                  <span>
                    {(this.props.pool.candidateStake as any) / 10 ** 18} DMD
                  </span>
                </div>

                <div>
                  <span>Total Stake</span>
                  <span>
                    {(this.props.pool.totalStake as any) / 10 ** 18} DMD
                  </span>
                </div>

                <div>
                  <span>My Stake</span>
                  <span>{(this.props.pool.myStake as any) / 10 ** 18} DMD</span>
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>Claimable Reward</Accordion.Header>
            <Accordion.Body>{this.props.pool.claimableReward}</Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Delegators</Accordion.Header>
            <Accordion.Body>{this.props.pool.delegators.length}</Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>Pool Staking</Accordion.Header>

            <Accordion.Body>
              <div className="poolDetailsContainer">
                {/* <h1 className="delegateStakeHeading">Delegate Stake</h1> */}

                <form
                  onSubmit={(e) => this.handleDelegateStake(e)}
                  className="delegateStakeForm"
                >
                  <input
                    type="number"
                    placeholder="Stake Amount"
                    className="stakeAmountInput"
                    required
                  />
                  <button type="submit" className="stakeSubmitBtn">
                    Stake
                  </button>
                </form>
              </div>
            </Accordion.Body>
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
      </>
    );
    return result;
  }
}

export default PoolDetail;
