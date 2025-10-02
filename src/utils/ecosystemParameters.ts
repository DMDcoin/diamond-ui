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
  "DAO": {
    "Create proposal fee": {
      getter: "createProposalFee()",
      setter: "setCreateProposalFee(uint256)",
      params: [],
      value: undefined
    }
  },

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

  "Block Reward": {
    "Governance Pot Share Nominator": {
      getter: "governancePotShareNominator()",
      setter: "setGovernancePotShareNominator(uint256)",
      params: [],
      value: undefined
    },
  },

  "Connectivity Tracker": {
    "Report Disallow Period": {
      getter: "reportDisallowPeriod()",
      setter: "setReportDisallowPeriod(uint256)",
      params: [],
      value: undefined
    }
  },

  "Bonus Score System": {
    "Standby Bonus": {
      getter: "standByFactor()",
      setter: "setStandByFactor(uint256)",
      params: [],
      value: undefined
    }
  }
};
