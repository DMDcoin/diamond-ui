interface Parameter {
  getter: string;
  setter: string;
  min: string;
  max: string;
  step: string;
  decimals: number;
  stepOperation: string;
  value: string | undefined;
}

interface ParameterGroup {
  [parameterName: string]: Parameter;
}

interface EcosystemParameters {
  [groupName: string]: ParameterGroup;
}

export const EcosystemParameters: EcosystemParameters = {
  "Staking": {
    "Delegator Min. Stake": {
      getter: "delegatorMinStake",
      setter: "setDelegatorMinStake",
      min: "50",
      max: "250",
      step: "50",
      decimals: 18,
      stepOperation: "add",
      value: undefined
    },
  },

  "Tx Permission": {
    "Minimum Gas Price": {
      getter: "minimumGasPrice",
      setter: "setMinimumGasPrice",
      min: "0.1",
      max: "10",
      step: "2",
      decimals: 9,
      stepOperation: "multiply",
      value: undefined
    },
    "Block Gas Limit": {
      getter: "blockGasLimit",
      setter: "setBlockGasLimit",
      min: "100000",
      max: "1000000",
      step: "100000",
      decimals: 9,
      stepOperation: "add",
      value: undefined
    },
  },

  "Block Reward": {
    "Governance Pot Share Nominator": {
      getter: "",
      setter: "setGovernancePotShareNominator",
      min: "10",
      max: "20",
      step: "1",
      stepOperation: "",
      decimals: 18,
      value: undefined
    },
  },

//   "To be implemented": {
//     minBlockTime: { getter: "", setter: "", min: "", max: "", step: "", stepOperation: "", decimals: 18, value: undefined },
//     maxBlockTime: { getter: "", setter: "", min: "", max: "", step: "", stepOperation: "", decimals: 18, value: undefined },
//     proposalFee: { getter: "", setter: "", min: "", max: "", step: "", stepOperation: "", decimals: 18, value: undefined },
//     maxStake: { getter: "", setter: "", min: "", max: "", step: "", stepOperation: "", decimals: 18, value: undefined },
//   },
};
