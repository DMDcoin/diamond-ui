import React, { useEffect, useState } from "react";
import { Table } from "react-bootstrap";
import { Delegator } from "../model/model";

const DelegatorsData = ({ adapter, pool }: any) => {
  const delegators = pool.delegators;
  const [delegatorsData, setDelegatorsData] = useState(Array<any>);

  useEffect(() => {
   (async() => {
    console.log(pool.delegators)
    await getDelegatorsData();
   })()
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   const getDelegatorsData = async () => {
    let tempArray:any = [];
    await Promise.all(delegators.map(async (delegator: Delegator, i: number) => {
      const stakedAmount = await adapter.stContract.methods
        .stakeAmount(pool.stakingAddress, delegator.address)
        .call(adapter.tx(), adapter.block());
      const data: any = {
        address: delegator.address,
        stakeAmount: stakedAmount.toString() / 10 ** 18,
      };
      tempArray.push(data)
    }))
    setDelegatorsData(tempArray);
   }

  return (
    <React.Fragment>
      <Table>
        <thead>
          <tr>
            <td>Delegator</td>
            <td>Amount</td>
          </tr>
        </thead>
        <tbody>
          {delegatorsData.map((delegator: any, i: number) => (
            <tr key={i}>
              <td>{delegator.address}</td>
              <td>{delegator.stakeAmount} DMD</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </React.Fragment>
  );
};

export default DelegatorsData;
