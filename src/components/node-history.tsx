// import { ModelDataAdapter } from "../model/modelDataAdapter";
// import { observer } from 'mobx-react';
// import { DmdComponent, ethValueFormatted } from "./dmd-component";
// import { Table } from "react-bootstrap";
// import React, { FunctionComponent, useState } from "react";


// const ContractDetailsUI:FunctionComponent<{ initial?: number }> = ({ initial = 0 }) => { 
//   const [clicks, setClicks] = useState(initial);
//   return <>
//     <p>Clicks: {clicks}</p>
//     <button onClick={() => setClicks(clicks+1)}>+</button>
//     <button onClick={() => setClicks(clicks-1)}>-</button>
//   </>
// }



// export interface IContractDetailsUIProps {
//   modelDataAdapter: ModelDataAdapter;
// }

// export class ContractDetailsUI extends React.Component<IContractDetailsUIProps, {}>  { 

//   public componentDidMount() {
//     //const reward = await contracts.getRewardHbbft()
//   }

//   public render(): JSX.Element { 

//     const { context, contracts } = this.props.modelDataAdapter;

    
    

//     //this.props.modelDataAdapter.contracts.getStakingHbbft

//     return <div>
//          <Table bordered hover>
//             <tbody>
//               <tr>
//                 <td>current epochs reward expections</td>
//               </tr>
//               <tr>
//               <td>validators</td>
//                 <td>{context.pools.filter(x => x.isCurrentValidator).length}</td>
//               </tr>
//               <tr>
//                 <td>delta pot</td>
//                 <tr>{formatEth(context.deltaPot)}</tr>
//               </tr>
//               <tr>
//                 <td>reinsert pot</td>
//                 <tr>{formatEth(context.reinsertPot)}</tr>
//               </tr>
//             </tbody>
//          </Table>

//     </div>;
//   }
// }

export {}