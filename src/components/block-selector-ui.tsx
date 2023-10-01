import { action } from "mobx";
import React, { Fragment } from "react";
import { Button, Modal, Table } from "react-bootstrap";
import Accordion from "react-bootstrap/Accordion";
import "../styles/blockSelector.css";
import BarLoader from "react-spinners/BarLoader";
import { ToastContainer, toast } from "react-toastify";

interface BlockSelectorUIProps {
  modelDataAdapter: any;
  showBlockSelectorInfo: boolean; // New prop
}

interface BlockSelectorState {
  activeValidators: number | null,
  validValidators: number | null
}

export class BlockSelectorUI extends React.Component<BlockSelectorUIProps, BlockSelectorState> {
  private _isModal = false;
  notify = (msg: string) => toast(msg);
  private _ref_overlay = React.createRef<HTMLElement>();

  constructor(props: any) {
    super(props);
    this.state = {
      activeValidators: null,
      validValidators: null
    };
  }

  private getModal(): JSX.Element {
    //this.props.modelDataAdapter.context.latestBlockNumber

    const self = this;
    const historicBlockNumberRef = React.createRef<HTMLInputElement>();
    function onClickHistoric(e: any) {
      const number = historicBlockNumberRef.current?.valueAsNumber;

      if (number) {
        self.props.modelDataAdapter.showHistoric(number);
      } else {
        // maybe message ?!
      }

      //self.props.modelDataAdapter.showHistoric();

      self._isModal = false;
    }

    function onClickLatest(e: any) {
      self.props.modelDataAdapter.showLatest();
      self._isModal = false;
    }

    return (
      <Modal size="lg" show={true} backdrop="static">
        <Modal.Dialog>
          <Modal.Header closeButton>
            <Modal.Title>Choose Block to display</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p>
              You can either track the latest block or directly jump to an
              historic one.
            </p>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="primary" onClick={action(onClickLatest)}>
              Latest
            </Button>
            Historic Block #{" "}
            <input
              ref={historicBlockNumberRef}
              type="number"
              min="1"
              max={this.props.modelDataAdapter.context.latestBlockNumber}
            />
            <Button variant="secondary" onClick={onClickHistoric}></Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal>
    );
  }

  @action.bound
  private async left() {
    const adapter = this.props.modelDataAdapter;
    console.log("left clicked", adapter.context.currentBlockNumber);
    if (adapter.context.currentBlockNumber >= 1) {
      await adapter.showHistoric(adapter.context.currentBlockNumber - 1);
    } else {
      console.log(`ignoring left click. ${adapter.context.currentBlockNumber}`);
    }
  }

  @action.bound
  private async right() {
    const adapter = this.props.modelDataAdapter;
    console.log("right clicked", adapter.context.currentBlockNumber);
    if (
      adapter.context.currentBlockNumber < adapter.context.latestBlockNumber
    ) {
      await adapter.showHistoric(adapter.context.currentBlockNumber + 1);
    } else {
      console.log(
        `ignoring right click. ${adapter.context.currentBlockNumber} ${adapter.context.latestBlockNumber}`
      );
    }
  }

  @action.bound
  private async latest() {
    const adapter = this.props.modelDataAdapter;
    console.log("latest clicked", adapter.context.currentBlockNumber);
    if (
      adapter.context.currentBlockNumber < adapter.context.latestBlockNumber
    ) {
      await adapter.showHistoric(adapter.context.latestBlockNumber);
    } else {
      console.log(
        `ignoring latest click. ${adapter.context.currentBlockNumber} ${adapter.context.latestBlockNumber}`
      );
    }
  }

  private showModal() {
    this._isModal = true;
    this.forceUpdate();
  }

  private async getValidatorsCount() {
    const inactivePools = await this.props.modelDataAdapter.stContract.methods.getPoolsInactive().call();
    const activeValidators = this.props.modelDataAdapter.context.pools.filter((x: any) => x.isCurrentValidator);
    const validValidators = activeValidators.filter((x: any) => !inactivePools.includes(x.stakingAddress)).length;
    this.setState({ activeValidators: activeValidators.length, validValidators });
  }

  componentDidMount() {
    this.getValidatorsCount();
  }

  componentDidUpdate() {
    this.getValidatorsCount();
  }

  public render(): JSX.Element {
    const { modelDataAdapter } = this.props;
    const { context } = modelDataAdapter;

    //const historicIcon = this.props.modelDataAdapter.showHistoric

    let accountInfos = undefined;

    // if (this.props.modelDataAdapter.hasWeb3BrowserSupport) {
    //   accountInfos = (
    //     <section>
    //       <div>
    //         account: <span className="text-primary">{context.myAddr}</span>
    //       </div>
    //       <div>
    //         balance: {ui(context.myBalance)} {context.coinSymbol}
    //       </div>
    //       ;
    //     </section>
    //   );

    //   accountInfos = (
    //     <section>
    //       <tr>
    //         <td>account</td>
    //         <td>{context.myAddr}</td>
    //       </tr>
    //       <tr>
    //         <td>balance</td>
    //         <td>
    //           {ui(context.myBalance)} {context.coinSymbol}
    //         </td>
    //       </tr>
    //     </section>
    //   );
    // }

    // const prompt = () => {
    //   const input = window.prompt(
    //     "pleased enter a block number you want to browse historic, or latest to track the latest block."
    //   );
    //   if (Number(input) > this.props.modelDataAdapter.context.latestBlockNumber) {
    //     this.notify(`Entered block cannot be greater than ${this.props.modelDataAdapter.context.latestBlockNumber}`);
    //     return false;
    //   }
    //   if (input) {
    //     if (input === "latest") {
    //       this.props.modelDataAdapter.showLatest();
    //     } else {
    //       const number = Number.parseInt(input);
    //       if (Number.isInteger(number)) {
    //         this.props.modelDataAdapter.showHistoric(number);
    //       }
    //     }
    //   }
    // };

    return (
      <div className="blockSelectorContainer">
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

        {this._isModal ? this.getModal() : undefined}
        {accountInfos}

        {
          this.props.showBlockSelectorInfo && 

          <Accordion className={`blockAccordion ${
            this.props.showBlockSelectorInfo ? "slide-down-animating" : "slide-up-animating"
          }`} defaultActiveKey="0">
            <Accordion.Item eventKey="0" style={{border: "0px solid transparent"}}>
              {/* <div className="blocksInfo">
                <span>Current Block:</span>
                <div>
                  <Button onClick={this.left.bind(this)}>
                    <ArrowLeft />
                  </Button>
                  <Button style={{ margin: "0.1rem" }} onClick={prompt}>
                    {context.currentBlockNumber}
                  </Button>
                  <Button onClick={this.right.bind(this)}>
                    <ArrowRight />
                  </Button>
                  <Button
                    data-for="latest"
                    onClick={this.latest.bind(this)}
                    style={{ margin: "0.1rem" }}
                  >
                    <SkipEnd />
                  </Button>
                </div>
              </div> */}
            
              {/* <Accordion.Header className="blockAccordionHeader">
                More Info
              </Accordion.Header> */}
              <Accordion.Body>
                <Table bordered>
                  <tbody>
                    {modelDataAdapter.isReadingData ? (
                      <tr>
                        <td>
                        <BarLoader
                          color={'#254CA0'}
                          loading={modelDataAdapter.isReadingData}
                          // size={20}
                          aria-label="Loading Spinner"
                          data-testid="loader"
                        />
                        </td>
                      </tr>
                    ) : (
                      <Fragment>
                        <tr>
                          <td>Current Epoch</td>
                          <td>{context.stakingEpoch}</td>
                        </tr>
                        <tr>
                          <td>Key Gen. Round</td>
                          <td>{context.keyGenRound}</td>
                        </tr>
                        <tr>
                          <td>Epoch Start Block</td>
                          <td>{context.epochStartBlock}</td>
                        </tr>
                        <tr>
                          <td>Epoch Start Time</td>
                          <td>{context.epochStartTimeFormatted}</td>
                        </tr>
                        <tr>
                          <td>Delta Pot</td>
                          <td>{parseFloat(context.deltaPot).toFixed(4)}</td>
                        </tr>
                        <tr>
                          <td>Reinsert Pot</td>
                          <td>{parseFloat(context.reinsertPot).toFixed(4)}</td>
                        </tr>
                        <tr>
                          <td>Minimum Gas Fee</td>
                          <td>{context.minimumGasFeeFormatted}</td>
                        </tr>

                        <tr>
                          <td>Active Validators Set</td>
                          <td>{this.state.activeValidators}</td>
                        </tr>

                        <tr>
                          <td>Valid Candidates</td>
                          <td>{this.state.validValidators}</td>
                        </tr>
                      </Fragment>
                    )}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        }

        {/* <Button onClick={() => {this.forceUpdate()}}>force update</Button> */}
      </div>
    );
  }
}
