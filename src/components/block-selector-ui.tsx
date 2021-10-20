import { ModelDataAdapter } from "../model/modelDataAdapter";
import { observer } from 'mobx-react';
import React from 'react';
import { ui } from "../ui";
import { Button, Table } from "react-bootstrap";

import { ArrowLeft, ArrowRight } from 'react-bootstrap-icons';

export interface IBlockSelectorProps {
  modelDataAdapter: ModelDataAdapter;
}


@observer
export class BlockSelectorUI extends React.Component<IBlockSelectorProps, {}> {

  public render(): JSX.Element {

    const padding = {
      padding: '0.5rem'
    };

    const context = this.props.modelDataAdapter.context;

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

    return <div style={padding}>
      {accountInfos}
    <Table striped bordered hover>
      <tbody>
        <tr>
          <td>current block nr</td>
          
          <td>
            <section style={{width:'20rem'}}>
              <Button>
                <ArrowLeft />
              </Button>
              <Button style={{margin:'0.1rem'}}>
                {context.currentBlockNumber}
              </Button>
              <Button>
                <ArrowRight/>
              </Button>
            </section>
          </td>
          
        </tr>
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
      </tbody>
    </Table>

  </div>;
  }
}