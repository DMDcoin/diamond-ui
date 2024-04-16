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
      setter: "setDelegatorMinStake(uin256)",
      params: [],
      value: undefined
    },
  },

  "Tx Permission": {
    "Minimum Gas Price": {
      getter: "minimumGasPrice()",
      setter: "setMinimumGasPrice(uin256)",
      params: [],
      value: undefined
    },
    "Block Gas Limit": {
      getter: "blockGasLimit()",
      setter: "setBlockGasLimit(uin256)",
      params: [],
      value: undefined
    },
  },

  "Block Reward": {
    "Governance Pot Share Nominator": {
      getter: "governancePotShareNominator()",
      setter: "setGovernancePotShareNominator(uin256)",
      params: [],
      value: undefined
    },
  }
};
