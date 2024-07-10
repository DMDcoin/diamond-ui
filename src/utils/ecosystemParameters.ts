interface Parameter {
  getter: string;
  setter: string;
  params: string[];
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
      getter: "delegatorMinStake()",
      setter: "setDelegatorMinStake(uint256)",
      params: [],
      value: undefined
    },
  },

  "Tx Permission": {
    "Minimum Gas Price": {
      getter: "minimumGasPrice()",
      setter: "setMinimumGasPrice(uint256)",
      params: [],
      value: undefined
    },
    "Block Gas Limit": {
      getter: "blockGasLimit()",
      setter: "setBlockGasLimit(uint256)",
      params: [],
      value: undefined
    },
  },

  // "Block Reward": {
  //   "Governance Pot Share Nominator": {
  //     getter: "governancePotShareNominator()",
  //     setter: "setGovernancePotShareNominator(uint256)",
  //     params: [],
  //     value: undefined
  //   },
  // }
};
