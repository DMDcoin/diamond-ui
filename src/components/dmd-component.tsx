import { observer } from "mobx-react";
import React from "react";
import { ModelDataAdapter } from "../model/modelDataAdapter";


export interface IDmdProps {
  modelDataAdapter: ModelDataAdapter;
}


@observer
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