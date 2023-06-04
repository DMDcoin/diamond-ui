import React from "react";
import "../styles/viewoptions.css";
import { FaTh } from 'react-icons/fa';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { ReactTabulator } from 'react-tabulator';
import { React15Tabulator } from 'react-tabulator';
import { ColumnDefinition } from 'react-tabulator/lib/ReactTabulator';

interface ReactTabulatorViewOptionsColumnSet {
  listName: string,
  columnIds: ArrayLike<String>
}

interface ReactTabulatorViewOptionsProps {
  allListNameProp: string;
  children: any;
  dataProp: any;
  columnsProp: any;
  eventsProp: any;
}

interface ReactTabulatorViewOptionsState {
  customizeModalShow: boolean,
  defaultPreset: String,
  columnsState: any[];
  dataState: any[]
}

const presets = [
  'Default',
  'Classic',
  'Price Change'
]

const handleRewardButtonClick = (e: any) => {
  console.log("handle claim")
}

const defaultColumns : ColumnDefinition[] = [
  { title: "Pool address", field: "stakingAddress", headerFilter:true, hozAlign: "left"},
  { title: "Total Stake", field: "totalStake", formatter: "progress", formatterParams: { min: 0, max: 5 * (10 ** 22) }},
  { title: "S", headerTooltip: "Staked - has enough stake ?" ,field: "isActive", headerFilter:true, formatter: "tickCross", width: 30},
  { title: "A", headerTooltip: "Available - is marked as available for upcomming validator set selection", field: "isAvailable", headerFilter:true, formatter: "tickCross",  width: 30 },
  { title: "C", headerTooltip: "Current - is part of current validator set", field: "isCurrentValidator", headerFilter:true, formatter: "tickCross", width: 30 },
  { title: "E", field: "isToBeElected", headerTooltip: "to be Elected - fulfills all requirements to be elected as validator for the upcomming epoch.", headerFilter:true, formatter: "tickCross", width: 30 },
  { title: "P", field: "isPendingValidator", headerTooltip: "Pending - Validator in key generation phase that should write it's acks and parts", headerFilter:true,  formatter: "tickCross", width: 30 },
  { title: "K1", field: "isWrittenParts", headerTooltip: "Key 1 (Parts) was contributed", headerFilter:true, formatter: "tickCross", width: 30 },
  { title: "K2", field: "isWrittenAcks", headerTooltip: "Key 2 (Acks) was contributed - Node has written all keys", headerFilter:true, formatter: "tickCross", width: 30 },
  { title: "Miner address", field: "miningAddress", headerFilter:true, hozAlign: "left"},
  { title: "My Stake", field: "myStake", formatter: (cell) => ((cell.getValue() / 10**18).toFixed(2)).toString() + " DMD", formatterParams: { min: 0, max: 5 * (10 ** 22) }},
  {
    title: "Rewards",
    field: "claimableReward",
    formatter: (cell): string | HTMLElement => {
      const rewardValue = (cell.getValue() / (10 ** 18)).toFixed(2).toString() + " DMD";
      if (parseInt((cell.getValue() / (10 ** 18)).toFixed(2)) > 0) {
        const container = document.createElement("div");
        const span = document.createElement("span");
        span.textContent = rewardValue;
        const button = document.createElement("button");
        button.textContent = "Claim";
        button.addEventListener("click", handleRewardButtonClick);
        container.appendChild(span);
        container.appendChild(button);
        return container;
      }
      return "0 DMD";
    },
  },
  { title: "Ordered Withdraw", field: "orderedWithdrawAmount", formatter: (cell) => ((cell.getValue() / 10**18).toFixed(2)).toString() + " DMD"},
  // { title: "History Reward", field: "claimableRewards"}
];

/**
 * view options witch sets of colums to be displayed.
 *  
 */
export class ReactTabulatorViewOptions extends React.Component<ReactTabulatorViewOptionsProps, ReactTabulatorViewOptionsState> {
  state: ReactTabulatorViewOptionsState = {
    customizeModalShow: false,
    defaultPreset: 'Default',
    columnsState: defaultColumns,
    dataState: this.props.dataProp
  }

  componentDidUpdate(prevProps: Readonly<ReactTabulatorViewOptionsProps>, prevState: Readonly<ReactTabulatorViewOptionsState>, snapshot?: any): void {
    const prevData = this.state.dataState;
    const currentData = this.props.dataProp;

    // Iterate over the array and compare each object
    for (let i = 0; i < currentData.length; i++) {
      const prevObject = prevData[i];
      const currentObject = currentData[i];

      // Compare the properties of the objects
      const objectKeys = ['myStake', 'orderedWithdrawAmount', 'claimableReward'];
      // console.log(objectKeys)
      let isObjectUpdated = false;

      for (let j = 0; j < objectKeys.length; j++) {
        const key = objectKeys[j];
        console.log("Before:", prevObject[key].toString(), "\n",
          "After:", currentObject[key].toString(), prevObject[key] !== currentObject[key])
        if (prevObject[key] !== currentObject[key]) {
          isObjectUpdated = true;
          break;
        }
      }
    }
  }

  componentDidMount(): void {
    this.setState({
      dataState: this.props.dataProp
    })
  }

  public columnSets: Array<ReactTabulatorViewOptionsColumnSet> = [];

  public reactTabulatorComponent: React15Tabulator | undefined = undefined;


  static getDefaultPropsForInit() {
    const result = {
      allListNameProp: 'all'
    }

    return result;
  }

  static defaultProps = ReactTabulatorViewOptions.getDefaultPropsForInit();

  public constructor(props: ReactTabulatorViewOptionsProps) {
    super(props);
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

  addColumn = (): void => {
    const newColumn: ColumnDefinition = {
      title: "Example Column",
      field: "exampleColumn",
      headerFilter: true,
      hozAlign: "left",
      width: 200,
      formatter: "plaintext",
      editor: true,
    };

    const newColumnData = {exampleColumn: "Example Data"}
    
    const updatedDataState = [
      ...this.state.dataState.slice(0, this.state.dataState.length),
      newColumnData,
      ...this.state.dataState.slice(this.state.dataState.length + 1),
    ]

    this.setState({
      columnsState: [...this.state.columnsState, newColumn],
      dataState: [...updatedDataState]
    });
  };

  removeColumn = (title: string): void => {
    const filteredColumns = this.state.columnsState.filter(item => item.title != title);
    const updatedDataState = this.state.dataState.map(obj => {
      const { [title]: omittedKey, ...rest } = obj;
      return rest;
    });

    console.log(updatedDataState)
    
    this.setState({
      columnsState: [...filteredColumns],
      dataState: [...updatedDataState]
    });
  }

  presetChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    console.log(e.target.value)
  }

  public render() {

    const showList = true; // in progress...
    //return <div />
    return (
       <div>
          <Modal show={this.state.customizeModalShow} onHide={() => this.setState({customizeModalShow: false})} animation={false} centered>
            <Modal.Header >
              <span>Add, delete and sort metrics just how you need it</span>
            </Modal.Header>
            <Modal.Body>
              <div className="customizeModalBody">
                <div className="presetContainer">
                  <Form.Select aria-label="Default select example" onChange={e => this.presetChange(e)}>
                    {
                      presets.map((item, key) => (
                        <option key={key} value={key}>{item}</option>    
                      ))
                    }
                  </Form.Select>

                  <button onClick={this.addColumn}>Add</button>
                  <button onClick={e => this.removeColumn('Example Column')}>Remove</button>
                </div>

              </div>
            </Modal.Body>
            <Modal.Footer>
              <button onClick={() => this.setState({customizeModalShow: false})}>Close</button>
              <button onClick={() => this.setState({customizeModalShow: false})}>Apply Changes</button>
            </Modal.Footer>
          </Modal>

          <div className="viewOptionsContainer">
            <button className="customiseBtn" onClick={() => this.setState({customizeModalShow: true})}>
              <FaTh style={{marginRight: '5px'}}/>
              Customize
            </button>
          </div>
          
         <ReactTabulator
            responsiveLayout="collapse"
            data={this.state.dataState}
            columns={this.state.columnsState}
            tooltips={true}
            events={this.props.eventsProp}
          />
       </div>
    );
  }

}

ReactTabulatorViewOptions.defaultProps = ReactTabulatorViewOptions.getDefaultPropsForInit();
