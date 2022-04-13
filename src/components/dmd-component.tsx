
import React from "react";
import { ModelDataAdapter } from "../model/modelDataAdapter";
import BigNumber from 'bn.js';

export interface IDmdProps {
  modelDataAdapter: ModelDataAdapter;
}


export class DmdComponent extends React.Component<IDmdProps, {}> {

  public componentDidMount() {
    console.log('DmdComponent did mount.');
    this.props.modelDataAdapter.registerUIElement(this);
  }

  public componentWillUnmount() {
    console.log('DmdComponent will unmount.');
    this.props.modelDataAdapter.unregisterUIElement(this);
  }
}

export function ethValueFormatted(ethValue: string) {
  const bn = new BigNumber(ethValue);
  const result = bn.div(new BigNumber('1000000000000000000'));
  result.toString()
}