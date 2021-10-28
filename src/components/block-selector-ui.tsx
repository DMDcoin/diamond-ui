import { ModelDataAdapter } from "../model/modelDataAdapter";
import { observer } from 'mobx-react';
import { action } from 'mobx';
import React, { Fragment } from 'react';
import { ui } from "../ui";
import { Button, Modal, Table } from "react-bootstrap";

import { ArrowLeft, ArrowRight } from 'react-bootstrap-icons';

export interface IBlockSelectorProps {
  modelDataAdapter: ModelDataAdapter;
}


@observer
export class BlockSelectorUI extends React.Component<IBlockSelectorProps, {}> {

  private _isModal = false;

  private getModal() : JSX.Element  {
    //this.props.modelDataAdapter.context.latestBlockNumber

    const self = this;
    const historicBlockNumberRef = React.createRef<HTMLInputElement>();
    function onClickHistoric(e: React.MouseEvent<HTMLInputElement>) {

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

    function onClickLatest(e: React.MouseEvent<HTMLInputElement>) {
      self.props.modelDataAdapter.showLatest();
      self._isModal = false;
    }

    return <Modal show={true} backdrop="static">
      <Modal.Dialog>
        <Modal.Header closeButton>
          <Modal.Title>Choose Block to display</Modal.Title>
        </Modal.Header>
      
        <Modal.Body>
          <p>You can either track the latest block or directly jump to an historic one.</p>
        </Modal.Body>
      
        <Modal.Footer>
          <Button variant="primary" onClick={action(onClickLatest)}>Latest</Button>
          Historic Block # <input ref={historicBlockNumberRef} type="number" min="1" max={this.props.modelDataAdapter.context.latestBlockNumber}/> 
          <Button variant="secondary" onClick={onClickHistoric}></Button>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>;

  }


  @action.bound
  private async left() {

    const adapter = this.props.modelDataAdapter;
    console.log('left clicked', adapter.context.currentBlockNumber);
    if (adapter.context.currentBlockNumber > 1) {
      await adapter.showHistoric(adapter.context.currentBlockNumber - 1);
    }

  }

  @action.bound
  private async right() {

    const adapter = this.props.modelDataAdapter;
    console.log('right clicked', adapter.context.currentBlockNumber);
    if (adapter.context.currentBlockNumber < adapter.context.latestBlockNumber) {
      await adapter.showHistoric(adapter.context.currentBlockNumber + 1);
    }

  }

  private showModal() {
    console.log('showModal.');
    this._isModal = true;
    this.forceUpdate();
  }


  public render(): JSX.Element {

    const padding = {
      padding: '0.5rem'
    };

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

    //const section2 = modelDataAdapter.isReadingData ? <div>... Loading ...</div>  : 
    
    return <div style={padding}>
      {this._isModal?this.getModal():undefined}
      {accountInfos}
    <Table striped bordered hover>
      <tbody>
        <tr>
          <td>current block nr</td>
          
          <td>
            <section style={{width:'20rem'}}>
              <Button onClick={this.left.bind(this)}>
                <ArrowLeft />
              </Button>
              <Button style={{margin:'0.1rem'}} onClick={this.showModal.bind(this)}>
                {context.currentBlockNumber}
              </Button>
              <Button onClick={this.right.bind(this)}>
                <ArrowRight/>
              </Button>
            </section>
          </td>
          
        </tr>

        { modelDataAdapter.isReadingData ? <div>... Loading ...</div>  : <Fragment>
        <tr>
          <td>current epoch</td>
          <td>{context.stakingEpoch}</td>
        </tr>
        <tr>
          <td>epoch start Block</td>
          <td>{context.epochStartBlock}</td>
        </tr>
        <tr>
          <td>epoch start time</td>
          <td>{context.epochStartTimeFormatted}</td>
        </tr>
        <tr>
          <td>delta pot</td>
          <td>{context.deltaPot}</td>
        </tr>
        <tr>
          <td>reinsert pot</td>
          <td>{context.reinsertPot}</td>
        </tr>
        <tr>
          <td>validators</td>
          <td>{context.pools.filter(x => x.isCurrentValidator).length}</td>
        </tr> 
        </Fragment>}
      </tbody>
    </Table>
    <Button onClick={() => {this.forceUpdate()}}>force update</Button>
  </div>;
  }

  public componentDidMount() {
    console.log('block selector ui did mount.');
    this.props.modelDataAdapter.registerUIElement(this);
  }

  public componentWillUnmount() {
    console.log('block selector ui will unmount.');
    this.props.modelDataAdapter.unregisterUIElement(this);
  }
  
}