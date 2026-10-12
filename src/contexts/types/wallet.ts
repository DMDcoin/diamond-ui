import BigNumber from "bignumber.js";

export class UserWallet {
  constructor(address: string, balance: BigNumber) {
    this.myAddr = address;
    this.myBalance = balance;
  }

  public myAddr: string;
  public myBalance: BigNumber = new BigNumber(0);
}
