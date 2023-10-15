import React from "react";
import "../styles/pooldetails.css";
import BigNumber from 'bignumber.js';
import { Pool } from "../model/model";
import { Table } from "react-bootstrap";
import { Delegator } from "../model/model";
import "react-toastify/dist/ReactToastify.css";
import Accordion from "react-bootstrap/Accordion";
import { ToastContainer } from "react-toastify";
import BlockchainService from '../utils/BlockchainService';
import { ModelDataAdapter } from "../model/modelDataAdapter";

BigNumber.config({ EXPONENTIAL_AT: 1e+9 })

interface PoolProps {
  pool: Pool;
  adapter: ModelDataAdapter;
}

class PoolDetail extends React.Component<PoolProps> {
  private blockchainService: BlockchainService;
  // notify = (msg: string) => toast(msg);

  state = {
    rewardClaimAmount: '0',
    stakeWithdrawAmount: '0',
    hasRewardClaimable: false,
    hasWithdrawClaimable: false,
    delegatorsData: []
  }

  constructor(props: PoolProps) {
    super(props);
    this.blockchainService = new BlockchainService(props);
  }

  public componentDidMount() {
    console.log("Pool Details Loaded");
    this.getRewardClaimableAmount();
    this.getWithdrawClaimableAmount()
    this.getDelegatorsData();
  }

  public componentDidUpdate(prevProps: Readonly<PoolProps>, prevState: Readonly<{}>, snapshot?: any): void {
    console.log("Pool Details Updated");
    this.getRewardClaimableAmount();
    this.getWithdrawClaimableAmount();
    // this.resetInputFields();
    if (prevProps.pool.stakingAddress !== this.props.pool.stakingAddress) {
      this.getDelegatorsData();
    }
    
  }

  getDelegatorsData = async () => {
    let tempArray:any = [];
    await Promise.all(this.props.pool.delegators.map(async (delegator: Delegator, i: number) => {
      const stakedAmount = await this.props.adapter.stContract.methods
        .stakeAmount(this.props.pool.stakingAddress, delegator.address)
        .call();
      const data: any = {
        address: delegator.address,
        stakeAmount: BigNumber(stakedAmount.toString()).dividedBy(10 ** 18).toString(),
      };
      tempArray.push(data)
    }))

    this.setState({
      delegatorsData: tempArray
    })
   }

  getWithdrawClaimableAmount = async () => {
    const { adapter, pool } = this.props;
    const context = adapter.context;

    if (context.myAddr) {
      const amount = await adapter.stContract.methods.orderedWithdrawAmount(pool.miningAddress, context.myAddr).call();
      const unlockEpoch = parseInt(await adapter.stContract.methods.orderWithdrawEpoch(pool.miningAddress, context.myAddr).call()) + 1;
      if (this.state.stakeWithdrawAmount !== amount) {
        this.setState({stakeWithdrawAmount: amount, hasWithdrawClaimable: parseInt(amount) > 0 && unlockEpoch <= context.stakingEpoch})
      }
    }
  }

  resetInputFields = () => {
    const stakeInput = document.getElementsByClassName('stakeAmountInput');
    const withdrawStakeInput = document.getElementsByClassName('withdrawAmount');

    if (stakeInput.length > 0) (stakeInput[0] as HTMLInputElement).value = '';
    
    if (withdrawStakeInput.length > 0) (withdrawStakeInput[0] as HTMLInputElement).value = '';
  }

  getRewardClaimableAmount = async () => {
      const claimableAmount = await this.blockchainService.getRewardClaimableAmount();
      if (this.state.rewardClaimAmount !== claimableAmount) {
        this.setState({rewardClaimAmount: claimableAmount})
        this.setState({hasRewardClaimable: BigNumber(claimableAmount).isGreaterThan(0) ? true : false});
        this.props.pool.claimableReward = BigNumber(claimableAmount).dividedBy(Math.pow(10, 18)).toFixed(2);
      }
  }

  capitalizeString = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  refreshData = async () => {
    this.getRewardClaimableAmount();
    this.getWithdrawClaimableAmount();
    this.getDelegatorsData();
    await this.props.adapter.reUpdatePool(this.props.pool);
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

        <Accordion defaultActiveKey={['0','1','2','3','4','5','6','7']} alwaysOpen>
          <Accordion.Item eventKey="0">
            <Accordion.Header>Details</Accordion.Header>
            <Accordion.Body>
              <div className="stakingInfo">
                <div>
                  <span>Bans</span>
                  <span>{this.props.pool.banCount}</span>
                </div>

                <div>
                  <span>Available</span>
                  <span>{this.capitalizeString(this.props.pool.isAvailable.toString())}</span>
                </div>
                
                <div>
                  <span>Active Validator</span>
                  <span>{this.capitalizeString(this.props.pool.isCurrentValidator.toString())}</span>
                </div>                

                <div>
                  <span>Pending Validator</span>
                  <span>{this.capitalizeString(this.props.pool.isPendingValidator.toString())}</span>
                </div>

                <div>
                  <span>Has Enough Stake</span>
                  <span>{this.capitalizeString(this.props.pool.isActive.toString())}</span>
                </div>

                <div>
                  <span>To be Elected</span>
                  <span>{this.capitalizeString(this.props.pool.isToBeElected.toString())}</span>
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
                    {BigNumber(this.props.pool.candidateStake as any).dividedBy(Math.pow(10, 18)).toFixed(2)} DMD
                  </span>
                </div>

                <div>
                  <span>Total Stake</span>
                  <span>
                    {BigNumber(this.props.pool.totalStake as any).dividedBy(Math.pow(10, 18)).toFixed(2)} DMD
                  </span>
                </div>

                <div>
                  <span>My Stake</span>
                  <span>
                    {BigNumber(this.props.pool.myStake as any).dividedBy(Math.pow(10, 18)).toFixed(2)} DMD
                  </span>
                </div>

                <div>
                  <span>Claimable Reward</span>
                  <span>{this.props.pool.claimableReward} DMD</span>
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Delegators</Accordion.Header>
            <Accordion.Body>
              <React.Fragment>
                <Table>
                  <thead>
                    <tr>
                      <td>Delegator</td>
                      <td>Amount</td>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.delegatorsData.map((delegator: any, i: number) => (
                      <tr key={i}>
                        <td>{delegator.address}</td>
                        <td>{delegator.stakeAmount} DMD</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </React.Fragment>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>Pool Staking</Accordion.Header>

            <Accordion.Body>
              <div className="poolDetailsContainer">
                {/* <h1 className="delegateStakeHeading">Delegate Stake</h1> */}

                <label htmlFor="stakeamount">Stake</label>
                <form
                  onSubmit={async (e) => {
                    await this.blockchainService.handleDelegateStake(e);
                    await this.refreshData();
                    this.forceUpdate();                    
                  }}
                  className="delegateStakeForm"
                >
                  <input
                    type="number"
                    placeholder="Stake amount"
                    className="stakeAmountInput"
                    required
                    id="stakeamount"
                  />

                  {

                    <button type="submit" className="submitBtn">
                      Stake
                    </button>
                  }
                  
                </form>

                <label>Withdraw Stake</label>
                <form className="withdrawForm" onSubmit={(e) => this.blockchainService.handleWithdraw(e, this.props.pool)}>
                  <input className="withdrawAmount" name="withdrawAmount" type="number" placeholder="Stake amount" required/>
                  <button type="submit" className="submitBtn">Withdraw</button>
                </form>

                {
                  this.state.hasWithdrawClaimable ? 
                    <>
                    <label>Claim Stake:</label>
                    <form className="claimStake" onSubmit={this.blockchainService.claimStake}>
                        <input value={`${BigNumber(this.state.stakeWithdrawAmount).dividedBy(Math.pow(10, 18)).toFixed(2)} DMD`} disabled></input>
                        <button type="submit" className="submitBtn">Claim</button>
                    </form>
                    </>
                  : ""
                }

                {
                  this.state.hasRewardClaimable ?
                    <>
                    <label>Claim Reward:</label>
                    <form className="claimStake" onSubmit={e => this.blockchainService.claimReward(e, undefined)}>
                        <input value={`${BigNumber(this.state.rewardClaimAmount).dividedBy(Math.pow(10, 18)).toFixed(2)} DMD`} disabled></input>
                        <button type="submit" className="submitBtn">Claim</button>
                    </form>
                    </>
                  : ""
                }
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </>
    );
    return result;
  }
}

export default PoolDetail;
