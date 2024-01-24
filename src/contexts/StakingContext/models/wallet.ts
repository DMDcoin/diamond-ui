import BN from "bn.js";

export class UserWallet {
  constructor(address: string, balance: BN) {
    this.myAddr = address;
    this.myBalance = balance;
  }

  public myAddr: string;
  public myBalance: BN = new BN(0);
}
