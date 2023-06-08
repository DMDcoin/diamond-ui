import React from "react";
import "../styles/viewoptions.css";
import { FaTh } from 'react-icons/fa';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { TabulatorFull as Tabulator } from "tabulator-tables";
import { ColumnDefinition } from 'react-tabulator/lib/ReactTabulator';
import BlockchainService from "./BlockchainService";
import { ModelDataAdapter } from "../model/modelDataAdapter";

interface ReactTabulatorViewOptionsColumnSet {
  listName: string,
  columnIds: ArrayLike<String>
}

interface ReactTabulatorViewOptionsProps {
  adapter: ModelDataAdapter;
  allListNameProp: string;
  children: any;
  dataProp: any;
  columnsProp: any;
  setAppDataState: any;
  blockChainService: BlockchainService,
  tabulatorColumsPreset: string,
  setTabulatorColumnPreset: any
}

interface ReactTabulatorViewOptionsState {
  customizeModalShow: boolean,
  columnsState: any[];
  dataState: any[],
}

const presets = [
  'Default',
  'All Pools',
  // 'Price Change'
]

/**
 * view options witch sets of colums to be displayed.
 *  
 */

//  const progressWithLabelFormatter = (cell: any) => {
//   const value = cell.getValue();
//   const min = cell.getColumn().getDefinition().formatterParams.min;
//   const max = cell.getColumn().getDefinition().formatterParams.max;

//   const progress = Math.round(((value - min) / (max - min)) * 100);
//   const progressBar = `<div class="progress-bar" style="width: %"></div>`;
//   const label = `<div class="progress-label">${value}</div>`;

//   return `<div class="progress-wrapper">${progressBar}${label}</div>`;
// };

export class ReactTabulatorViewOptions extends React.Component<ReactTabulatorViewOptionsProps, ReactTabulatorViewOptionsState> {
  defaultColumns = [
    { title: "Pool address", field: "stakingAddress", headerFilter:true, hozAlign: "left"},
    { title: "Total Stake", field: "totalStake", formatter: "progress", formatterParams: { min: 0, max: 5 * (10 ** 22) }},
    // {
    //   title: "Total Stake",
    //   field: "totalStake",
    //   formatter: "progress",
    //   formatterParams: { min: 0, max: 5 * (10 ** 22), formatter: progressWithLabelFormatter },
    // },
    { title: "S", headerTooltip: "Staked - has enough stake ?" , field: "isActive", headerFilter:true, formatter: "tickCross", width: 30, tooltip: true},
    { title: "A", headerTooltip: "Available - is marked as available for upcomming validator set selection", field: "isAvailable", headerFilter:true, formatter: "tickCross",  width: 30 },
    { title: "C", headerTooltip: "Current - is part of current validator set", field: "isCurrentValidator", headerFilter:true, formatter: "tickCross", width: 30 },
    { title: "E", field: "isToBeElected", headerTooltip: "to be Elected - fulfills all requirements to be elected as validator for the upcomming epoch.", headerFilter:true, formatter: "tickCross", width: 30 },
    { title: "P", field: "isPendingValidator", headerTooltip: "Pending - Validator in key generation phase that should write it's acks and parts", headerFilter:true,  formatter: "tickCross", width: 30 },
    { title: "K1", field: "isWrittenParts", headerTooltip: "Key 1 (Parts) was contributed", headerFilter:true, formatter: "tickCross", width: 30 },
    { title: "K2", field: "isWrittenAcks", headerTooltip: "Key 2 (Acks) was contributed - Node has written all keys", headerFilter:true, formatter: "tickCross", width: 30 },
    { title: "Miner address", field: "miningAddress", headerFilter:true, hozAlign: "left"},
    { title: "My Stake", field: "myStake", formatter: (cell:any) => ((cell.getValue() / 10**18).toFixed(2)).toString() + " DMD", formatterParams: { min: 0, max: 5 * (10 ** 22) }},
    {
      title: "Rewards",
      field: "claimableReward",
      width: 200,
      formatter: (cell:any): string | HTMLElement => {
        const rewardValue = (cell.getValue() / (10 ** 18)).toFixed(2).toString() + " DMD";
        if (parseInt((cell.getValue() / (10 ** 18)).toFixed(2)) > 0) {
          const container = document.createElement("div");
          const span = document.createElement("span");
          span.textContent = rewardValue;
          const button = document.createElement("button");
          button.textContent = "Claim";
          button.style.marginLeft = "5px";
          button.style.flexGrow = "1";
          // button.addEventListener("click", this.rowClicked);
          container.appendChild(span);
          container.appendChild(button);
          return container;
        }
        return "0 DMD";
      },
    },
    { title: "Ordered Withdraw", field: "orderedWithdrawAmount", formatter: (cell:any) => ((cell.getValue() / 10**18).toFixed(2)).toString() + " DMD"},
    { title: "Score", field: "score"}
  ];

  el = React.createRef<HTMLDivElement>();

  tabulator: Tabulator | null = null;
  tableData = []; //data for table to display

  // static getDerivedStateFromProps(nextProps: ReactTabulatorViewOptionsProps, prevState: ReactTabulatorViewOptionsState): ReactTabulatorViewOptionsState | null {
  //   console.log("Derieved state outside")
  //   if (nextProps.dataProp !== prevState.dataState) {
  //     console.log("Derieved state inside")
  //     return {
  //       ...prevState,
  //       dataState: [...nextProps.dataProp],
  //     };
  //   }

  //   return null;
  // }

  state: ReactTabulatorViewOptionsState = {
    customizeModalShow: false,
    columnsState: this.defaultColumns,
    dataState: [],
  }

  componentDidUpdate(prevProps: Readonly<ReactTabulatorViewOptionsProps>, prevState: Readonly<ReactTabulatorViewOptionsState>, snapshot?: any): void {
    if (prevProps.dataProp !== prevState.dataState) {
      let tabulatorCheckInterval: NodeJS.Timeout | null = setInterval(() => {
        if (this.tabulator) {
          this.tabulator.setData(this.props.dataProp);
          this.addTabRowEventListeners();
          clearInterval(tabulatorCheckInterval as NodeJS.Timeout);
          tabulatorCheckInterval = null;
        }
      }, 100);
    }
    this.addTabRowEventListeners();
  }

  componentDidMount(): void {
    if (this.el.current) {
      this.setState({
        dataState: [...this.props.dataProp],
      });
  
      this.tabulator = new Tabulator(this.el.current, {
        responsiveLayout: "collapse",
        data: this.state.dataState,
        columns: this.state.columnsState,
      });
  
      this.addTabRowEventListeners();
    }
  }
  
  updateColumnsPreference = () => {
    this.setState({customizeModalShow: false});
    const showAllPools = this.props.tabulatorColumsPreset == 'Default' ? false : true;
    console.log("here", this.props.tabulatorColumsPreset, this.props.adapter.showAllPools, showAllPools);
    if (this.props.adapter.showAllPools != showAllPools) {
      this.props.adapter.showAllPools = showAllPools;
      this.props.adapter.refresh();
    }
  }

  addTabRowEventListeners = () => {
    setTimeout(() => {
      const tabRows = document.querySelectorAll('.tabulator-row');
  
      tabRows.forEach((row: any) => {
        row.addEventListener('click', this.rowClicked);

        row.addEventListener("dblclick", this.rowClicked);
      });

      // const tabulator = document.querySelector('tabulator');
      // tabulator?.addEventListener('click', this.rowClicked);

      // tabulator?.addEventListener("dblclick", this.rowClicked);

      // const btns = document.querySelectorAll('button'); 

      // btns.forEach((btn: any) => {
      //   if (btn.innerHTML == 'Claim') {
      //     console.log(btn.innerHTML)
      //     btn.addEventListener('click', this.rowClicked);

      //     btn.addEventListener("dblclick", this.rowClicked);
      //   }
        
      // });
  
      return () => {
        tabRows.forEach((row: any) => {
          row.removeEventListener('click', this.rowClicked);
        });
      };
    }, 500);
  }

  public columnSets: Array<ReactTabulatorViewOptionsColumnSet> = [];

  // public reactTabulatorComponent: React15Tabulator | undefined = undefined;


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
    const selectedValue = e.target.value;
    this.props.setTabulatorColumnPreset(selectedValue);
  }

  rowClicked = (e: any) => {
    const rowStakingAddress = e.target.closest('.tabulator-row').querySelector('[tabulator-field="stakingAddress"]').textContent.trim();
    if (e.target instanceof HTMLButtonElement && e.target.textContent === "Claim") {
      const poolData = this.state.dataState.filter(data => data.stakingAddress == rowStakingAddress);
      this.props.blockChainService.claimReward(e, poolData[0]);
    } else {
      const poolData = this.state.dataState.filter(data => data.stakingAddress == rowStakingAddress);
      this.props.setAppDataState(poolData)
    }
  };

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
                  Pools Preference: <Form.Select aria-label="Default select example" value={this.props.tabulatorColumsPreset} onChange={e => this.presetChange(e)}>
                    {
                      presets.map((item, key) => (
                        <option key={key} value={item}>{item}</option>    
                      ))
                    }
                  </Form.Select>

                  {/* <button onClick={this.addColumn}>Add</button>
                  <button onClick={e => this.removeColumn('Example Column')}>Remove</button> */}
                </div>

              </div>
            </Modal.Body>
            <Modal.Footer>
              <button onClick={() => this.setState({customizeModalShow: false})}>Close</button>
              <button onClick={() => this.updateColumnsPreference()}>Apply Changes</button>
            </Modal.Footer>
          </Modal>

          <div className="viewOptionsContainer">
            <button className="customiseBtn" onClick={() => this.setState({customizeModalShow: true})}>
              <FaTh style={{marginRight: '5px'}}/>
              Customize
            </button>
          </div>
          
          <div ref={this.el} className="tabulator-container" />
         {/* <ReactTabulator
            responsiveLayout="collapse"
            data={this.state.dataState}
            columns={this.state.columnsState}
            tooltips={true}
            // interactions={false}
          /> */}
       </div>
    );
  }

}

ReactTabulatorViewOptions.defaultProps = ReactTabulatorViewOptions.getDefaultPropsForInit();
