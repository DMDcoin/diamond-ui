import BN from "bn.js";
import { Pool } from "../model/model";
import { Context } from '../model/context';
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { ModelDataAdapter } from '../model/modelDataAdapter';

interface PoolProps {
  pool: Pool;
  adapter: ModelDataAdapter;
}

export default class BlockchainService {
  private notify;
  private pool: Pool;
  private context: Context;
  private adapter: ModelDataAdapter;

  constructor(props: any) {
    const { adapter, pool } = props as { adapter: ModelDataAdapter } & PoolProps;
    const context = adapter.context;

    this.pool = pool;
    this.adapter = adapter;
    this.context = context;

    this.notify = (msg: string) => toast(msg);

    // Bind methods explicitly to the class instance
    this.claimReward = this.claimReward.bind(this);
    this.getRewardClaimableAmount = this.getRewardClaimableAmount.bind(this);
  }

  public async getRewardClaimableAmount(): Promise<string> {
    if (this.context.myAddr) {
      const hasStake: boolean = this.pool.stakingAddress === this.context.myAddr ? true : (await this.adapter.stContract.methods.stakeFirstEpoch(this.pool.stakingAddress, this.context.myAddr).call()) !== '0';
      const claimableAmount = hasStake ? await this.adapter.stContract.methods.getRewardAmount([], this.pool.stakingAddress, this.context.myAddr).call() : '0';

      return claimableAmount;
    } else {
      return '0';
    }
  }

  public async claimReward (e:any, pool: any) {
    e.preventDefault();
    if (pool) this.pool = pool;
    console.log("User wants to claim on pool:", this.pool.stakingAddress);

    if (!this.context.myAddr) {
      this.notify("Please connect wallet!");
      return true;
    } else if (this.context.myAddr == 'connecting') {
      this.notify("Please wait for wallet to connect");
      return true;
    }

    const toastId = toast.loading("Transaction Pending");
    const moreToClaim = await this.adapter.claimReward(this.pool.stakingAddress);
    this.getRewardClaimableAmount();

    if (moreToClaim == 'error') {
      toast.update(toastId, { render: "Tx Failed, please try again", type: "error", isLoading: false });
    } else {
      toast.update(toastId, { render: "Claimed Successfully", type: "success", isLoading: false });
    }

    setTimeout(() => {
      toast.dismiss(toastId)
    }, 3000);
  }

  public async handleDelegateStake (e: any) {
    e.preventDefault();

    const stakeAmount = this.adapter.web3.utils.toWei(e.target[0].value).toString();

    if (!this.context.myAddr) {
      this.notify("Please connect wallet!");
      return true;
    } else if (this.context.myAddr == 'connecting') {
      this.notify("Please wait for wallet to connect");
      return true;
    }

    const previousStakeAmount = this.pool.myStake;
    const minStake =
      this.pool === this.context.myPool
        ? this.context.candidateMinStake
        : (this.context.delegatorMinStake as any) / 10 ** 18;

    const accBalance = await this.adapter.postProvider.eth.getBalance(this.context.myAddr);

    if (new BN(stakeAmount).gt(new BN(accBalance))) {
      console.log(this.context.myBalance.toString(), stakeAmount, accBalance);

      this.notify(`Insufficient balance ${this.context.myBalance} for selected amount ${stakeAmount}`);
      return true;
    } else if (!this.context.canStakeOrWithdrawNow) {
      this.notify("outside staking/withdraw time window");
      return true
    } else if (
      this.pool !== this.context.myPool &&
      this.pool.candidateStake < this.context.candidateMinStake
    ) {
      // TODO: this condition should be checked before even enabling the button
      this.notify("Insufficient candidate (pool owner) stake");
      return true;
    } else if (new BN(previousStakeAmount).add(new BN(stakeAmount)).lt(new BN(minStake))) {
      this.notify(`Min staking amount is ${minStake}`);
      return true;
    } else if (this.pool.isBanned()) {
      this.notify("Cannot stake on a pool which is currently banned");
      return true;
    } else {
      const id = toast.loading("Transaction Pending");
      try {
        const resp = await this.adapter.stake(this.pool.stakingAddress, stakeAmount);
        if (resp) {
          await this.adapter.reUpdatePool(this.pool);
          toast.update(id, { render: `Successfully staked ${stakeAmount} DMD`, type: "success", isLoading: false });
          // this.forceUpdate();
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

  public async handleWithdraw (e: any) {
    e.preventDefault();

    const withdrawAmount = e.target.withdrawAmount.value;
    const poolAddress = this.pool.stakingAddress;
    const minningAddress = this.pool.miningAddress;

    if (!this.context.myAddr) {
      this.notify("Please connect wallet!");
      return true;
    } else if (this.context.myAddr == 'connecting') {
      this.notify("Please wait for wallet to connect");
      return true;
    }

    const id = toast.loading("Transaction Pending");
    const isActiveValidator = await this.adapter.vsContract.methods.isValidator(minningAddress).call();

    if (isActiveValidator) {
      toast.update(id, { render: "Active validator, can't withdraw", type: "warning", isLoading: false });
    } else if (Number.isNaN(withdrawAmount)) {
      toast.warning('No amount entered');
    } else if (!this.context.canStakeOrWithdrawNow) {
      toast.warning('Outside staking/withdraw time window');
    } else if (new BN(withdrawAmount).gte(this.pool.myStake)) {
      toast.warning('Cannot withdraw as much');
    } else {
      try {
        const { success, reason } = await this.adapter.withdrawStake(poolAddress, withdrawAmount.toString());
        if (!success) {
          setTimeout(() => {
            toast.dismiss(id)
          }, 0);
          toast.error(reason.charAt(0).toUpperCase() + reason.slice(1));
        } else {
          await this.adapter.reUpdatePool(this.pool);
          toast.update(id, { render: "Transaction compeleted", type: "success", isLoading: false });
          // this.forceUpdate();
        }
      } catch(err) {
        console.log(err)
        toast.update(id, { render: "User denied transaction", type: "warning", isLoading: false });
      }
    }

    setTimeout(() => {
      toast.dismiss(id)
    }, 3000);
    
  }

  public async claimStake (e: any) {
    e.preventDefault();

    if (!this.context.myAddr) {
      this.notify("Please connect wallet!");
      return true;
    } else if (this.context.myAddr == 'connecting') {
      this.notify("Please wait for wallet to connect");
      return true;
    }

    if (!this.context.canStakeOrWithdrawNow) {
      this.notify('outside staking/withdraw time window');
    } else {
      const toastId = toast.loading("Transaction Pending");
      await this.adapter.claimStake(this.pool.stakingAddress);
      setTimeout(() => {
        toast.dismiss(toastId)
      }, 3000);
    }
  }
}

