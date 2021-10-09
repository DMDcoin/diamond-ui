import React from "react";
import { ReactTabulator } from "react-tabulator";


interface ReactTabulatorViewOptionsColumnSet {
  listName: string,
  columnIds: ArrayLike<String>
}

interface ReactTabulatorViewOptionsProps {
  allListName: string;
}


/**
 * view options witch sets of colums to be displayed.
 *  
 */
export class ReactTabulatorViewOptions extends  React.Component<ReactTabulatorViewOptionsProps, {}> {



  public columnSets : Array<ReactTabulatorViewOptionsColumnSet> = [];

  public reactTabulatorComponent?: ReactTabulator


  static getDefaultPropsForInit() {
    const result = {
      allListName: 'all'
    }

    return result;
  }

  static defaultProps =  ReactTabulatorViewOptions.getDefaultPropsForInit();

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
        {this.props.children}
      </div>

    );
  }

}



ReactTabulatorViewOptions.defaultProps = ReactTabulatorViewOptions.getDefaultPropsForInit();
