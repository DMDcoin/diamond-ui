import { ModelDataAdapter } from "../model/modelDataAdapter";
import { observer } from 'mobx-react';
import React from 'react';
import { ui } from "../ui";


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

    return <div style={padding}>
    account: <span className="text-primary">{context.myAddr}</span> |
    balance: {ui(context.myBalance)} {context.coinSymbol}<br />
    current block nr: {context.currentBlockNumber} | current epoch: {context.stakingEpoch} | epoch start Block {context.epochStartBlock} | epoch start Time {new Date(context.epochStartTime * 1000).toLocaleString()} | deltaPot {context.deltaPot} | reinsertPot {context.reinsertPot} | validators# | {context.pools.filter(x => x.isCurrentValidator).length})
  </div>;
  }
}