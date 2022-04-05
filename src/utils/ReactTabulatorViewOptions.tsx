import React from "react";
import { React15Tabulator } from 'react-tabulator';

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

  public reactTabulatorComponent: React15Tabulator | undefined = undefined;


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

    const showList = false; // in progress...
    //return <div />
    return (
       <div>
         { showList ? <small>all list Name: </small> : null }
         { showList ? <small>{this.props.allListName} </small> : null}
         {this.props.children}
       </div>
    );
  }

}



ReactTabulatorViewOptions.defaultProps = ReactTabulatorViewOptions.getDefaultPropsForInit();
