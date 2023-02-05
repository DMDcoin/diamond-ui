import { action } from 'mobx';
import React, { Fragment } from 'react';
import { ui } from "../ui";
import { Button, Modal, Table } from 'react-bootstrap';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { ArrowLeft, ArrowRight, SkipEnd } from 'react-bootstrap-icons';
import { DmdComponent } from "./dmd-component";

export class BlockSelectorUI extends DmdComponent {

  private _isModal = false;
  private _ref_overlay = React.createRef<HTMLElement>();


  private getModal(): JSX.Element {
    //this.props.modelDataAdapter.context.latestBlockNumber

    const self = this;
    const historicBlockNumberRef = React.createRef<HTMLInputElement>();
    function onClickHistoric(e: any) {

      const number = historicBlockNumberRef.current?.valueAsNumber;

      if (number) {
        self.props.modelDataAdapter.showHistoric(number);
      }
      else {
        // maybe message ?!
      }

      //self.props.modelDataAdapter.showHistoric();

      self._isModal = false;

    }

    function onClickLatest(e: any) {
      self.props.modelDataAdapter.showLatest();
      self._isModal = false;
    }

    return <Modal size="lg" show={true} backdrop="static">
      <Modal.Dialog>
        <Modal.Header closeButton>
          <Modal.Title>Choose Block to display</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p>You can either track the latest block or directly jump to an historic one.</p>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="primary" onClick={action(onClickLatest)}>Latest</Button>
          Historic Block # <input ref={historicBlockNumberRef} type="number" min="1" max={this.props.modelDataAdapter.context.latestBlockNumber} />
          <Button variant="secondary" onClick={onClickHistoric}></Button>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>;

  }


  @action.bound
  private async left() {

    const adapter = this.props.modelDataAdapter;
    console.log('left clicked', adapter.context.currentBlockNumber);
    if (adapter.context.currentBlockNumber >= 1) {
      await adapter.showHistoric(adapter.context.currentBlockNumber - 1);
    } else {
      console.log(`ignoring left click. ${adapter.context.currentBlockNumber}`);
    }

  }

  @action.bound
  private async right() {

    const adapter = this.props.modelDataAdapter;
    console.log('right clicked', adapter.context.currentBlockNumber);
    if (adapter.context.currentBlockNumber < adapter.context.latestBlockNumber) {
      await adapter.showHistoric(adapter.context.currentBlockNumber + 1);
    } else {
      console.log(`ignoring right click. ${adapter.context.currentBlockNumber} ${adapter.context.latestBlockNumber}`);
    }

  }

  @action.bound
  private async latest() {

    const adapter = this.props.modelDataAdapter;
    console.log('latest clicked', adapter.context.currentBlockNumber);
    if (adapter.context.currentBlockNumber < adapter.context.latestBlockNumber) {
      await adapter.showHistoric(adapter.context.latestBlockNumber);
    } else {
      console.log(`ignoring latest click. ${adapter.context.currentBlockNumber} ${adapter.context.latestBlockNumber}`);
    }

  }

  private showModal() {
    console.log('showModal.');
    this._isModal = true;
    this.forceUpdate();
  }


  public render(): JSX.Element {

    console.log('render.');

    const { modelDataAdapter } = this.props;
    const { context } = modelDataAdapter;

    //const historicIcon = this.props.modelDataAdapter.showHistoric

    let accountInfos = undefined;

    if (this.props.modelDataAdapter.hasWeb3BrowserSupport) {
      accountInfos =
        <section>
          <div>account: <span className="text-primary">{context.myAddr}</span></div>
          <div>balance: {ui(context.myBalance)} {context.coinSymbol}</div>;
        </section>

      accountInfos =
        <section>
          <tr>
            <td>account</td>
            <td>{context.myAddr}</td>
          </tr>
          <tr>
            <td>balance</td>
            <td>{ui(context.myBalance)} {context.coinSymbol}</td>
          </tr>
        </section>
    }


    const prompt = () => {

      const input = window.prompt('pleased enter a block number you want to browse historic, or latest to track the latest block.');
      if (input) {
        if (input === 'latest') {
          this.props.modelDataAdapter.showLatest();
        } else {
          const number = Number.parseInt(input);
          if (Number.isInteger(number)) {
            this.props.modelDataAdapter.showHistoric(number);
          }
        }
      }
    };

    const alignLeft = {
      padding: '0.1rem',
      width: '25rem'
    };


    return <div style={alignLeft}>
      {this._isModal ? this.getModal() : undefined}
      {accountInfos}
      <Table bordered>
        <tbody>
          <tr data-toggle="collapse" data-target=".collapseMainInfo" aria-controls="mainInfoCollapse">
            <td>Current Block No#</td>

            <td>
              <section >
                <Button onClick={this.left.bind(this)}>
                  <ArrowLeft />
                </Button>
                <Button style={{ margin: '0.1rem' }} onClick={prompt}>
                  {context.currentBlockNumber}
                </Button>
                <Button onClick={this.right.bind(this)}>
                  <ArrowRight />
                </Button>
                <ReactTooltip place="top">
                  Next Block
                </ReactTooltip>
                <Button data-for="latest" onClick={this.latest.bind(this)} style={{ margin: '0.1rem' }}>
                  <SkipEnd />
                </Button>
                <ReactTooltip id="latest" place="top">
                  Latest Block
                </ReactTooltip>
              </section>
            </td>

          </tr>

          {modelDataAdapter.isReadingData ? <tr><td>... Loading ...</td></tr> : <Fragment>
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
              <td>{context.deltaPot}</td>
            </tr>
            <tr>
              <td>Reinsert Pot</td>
              <td>{context.reinsertPot}</td>
            </tr>
            <tr>
              <td>Minimum Gas Fee</td>
              <td>{context.minimumGasFeeFormatted}</td>
            </tr>

            <tr>
              <td>Validators</td>
              <td>{context.pools.filter(x => x.isCurrentValidator).length}</td>
            </tr>
          </Fragment>}
        </tbody>
      </Table>
      {/* <Button onClick={() => {this.forceUpdate()}}>force update</Button> */}
    </div>;
  }
}