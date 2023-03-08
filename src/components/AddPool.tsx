import BN from "bn.js";
import React from "react";
import "../styles/addpool.css";
import { Pool } from "../model/model";
import { Table } from "react-bootstrap";
import "react-toastify/dist/ReactToastify.css";
import { publicToAddress, toBuffer } from "ethereumjs-util";
import Wallet  from 'ethereumjs-wallet';
import Accordion from "react-bootstrap/Accordion";
import { ToastContainer, toast } from "react-toastify";
import { ModelDataAdapter } from "../model/modelDataAdapter";

interface AddPoolProps {
  adapter: ModelDataAdapter;
}

class AddPool extends React.Component<AddPoolProps> {
  private minningAddress = "";
  private publicKey = "";

  notify = (msg: string) => toast(msg);

    constructor(props: AddPoolProps) {
      super(props);
    }

  getAddressFromPublicKey(publicKey: string): string {
    let publicKeyCleaned = publicKey;

    if (publicKey.startsWith("0x")) {
      publicKeyCleaned = publicKey.substring(2);
    }

    const resultBuffer = publicToAddress(
      Buffer.from(publicKeyCleaned, "hex"),
      true
    );

    return `0x${resultBuffer.toString("hex")}`;
  }

  handleAddPool = async (e: any) => {
    e.preventDefault();

    const publicKey = this.publicKey;
    this.minningAddress = this.getAddressFromPublicKey(publicKey);
    const stakeAmount = e.target.stakeAmount.value;
    const ipAddress = e.target.ipAddress.value;

    const { adapter } = this.props;
    const context = adapter.context;

    if (!context.myAddr) {
        this.notify("Please connect wallet!");
        return true;
    } else if (context.myAddr == 'connecting') {
        this.notify("Please wait for wallet to connect");
        return true;
    }

    const accBalance = await adapter.postProvider.eth.getBalance(context.myAddr);
    

    if (!adapter.web3.utils.isAddress(this.minningAddress)) {
      this.notify("Enter valid minning address");
    } else if (context.myAddr === this.minningAddress) {
      this.notify("Pool and mining addresses cannot be the same");
    } else if (!adapter.areAddressesValidForCreatePool(context.myAddr, this.minningAddress)) {
      this.notify("Staking or mining key are or were already in use with a pool");
    } else if (stakeAmount > accBalance) {
      this.notify(`Insufficient balance (${accBalance}) for selected amount ${stakeAmount}`);
    } else if (!adapter.canStakeOrWithdrawNow()) {
      this.notify("Outside staking window");
    } else if (stakeAmount < context.candidateMinStake) {
      this.notify("Insufficient candidate (pool owner) stake");
    } else {
        const id = toast.loading("Transaction Pending");
        try {
            const resp = await adapter.createPool(this.minningAddress, this.publicKey, stakeAmount, '0x00000000000000000000000000000000');
            if (resp) {
            toast.update(id, { render: `Successfully staked ${stakeAmount} DMD`, type: "success", isLoading: false });
            } else {
            toast.update(id, { render: "User denied transaction", type: "warning", isLoading: false });
            }
        } catch (err: any) {
            toast.update(id, { render: err.message, type: "error", isLoading: false });
        }
        setTimeout(() => {
            toast.dismiss(id)
        }, 3000);
    }
  };

  public render(): JSX.Element {
    const result = (
      <>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />

        <div className="mainAddPoolContainer">
          <h1>Add Pool</h1>
          <form className="addPoolForm" onSubmit={this.handleAddPool}>

            <label>Public Key</label>
            <input
              type="text"
              minLength={128}
              maxLength={130}
              name="publicKey"
              onChange={(e:any) => this.publicKey = e.currentTarget.value}
              placeholder="Public Key"
              required
            />

            <label>Initial Stake</label>
            <input
              type="number"
              name="stakeAmount"
              placeholder="Initial Stake"
              required
              min={10000}
            />

            <label>Ip Address</label>
            <input
              type="text"
              name="ipAddress"
              placeholder="IP Address"
              required
            />

            <button type="submit">Add</button>
          </form>
        </div>
      </>
    );
    return result;
  }
}

export default AddPool;