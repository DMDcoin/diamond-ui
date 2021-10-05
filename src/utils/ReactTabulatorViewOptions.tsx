import React from "react";
import { ReactTabulator } from "react-tabulator";


interface ReactTabulatorViewOptionsColumnSet {
  listName: string,
  columnIds: ArrayLike<String>
}

interface ReactTabulatorViewOptionsProps {
  tabulatorId: string,
  allListName: string;
}


/**
 * view options witch sets of colums to be displayed.
 *  
 */
export class ReactTabulatorViewOptions extends  React.Component<ReactTabulatorViewOptionsProps, {}> {



  public columnSets : Array<ReactTabulatorViewOptionsColumnSet> = [];

  public reactTabulatorComponent?: ReactTabulator


  static getDefaultProps() {
    const result = {
      allListName: 'all'
    }

    return result;
  }

  static defaultProps =  ReactTabulatorViewOptions.getDefaultProps();

  public constructor(props: ReactTabulatorViewOptionsProps) {
    super(props);

  }

  public addColumnSet(name: string, columnIds: Array<string> ) {

    const entry : ReactTabulatorViewOptionsColumnSet = {
      listName: name,
      columnIds: columnIds
    };

    this.columnSets.push(entry);
  }

  /**
   * stores the current layout in the browsers local Storage.
   */
  public storeSettings() {

  }

  /**
   * loads the current layout in the browsers local Storage.
   */
  public loadSettings() {

  }

  /**
   * resets the layout to it's original state, during design time.
   */
  public resetSettings() {

  }

  public render() {
    return (
      <div>
        <small>all list Name: </small>
        <small>{this.props.allListName}</small>
      </div>
    );
  }

}



ReactTabulatorViewOptions.defaultProps = ReactTabulatorViewOptions.getDefaultProps();
