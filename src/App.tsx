import React, { Fragment } from 'react';
import { observer } from 'mobx-react';
import './App.css';
import BN from "bn.js";
import 'react-tabulator/lib/styles.css';
import "react-tabulator/css/bootstrap/tabulator_bootstrap.min.css"; // use Theme(s)
import './styles/tabulator.css';
import WalletConnectProvider from "@walletconnect/web3-provider";

import dmd_logo from "./logo-hor.svg";

import { ReactTabulator } from 'react-tabulator'
import { ModelDataAdapter } from './model/modelDataAdapter';
import Web3Modal from "web3modal";
import { ReactTabulatorViewOptions } from './utils/ReactTabulatorViewOptions';
import { BlockSelectorUI } from './components/block-selector-ui';
import { Button} from 'react-bootstrap';


interface AppProps {
  modelDataAdapter: ModelDataAdapter,
}

interface AppState {
  showModal: boolean
}

@observer
class App extends React.Component<AppProps, AppState> {

  private examplePublicKey = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

  private _ref_overlay = React.createRef<HTMLElement>();

  state = {
    showModal: false,
  }

  private ui(o: BN) {
    return o.toString(10);
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

  private async setupWeb3Modal() {

    const providerOptions = {
      /* See Provider Options Section */
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          rpc: {
            71117: "http://rpc.uniq.diamonds"
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
  }

  public componentWillUnmount() {
    console.log('component will unmount.');
    this.props.modelDataAdapter.unregisterUIElement(this);
  }


  public render(): JSX.Element {

    //const { context } = this.props.modelDataAdapter;
    // const context = modelDataAdapter.context;
    const { modelDataAdapter } = this.props;
    const { showModal } = this.state;
    const { context } = modelDataAdapter;

    const validatorsWithoutPoolSection = context.currentValidatorsWithoutPools.map((address) => (
      <div className="text-danger" title="Validators can loose their pool association when the first validators after chain launch fail to take over control. (missed out key generation ?)">Validator without a Pool Association: {address}</div>
    ));

    const columns = [
      { title: "Pool address", field: "stakingAddress", hozAlign: "left", frozen: true },
      { title: "stake", field: "totalStake", formatter: "progress", formatterParams: { min: 0, max: 50000000000000000000000 }, width: 100 },
      { title: "Active", field: "isActive", formatter: "tickCross", width: 100 },
      { title: "to be elected", field: "isToBeElected", formatter: "tickCross", width: 100 },
      { title: "pending", field: "isPendingValidator", formatter: "tickCross", width: 100 },
      { title: "available", field: "isAvailable", formatter: "tickCross", width: 100 },
      { title: "Miner address", field: "miningAddress", hozAlign: "left", responsive: true },

    ];
    
    const data = context.pools;

    const padding = {
      padding: '0.5rem'
    };

    const handleClose = () => {

      this.setState({showModal: false});
    }

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
            connect wallet
          </button>

          
        </header>

        
{/* 
        <Overlay target={this._ref_overlay}>
          <Modal show={showModal} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Modal heading</Modal.Title>
            </Modal.Header>
            <Modal.Body>Woohoo, you're reading this text in a modal!</Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" onClick={handleClose}>
                Save Changes
              </Button>
            </Modal.Footer>
          </Modal>
        </Overlay>
         */}
          

        
        <div>
            <BlockSelectorUI modelDataAdapter={this.props.modelDataAdapter} />
            {/* <span className={`${this.isStakingAllowed ? 'text-success' : 'text-danger'}`}> staking {this.stakingAllowedState}: {context.stakingAllowedTimeframe} blocks</span> */}
            {modelDataAdapter.isReadingData ? '... Loading ...' : 
            <Fragment>
            {validatorsWithoutPoolSection}
            <ReactTabulatorViewOptions >
              <ReactTabulator
                data={data}
                columns={columns}
                tooltips={true}
              />
            </ReactTabulatorViewOptions>
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

      </div>
    );

    

    return result;
  }
  historicChanged(e: React.ChangeEvent<HTMLInputElement>): void {

    //const isHistoric = e.target.checked;

    //this.props.context.showHistoric(isHistoric);

    //this.props.context.showHistoric(isHistoric);
  }

}


export default App;
