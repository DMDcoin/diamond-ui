import React, { useEffect, useState } from "react";
import "../styles/randomNumber.css";
import Table from "react-bootstrap/Table";
import GridLoader from "react-spinners/GridLoader";
import { ModelDataAdapter } from "../model/modelDataAdapter";

interface RNGProps {
  adapter: ModelDataAdapter;
}

const CustomTable = ({ props }: any) => {
  const { adapter } = props;
  
  const [rangeEnd, setRangeEnd] = useState(0);
  const [rangeStart, setRangeStart] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([{ block: "#", rn: "#" }]);

  useEffect(() => {
    (async() => {
      const latestBlock = await adapter.web3.eth.getBlockNumber();
      setRangeEnd(latestBlock);
      setRangeStart(latestBlock);
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateTable = async (e: any) => {
    e.preventDefault();

    setIsLoading(true);
    
    const data = await adapter.getLatestRN(rangeStart, rangeEnd);
    setData(data);
    setIsLoading(false);
  };

  return (
    <>
      <h1>Historic Random Numbers</h1>

      <form>
        <input
          name="start"
          placeholder="Range Start Block"
          type="number"
          onChange={(e) => setRangeStart(Number(e.target.value))}
          required
          // value={rangeStart}
        />
        <input
          name="end"
          placeholder="Range End Block"
          type="number"
          onChange={(e) => setRangeEnd(Number(e.target.value))}
          required
          // value={rangeEnd}
        />
        <button onClick={updateTable} disabled={isLoading}>{ isLoading ? 'Generating!' : 'Generate'}</button>
      </form>

      {isLoading ? (
        <GridLoader
          color={"#254CA0"}
          loading={true}
          size={20}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Block #</th>
              <th>Random Number</th>
              <th>Hex Number</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any, key: number) => (
              <tr key={key}>
                <td>{item.block}</td>
                <td>{item.rn}</td>
                <td>{Number(item.rn).toString(16)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
};

class RNG extends React.Component<RNGProps> {
  // constructor(props: RNGProps) {
  //   super(props);
  // }

  public render(): JSX.Element {
    const result = (
      <>
        <div className="rngContainer">
          <CustomTable props={this.props} />
        </div>
      </>
    );
    return result;
  }
}

export default RNG;
