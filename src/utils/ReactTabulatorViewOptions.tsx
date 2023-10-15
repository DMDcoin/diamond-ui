import React from "react";
import "../styles/viewoptions.css";
import copy from "copy-to-clipboard";
import { FaCopy, FaTh } from 'react-icons/fa';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import BlockchainService from "./BlockchainService";
import { ModelDataAdapter } from "../model/modelDataAdapter";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import ReactDOMServer from "react-dom/server";
import BigNumber from "bignumber.js";
import { toast } from "react-toastify";

// import { ColumnDefinition } from 'react-tabulator/lib/ReactTabulator';

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
  selectedColumns: any[]
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

const copyFormatter = (cell: any) => {
    const cellValue = cell.getValue();
    const container = document.createElement("div");
    const span = document.createElement("span");
    const copyBtn = document.createElement("div");
    copyBtn.className = "copyBtn";
    const faCopyIcon = ReactDOMServer.renderToStaticMarkup(<FaCopy />);
    copyBtn.innerHTML = `${faCopyIcon}`;
    span.textContent = cellValue;
    container.appendChild(span);
    container.appendChild(copyBtn);
    return container;
};

export class ReactTabulatorViewOptions extends React.Component<ReactTabulatorViewOptionsProps, ReactTabulatorViewOptionsState> {
  notify = (msg: string) => toast(msg);

  defaultColumns = [
    { title: "Pool address", field: "stakingAddress", headerFilter: true, hozAlign: "left", formatter: (cell: any) => copyFormatter(cell)},
    { title: "Public Key", field: "miningAddress", hozAlign: "left", formatter: (cell: any) => copyFormatter(cell)},
    { 
      title: "Total Stake", 
      field: "totalStake", 
      formatter: function(cell: any) {
        const value = cell.getValue();
        const min = cell.getColumn().getDefinition().formatterParams.min;
        const max = cell.getColumn().getDefinition().formatterParams.max;
        const progress = Math.round(((value - min) / (max - min)) * 100);
        const progressBar = `<div class="progress-bar" data-max="${5 * (10 ** 22)}" data-min="0" style="display: inline-block; width: ${progress}%; background-color: rgb(45, 194, 20); height: 100%;"></div>`;
        const numericValue = `<div class="numeric-value">${BigNumber(value).dividedBy(10**18)} DMD</div>`;
        const combinedHTML = `<div class="progress-wrapper">${progressBar}${numericValue}</div>`;
        return combinedHTML;
      },
      formatterParams: { min: 0, max: 5 * (10 ** 22) }
    },
    { title: "S", headerTooltip: "Staked - has enough stake ?" , field: "isActive", formatter: "tickCross", width: 30, tooltip: true},
    { title: "A", headerTooltip: "Available - is marked as available for upcomming validator set selection", field: "isAvailable", formatter: "tickCross",  width: 30 },
    { title: "C", headerTooltip: "Current - is part of current validator set", field: "isCurrentValidator", formatter: "tickCross", width: 30 },
    { title: "E", field: "isToBeElected", headerTooltip: "to be Elected - fulfills all requirements to be elected as validator for the upcomming epoch.", formatter: "tickCross", width: 30 },
    { title: "P", field: "isPendingValidator", headerTooltip: "Pending - Validator in key generation phase that should write it's acks and parts",  formatter: "tickCross", width: 30 },
    { title: "K1", field: "isWrittenParts", headerTooltip: "Key 1 (Parts) was contributed", formatter: "tickCross", width: 30 },
    { title: "K2", field: "isWrittenAcks", headerTooltip: "Key 2 (Acks) was contributed - Node has written all keys", formatter: "tickCross", width: 30 },
    { title: "Miner address", field: "miningAddress", headerFilter: true, hozAlign: "left", formatter: (cell: any) => copyFormatter(cell)},
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

  copyText(text: string): void {
    copy(text);
    this.notify(`Copied!`);
  }

  state: ReactTabulatorViewOptionsState = {
    customizeModalShow: false,
    columnsState: this.defaultColumns,
    dataState: [],
    selectedColumns: []
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

      this.initializeTabulator(this.state.dataState, this.state.columnsState);
  
      // this.tabulator = new Tabulator(this.el.current, {
      //   data: this.state.dataState,
      //   responsiveLayout: "collapse",
      //   columns: this.state.columnsState,
      // });
  
      // this.addTabRowEventListeners();
    }

    const allColumns = this.defaultColumns.map((col: any) => {return {"title": col.title, status: true}});
    this.setState({
      selectedColumns: [...allColumns],
    });
  }
  
  updateColumnsPreference = () => {
    this.setState({customizeModalShow: false});
    const showAllPools = this.props.tabulatorColumsPreset === 'Default' ? false : true;

    if (this.props.adapter.showAllPools !== showAllPools) {
      this.props.adapter.showAllPools = showAllPools;
      this.props.adapter.refresh();
    }

    const currColState = this.state.columnsState.map(col => col.title);
    // const updatedColState = this.state.selectedColumns.map(col => {
    //   if (col.status) {
    //     return col;
    //   }
    // })

    // console.log({currColState})
    // this.state.selectedColumns.map(col => console.log(col))

    let colsToAdd: any = [];
    let colsToRemove: any = [];

    this.state.selectedColumns.forEach(col => {
      if (currColState.includes(col.title) && !col.status) {
        colsToRemove.push(col.title);
      } else if (!currColState.includes(col.title) && col.status) {
        colsToAdd.push(col.title);
      }
    })

    console.log({colsToAdd})
    console.log({colsToRemove})

    this.addColumn(colsToAdd);
    this.removeColumn(colsToRemove);
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

  // toCamelCase = (str: string) => {
  //   return str.replace(/[-_\s](.)/g, (_, character) => character.toUpperCase());
  // }
  
  addColumn = (titleArr: string[]): void => {
    let currColsCopy = [...this.state.columnsState];

    for (let i = 0; i < titleArr.length; i++) {
      const titleToAdd = titleArr[i];
      for (let j = 0; j < this.defaultColumns.length; j++) {
        const defaultCol = this.defaultColumns[j];
        if (defaultCol.title === titleToAdd) {
          const newColumn = {
            title: titleArr[i],
            field: defaultCol.field,
            headerFilter: defaultCol.headerFilter,
            hozAlign: defaultCol.hozAlign,
            width: defaultCol.width,
            formatter: defaultCol.formatter,
            formatterParams: defaultCol.formatterParams,
          };

          currColsCopy.splice(j, 0, newColumn);
        }
      }
    }


    // const colFields = this.defaultColumns.filter(item => titleArr.includes(item.title))

    // let newCols: any[] = [];

    // for (let i = 0; i < colFields.length; i++) {
    //   const colField = colFields[i];

    //   console.log(titleArr[i], colField)
      
    //   const newColumn: ColumnDefinition = {
    //     title: titleArr[i],
    //     field: colField.field,
    //     headerFilter: true,
    //     hozAlign: "left",
    //     width: 200,
    //     formatter: "plaintext",
    //     editor: true,
    //   };
  
    //   // const newColumnData = {exampleColumn: "Example Data"}
      
    //   // const updatedDataState = [
    //   //   ...this.state.dataState.slice(0, this.state.dataState.length),
    //   //   newColumnData,
    //   //   ...this.state.dataState.slice(this.state.dataState.length + 1),
    //   // ]
  
    //   newCols.push(newColumn)
    // }

    // const filteredCols = [...this.state.columnsState, ...newCols];

    // console.log(filteredCols)
    // console.log([...this.state.columnsState, ...newCols], "updated")

    this.setState({
      columnsState: [...currColsCopy],
      // dataState: [...updatedDataState]
    });

    setTimeout(() => {
      this.initializeTabulator(this.state.dataState, [...currColsCopy]);
      this.forceUpdate();
    }, 500);
  };

  removeColumn = (titlesArr: string[]): void => {
    // console.log(this.state.columnsState)
    console.log(this.state.columnsState)
    const filteredColumns = this.state.columnsState.filter(item => !titlesArr.includes(item.title));
    console.log({filteredColumns})
    // const updatedDataState = this.state.dataState.map(obj => {
    //   const { [title]: omittedKey, ...rest } = obj;
    //   return rest;
    // });

    // console.log(filteredColumns)
    // console.log(updatedDataState)
    
    this.setState({
      columnsState: [...filteredColumns],
      // dataState: [...updatedDataState]
    });

    this.initializeTabulator(this.state.dataState, filteredColumns);
    this.forceUpdate();
  }

  initializeTabulator = (data: any, columns: any) => {
    if (this.el.current) {
      this.tabulator = new Tabulator(this.el.current, {
        data: data,
        responsiveLayout: "collapse",
        columns: [...columns],
        pagination: true,
        paginationSize: 15,
        paginationCounter:"rows",
        columnDefaults:{
          title: "",
          tooltip:true,
          headerTooltip: true
        }
      });
  
      this.addTabRowEventListeners();
    }
  }

  presetChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedValue = e.target.value;
    this.props.setTabulatorColumnPreset(selectedValue);
  }

  rowClicked = (e: any) => {
    const rowStakingAddress = e.target.closest('.tabulator-row').querySelector('[tabulator-field="stakingAddress"]').textContent.trim();

    if (e.target instanceof HTMLButtonElement && e.target.textContent === "Claim") {
      const poolData = this.state.dataState.filter(data => data.stakingAddress === rowStakingAddress);
      this.props.blockChainService.claimReward(e, poolData[0]);
    } else if (e.target.parentElement.parentElement.className === "copyBtn") {
      this.copyText(e.target.parentElement.parentElement.parentElement.querySelector('span').textContent);
    } else {
      const poolData = this.state.dataState.filter(data => data.stakingAddress === rowStakingAddress);
      this.props.setAppDataState(poolData)
    }
  };

  handleOptionSelect = (e: any) => {
    e.preventDefault();

    const updatedCols = this.state.selectedColumns.map(item => {
      if (item.title === e.target.innerHTML) {
        item.status = !item.status;
      }
      return item;
    })

    this.setState({
      selectedColumns: updatedCols
    })
  }

  public render() {

    // const showList = true; // in progress...
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
                  <Form.Select aria-label="Default select example" value={this.props.tabulatorColumsPreset} onChange={e => this.presetChange(e)}>
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

              <div className="selectableOptionContainer">
                <legend>Key Generation</legend>
                {this.state.selectedColumns.map((item, key) => (
                  ['k1', 'p', 'k2'].includes(item.title.toLowerCase()) ? 
                  <React.Fragment key={key}>
                    <span className={item.status ? 'selectedOption' : ''} onClick={this.handleOptionSelect}>{item.title}</span>
                  </React.Fragment>
                   : 
                  ""
                ))}

                <legend>Node status</legend>
                {this.state.selectedColumns.map((item, key) => (
                  ['s', 'a', 'c', 'e'].includes(item.title.toLowerCase()) ? 
                  <React.Fragment key={key}>
                    <span className={item.status ? 'selectedOption' : ''} onClick={this.handleOptionSelect}>{item.title}</span>
                  </React.Fragment>
                   : 
                  ""
                ))}

                <legend>My Finance</legend>
                {this.state.selectedColumns.map((item, key) => (
                  [
                    'Miner address',
                    'My Stake',
                    'Rewards',
                    'Ordered Withdraw'
                  ].includes(item.title) ? 
                  <React.Fragment key={key}>
                    <span className={item.status ? 'selectedOption' : ''} onClick={this.handleOptionSelect}>{item.title}</span>
                  </React.Fragment>
                   : 
                  ""
                ))}
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
