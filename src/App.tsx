import React, { Fragment } from 'react';
import { observer } from 'mobx-react';
import { reaction, action, runInAction } from 'mobx';
import './App.css';
import BN from "bn.js";
import 'react-tabulator/lib/styles.css';
import "react-tabulator/css/bootstrap/tabulator_bootstrap.min.css"; // use Theme(s)
import './styles/tabulator.css';
import Web3 from "web3";

import WalletConnectProvider from "@walletconnect/web3-provider";

import dmd_logo from "./logo-hor.svg";

import { ReactTabulator } from 'react-tabulator';
import { ModelDataAdapter } from './model/modelDataAdapter';
import { Pool } from './model/model';
import Web3Modal from "web3modal";
import { ReactTabulatorViewOptions } from './utils/ReactTabulatorViewOptions';
import { BlockSelectorUI } from './components/block-selector-ui';
import { Tab, Tabs } from 'react-bootstrap';
import { ColumnDefinition } from 'react-tabulator/lib/ReactTabulator';
import PoolDetail from './components/PoolDetail';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GridLoader from "react-spinners/GridLoader";
import AddPool from './components/AddPool';
import RNG from './components/RNG';
import BlockchainService from './utils/BlockchainService';
import { ChevronDown } from "react-bootstrap-icons";


// import { ContractDetailsUI } from './components/contract-details-ui';


interface AppProps {
  adapter: ModelDataAdapter,
}

interface AppState {
  poolsData: Pool[],
  activeTab: string,
  selectedPool: any,
  connectedAccount: string,
  tabulatorColumsPreset: string,
  showBlockSelectorInfo: boolean
}

@observer
class App extends React.Component<AppProps, AppState> {
  private blockchainService: BlockchainService;
  private examplePublicKey = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

  constructor(props: AppProps) {
    super(props);
    this.state = {
      poolsData: [],
      activeTab: "pools-overview",
      selectedPool: undefined,
      connectedAccount: "",
      tabulatorColumsPreset: 'Default',
      showBlockSelectorInfo: false
    }
    this.blockchainService = new BlockchainService(props)
  }

  private ui(o: BN) {
    return o.toString(10);
  }

  notify = (msg: string) => toast(msg);

  setAppDataState = (poolData: Pool[]) => {
    this.setState({
      selectedPool: poolData[0],
      activeTab: "pool-detail"
    })
  }

  setAppActiveTab = (tab: string) => {
    this.setState({
      activeTab: tab
    })
  }

  setSelectedPool = (pool: Pool) => {
    this.setState({
      selectedPool: pool
    })
  }

  setTabulatorColumnPreset = (preset: string) => {
    this.setState({
      tabulatorColumsPreset: preset
    })
  }

  setShowBlockSelectorInfo = () => {
    this.setState({
      showBlockSelectorInfo: !this.state.showBlockSelectorInfo
    })
  }

  changeTab = (e: any) => {
    this.setState({activeTab: e})
  }


  public async connectWallet() {
    try {
      const url = this.props.adapter.url;
  
      const providerOptions = {
        walletconnect: {
          package: WalletConnectProvider,
          options: {rpc: {777012: url}}
        }
      };
  
      const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: false, // optional
        providerOptions // required
      });

      web3Modal.clearCachedProvider();
      const web3ModalInstance = await web3Modal.connect();

      // handle account change
      const classInstance = this;
      web3ModalInstance.on('accountsChanged', function (accounts: Array<string>) {
        if(accounts.length == 0) {
          window.location.reload();
        } else {
          classInstance.connectWallet();
        }
      })

      const provider = new Web3(web3ModalInstance)

      const chainId = 777012;
      // force user to change to DMD network
      if (web3ModalInstance.networkVersion != chainId) {
        console.log(Object.keys(web3ModalInstance))
        try {
          await web3ModalInstance.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: new Web3().utils.toHex(chainId) }]
          });
        } catch(err: any) {
          if (err.code === 4902) {
            await web3ModalInstance.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainName: 'DMD',
                  chainId: new Web3().utils.toHex(chainId),
                  nativeCurrency: { name: 'DMD', decimals: 18, symbol: 'DMD' },
                  rpcUrls: [process.env.REACT_APP_URL]
                }
              ]
            });
          } else {
            console.log("Other Error", err)
            return undefined;
          }
        }
      }

      this.setState({
        connectedAccount: 'connecting'
      });

      const { adapter } = this.props;
      await adapter.setProvider(provider);

      this.setState({
        connectedAccount: web3ModalInstance.selectedAddress
      });

      return provider;
    } catch(err) {
      console.log(err)
    }
  }

  public componentDidMount(): void {
    console.log('component did mount.');

    this.props.adapter.registerUIElement(this);

    const { adapter } = this.props;
    const { context } = adapter;
    const data = [...context.pools];
    console.log(data)
    this.setState({poolsData: data});

    reaction(
      () => context.pools.slice(), // Observe a copy of the pools array
      (pools: Pool[]) => {
        this.setState({ poolsData: pools });
      }
    );
  }

  public componentWillUnmount() {
    console.log('component will unmount.');
    this.props.adapter.unregisterUIElement(this);
  }

  public componentDidUpdate(prevProps:any, prevState: any, snapshot?: any): void {
    console.log("app component updated")
    if (this.props.adapter !== prevProps.adapter) {
      console.log(this.props.adapter, "hehe")
    }
  }

  // public rowClicked = (e: any, rowData: any) => {
  //   if (e.target instanceof HTMLButtonElement && e.target.textContent === "Claim") {
  //     const rowStakingAddress = rowData._row.data.stakingAddress;
  //     const poolData = this.state.poolsData.filter(data => data.stakingAddress == rowStakingAddress);
  //     this.blockchainService.claimReward(e, poolData[0]);
  //   } else {
  //     this.viewPoolDetails(e, rowData)
  //   }
  // }

  public render(): JSX.Element {

    const { adapter } = this.props;
    const { context } = adapter;
    

    const validatorsWithoutPoolSection = context.currentValidatorsWithoutPools.map((address: any, key: number) => (
      <div key={key} className="text-danger" title="Validators can loose their pool association when the first validators after chain launch fail to take over control. (missed out key generation ?)">Validator without a Pool Association: {address}</div>
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
    
    // const data = [...context.pools];
    // console.log("Data:", this.state.poolsData);

    //const target = useRef(null);
    
    
    //const show = context;

    // TODO: css template/framework / convention to have a decent layout without writing CSS
    const result = (
      <div className="App">
        <div className="navbar">
          <div>
              <button className="connectWalletBtn" onClick={this.setShowBlockSelectorInfo}>
                {context.currentBlockNumber} <ChevronDown style={{marginLeft: "2px"}}/>
              </button>
          </div>

          <a href="/">
            <img src={dmd_logo} alt="logo" width="250px"/>
          </a>

          {this.state.connectedAccount ?
          this.state.connectedAccount == 'connecting' ? 
            <button className="connectWalletBtn">
              Connecting...
            </button>
          :
          (
            <button className="connectWalletBtn">
              {this.state.connectedAccount}
            </button>
          ) : (
            <button onClick={() => this.connectWallet()} className="connectWalletBtn">
              Connect Wallet
            </button>
          )
          }
        </div>

        <div>
          <BlockSelectorUI modelDataAdapter={this.props.adapter} showBlockSelectorInfo={this.state.showBlockSelectorInfo} />
          {/* <ContractDetailsUI adapter={this.props.adapter} /> */}
          {/* <span className={`${this.isStakingAllowed ? 'text-success' : 'text-danger'}`}> staking {this.stakingAllowedState}: {context.stakingAllowedTimeframe} blocks</span> */}
          {adapter.isReadingData ? (
            <GridLoader
              color={'#254CA0'}
              loading={adapter.isReadingData}
              size={20}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          ) : (
            <Fragment>
              {/* <h1>Pools Data</h1> */}
              <Tabs
                className="mb-3"
                activeKey={this.state.activeTab}
                onSelect={this.changeTab}
              >
                <Tab eventKey="pools-overview" title="Pools">
                  {/* {validatorsWithoutPoolSection} */}
                  <ReactTabulatorViewOptions adapter={this.props.adapter} dataProp={this.state.poolsData} columnsProp={columns} tabulatorColumsPreset={this.state.tabulatorColumsPreset} setTabulatorColumnPreset={this.setTabulatorColumnPreset} setAppDataState={this.setAppDataState} blockChainService={this.blockchainService}>
                  </ReactTabulatorViewOptions>
                </Tab>

                {this.state.selectedPool ? (
                  <Tab eventKey="pool-detail" title="Pool Details">
                    <PoolDetail
                      pool={this.state.selectedPool}
                      adapter={adapter}
                    />
                  </Tab>
                ) : (
                  <></>
                )}

                <Tab eventKey="add-pool" title="Add Pool">
                  <AddPool adapter={adapter} setAppActiveTab={this.setAppActiveTab} setSelectedPool={this.setSelectedPool}/>
                </Tab>

                <Tab eventKey="rng-tab" title="RNG">
                  <RNG adapter={adapter}/>
                </Tab>
              </Tabs>
            </Fragment>
          )}
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

