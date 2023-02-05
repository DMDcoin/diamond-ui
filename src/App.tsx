import React, { Fragment } from 'react';
import { observer } from 'mobx-react';
import './App.css';
import BN from "bn.js";
import 'react-tabulator/lib/styles.css';
import "react-tabulator/css/bootstrap/tabulator_bootstrap.min.css"; // use Theme(s)
import './styles/tabulator.css';

import WalletConnectProvider from "@walletconnect/web3-provider";

import dmd_logo from "./logo-hor.svg";

import { ReactTabulator } from 'react-tabulator';
import { ModelDataAdapter } from './model/modelDataAdapter';
import Web3Modal from "web3modal";
import { ReactTabulatorViewOptions } from './utils/ReactTabulatorViewOptions';
import { BlockSelectorUI } from './components/block-selector-ui';
import { Tab, Tabs } from 'react-bootstrap';
import { ColumnDefinition } from 'react-tabulator/lib/ReactTabulator';
// import { ContractDetailsUI } from './components/contract-details-ui';


interface AppProps {
  modelDataAdapter: ModelDataAdapter,
}


@observer
class App extends React.Component<AppProps> {
  private examplePublicKey = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

  state = {
    showModal: false
  }
  

  private ui(o: BN) {
    return o.toString(10);
  }

  private updatePoolsData(data: []) {

  }

  private onShowWeb3Modal() {


    console.log('this: ', this);
    this.setupWeb3Modal().then(async (provider) => {
      // Subscribe to provider connection
      provider.on("connect", (info: { chainId: number }) => {
        console.log(info);
      });
    })
  }

  private test(e: any, row: any) {
    console.log("Clicked:;", e, row)
  }

  private async setupWeb3Modal() {

    const url = this.props.modelDataAdapter.url;
    //const url = 'http://localhost:8540';

    const providerOptions = {
      /* See Provider Options Section */
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          rpc: {
            71117: url
          }
        }
      },

    };

    const web3Modal = new Web3Modal({
      network: "mainnet", // optional
      cacheProvider: true, // optional
      providerOptions // required
    });

    const provider = await web3Modal.connect();
    console.log('got provider: ', provider);
    return provider;
  }

  public componentDidMount() {
    console.log('component did mount.');
    this.props.modelDataAdapter.registerUIElement(this);

    const { modelDataAdapter } = this.props;
    const { context } = modelDataAdapter;
    const poolsData = context.pools;
    this.setState({poolsData});
  }

  public componentWillUnmount() {
    console.log('component will unmount.');
    this.props.modelDataAdapter.unregisterUIElement(this);
  }


  public render(): JSX.Element {

    const { modelDataAdapter } = this.props;
    const { context } = modelDataAdapter;
    

    const validatorsWithoutPoolSection = context.currentValidatorsWithoutPools.map((address) => (
      <div className="text-danger" title="Validators can loose their pool association when the first validators after chain launch fail to take over control. (missed out key generation ?)">Validator without a Pool Association: {address}</div>
    ));

    const columns : ColumnDefinition[] = [
      { title: "Pool address", field: "stakingAddress", headerFilter:true, hozAlign: "left",  width:370 },
      { title: "Stake", field: "totalStake", formatter: "progress", formatterParams: { min: 0, max: 50000000000000000000000 }, width: 100 },
      { title: "S", headerTooltip: "Staked - has enough stake ?" ,field: "isActive", headerFilter:true, formatter: "tickCross", width: 30},
      { title: "A", headerTooltip: "Available - is marked as available for upcomming validator set selection", field: "isAvailable", headerFilter:true, formatter: "tickCross",  width: 30 },
      { title: "C", headerTooltip: "Current - is part of current validator set", field: "isCurrentValidator", headerFilter:true, formatter: "tickCross", width: 30 },

      /* reall required ? */
      { title: "E", field: "isToBeElected", headerTooltip: "to be Elected - fulfills all requirements to be elected as validator for the upcomming epoch.", headerFilter:true, formatter: "tickCross", width: 30 },
      /* key generation fields */
      { title: "P", field: "isPendingValidator", headerTooltip: "Pending - Validator in key generation phase that should write it's acks and parts", headerFilter:true,  formatter: "tickCross", width: 30 },
      { title: "K1", field: "isWrittenParts", headerTooltip: "Key 1 (Parts) was contributed", headerFilter:true, formatter: "tickCross", width: 30 },
      { title: "K2", field: "isWrittenAcks", headerTooltip: "Key 2 (Acks) was contributed - Node has written all keys", headerFilter:true, formatter: "tickCross", width: 30 },
      // { title: "KeyGenMode", field: "keyGenMode", headerFilter: true },
      /* miner fields */
      { title: "Miner address", field: "miningAddress", headerFilter:true, hozAlign: "left",  width: 370 },

    ];
    
    const data = context.pools;
    // this.setState({poolsData: []});
    // console.log("Data:", this.state.poolsData);

    const padding = {
      padding: '0.5rem'
    };
    //const target = useRef(null);
    
    
    //const show = context;

    // TODO: css template/framework / convention to have a decent layout without writing CSS
    const result = (
      <div className="App">
        <header>
          <a href="?">
            <img src={dmd_logo} alt="logo" width="250px" style={padding} />
          </a>
          {modelDataAdapter.isReadingData ? <div> ... LOADING ...</div> : null}

          <button onClick={() => this.onShowWeb3Modal()} style={{ float: 'right', margin: '1rem' }}>
            Connect Wallet
          </button>

          
        </header>

        
        <div>
            <BlockSelectorUI modelDataAdapter={this.props.modelDataAdapter} />
            {/* <ContractDetailsUI modelDataAdapter={this.props.modelDataAdapter} /> */}
            {/* <span className={`${this.isStakingAllowed ? 'text-success' : 'text-danger'}`}> staking {this.stakingAllowedState}: {context.stakingAllowedTimeframe} blocks</span> */}
            {modelDataAdapter.isReadingData ? '... Loading ...' : 
            <Fragment>
              <h1>Pools Data</h1>
              <Tabs className="mb-3" activeKey={"pools-overview"}>
                <Tab eventKey="pools-overview" title="Pools" >
                  {validatorsWithoutPoolSection}
                  <ReactTabulatorViewOptions >
                    <ReactTabulator
                      responsiveLayout="collapse"
                      data={data}
                      columns={columns}
                      tooltips={true}
                      events={{ rowClick: this.test }}
                    />
                  </ReactTabulatorViewOptions>
                </Tab>
                {/* <Tab eventKey="state-history" title="History">
                  ...history...
                </Tab> */}
                <Tab eventKey="pool-detail" title="Details">
                    ... Details Page ...
                </Tab>
              </Tabs>
            
            </Fragment>
            }
          </div>
        

          {/* <Button onClick={() => {
            this.forceUpdate();
            }
            }>force update</Button> */}

        {/*
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
        </div> */}

        {/* <Tabs className="mb-3">
          <Tab eventKey="overview" title="Overview" >
            tab1
          </Tab>
          <Tab eventKey="state-history" title="History">
            tab2
          </Tab>
        </Tabs> */}

      </div>
    );

    

    return result;
  }

}

const mapStateToProps = (state: any) => {
    
}


export default App;
