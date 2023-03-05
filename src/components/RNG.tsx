import React from "react";
import '../styles/randomNumber.css'
import { ModelDataAdapter } from "../model/modelDataAdapter";

interface RNGProps {
  adapter: ModelDataAdapter;
}

class RNG extends React.Component<RNGProps> {
  constructor(props: RNGProps) {
    super(props);
  }

  getRandomNumber = async (e: any) => {
    e.preventDefault();
    
    const { adapter } = this.props;
    const rn = await adapter.getLatestRN();
    (document.getElementsByName("randomNumberField")[0] as HTMLInputElement).value = rn;
  };

  public currentRN = "";

  public render(): JSX.Element {
    const result = (
      <>
        <div className="rngContainer">
          <h1>Random Number</h1>

          <form>
            <input disabled name="randomNumberField"/>
            <button onClick={this.getRandomNumber}>Generate</button>
          </form>
        </div>
      </>
    );
    return result;
  }
}

export default RNG;
