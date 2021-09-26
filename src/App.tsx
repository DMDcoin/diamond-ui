import React from 'react';
import { observer } from 'mobx-react';
import logo from './logo.svg';
import './App.css';
import { action, computed, observable } from 'mobx';
import Context from './model/context';
import BN from "bn.js";
import 'react-tabulator/lib/styles.css';
import { ReactTabulator } from 'react-tabulator'


interface AppProps {
  context: Context;
}

@observer
class App extends React.Component<AppProps, {}> {

  private ui(o: BN) {
    

  }

  // TODO: should the key prop be here or inside the view?
  public render(): JSX.Element {

    const { context } = this.props;
    const minStakeAmount = this.ui(context.candidateMinStake);



    const poolList = context.pools.map((pool) => (
      <div>{pool}</div>
    ));

    const validatorsWithoutPoolSection = context.currentValidatorsWithoutPools.map((address) => (
      <div className="text-danger" title="Validators can loose their pool association when the first validators after chain launch fail to take over control. (missed out key generation ?)">Validator without a Pool Association: {address}</div>
    ));

    const columns = [
      { title: "Active", field: "isActive" },
      { title: "to be elected", field: "isToBeElected" },
      { title: "pending", field: "isPendingValidator" },
      { title: "available", field: "isAvailable" },
      { title: "Pool address", field: "stakingAddress", align: "center" },
      { title: "Miner address", field: "miningAddress", align: "center" },
      { title: "Added in Epoch", field: "addedInEpoch", align: "center" }
    ];


    // TODO: css template/framework / convention to have a decent layout without writing CSS
    return (
      <div className="App">
        <header>
          <p>
            account: <span className="text-primary">{context.myAddr}</span> |
            balance: {this.ui(context.myBalance)} {context.coinSymbol}<br />
            current block nr: {context.currentBlockNumber} | current epoch: {this.ui(context.stakingEpoch)} | epoch start Block {context.epochStartBlock} | epoch start Time {new Date(context.epochStartTime * 1000).toLocaleString()} | deltaPot {context.deltaPot} | reinsertPot {context.reinsertPot} | validators# | {context.pools.filter(x=>x.isCurrentValidator).length})
            {/* <span className={`${this.isStakingAllowed ? 'text-success' : 'text-danger'}`}> staking {this.stakingAllowedState}: {context.stakingAllowedTimeframe} blocks</span> */}
            {validatorsWithoutPoolSection}
            <div>
              <input type="checkbox" id="latest-block" name="latest-block" checked />
              <label htmlFor="latest-block">latest block</label>
              <input type="number" min="0" required></input>
              <input onChange={(e) => this.historicChanged(e)} type="checkbox" defaultChecked={false} />
              {/* <input             
                {...this.props.context.showHistoric .bind({
                  type: 'checkbox',
              })}
    checked={field.value}
/> {field.label} */}
            </div>
            <ReactTabulator
              data={data}
              columns={columns}
              tooltips={true}
              layout={"fitData"}
              />
          </p>
        </header>

        <div id="poolList">
          <div className="spinner-border" hidden={!context.isSyncingPools} role="status">
            <span className="sr-only">Syncing Pools...</span>
          </div>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>pool address</th>
                {/* <th>mining address</th> */}
                <th>validator stake share / reward share % in current epoch</th>
                <th>nr delegators</th>
                <th>candidate stake</th>
                <th>total stake</th>
                <th>my stake</th>
                <th>claimable</th>
                <th>staking actions</th>
                <th>uncollected reward</th>
                <th>reward actions</th>
              </tr>
            </thead>
            <tbody>
              {poolList}
            </tbody>
          </table>
        </div>
        <hr />
        <div id="addPool" hidden={context.iHaveAPool || context.isSyncingPools}>
          <form spellCheck={false}>
            <label>pool address:   <input type="text" value={context.myAddr} readOnly title="determined by current wallet address" /></label> <br />
            <label>public key: <input type="text" defaultValue={this.examplePublicKey} onChange={(e) => {
                this.publicKey = e.currentTarget.value;
                this.calculatedMiningAddress = Context.getAddressFromPublicKeyInfoText(this.publicKey);
                }} /></label> <br />
            <label>mining address:</label><label>{this.calculatedMiningAddress}</label><br />
            <label>stake amount ({context.coinSymbol}):  <input type="number" min={minStakeAmount} defaultValue={this.stakeAmountStr} onChange={(e) => (this.stakeAmountStr = e.currentTarget.value)} /></label> <br />
            <div className="spinner-border" hidden={!this.processing} role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <button type="button" disabled={this.processing} onClick={this.handleAddPool}>Add Pool</button>
          </form>
        </div>
        <div id="removePool" hidden={!context.iHaveAPool}>
          <div className="spinner-border" hidden={!this.processing} role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <button type="button" disabled={this.processing}>Remove My Pool (TODO)</button>
        </div>
        
      </div>
    );
  }
  historicChanged(e: React.ChangeEvent<HTMLInputElement>): void {
    
    const isHistoric = e.target.checked;

    //this.props.context.showHistoric(isHistoric);

    this.props.context.showHistoric(isHistoric);
  }

}

export default App;
