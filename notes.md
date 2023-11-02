



    /// @dev Returns an array of epoch numbers for which the specified staker
    /// can claim a reward from the specified pool by the `StakingHbbft.claimReward` function.
    /// @param _poolStakingAddress The pool staking address.
    /// @param _staker The staker's address (delegator or candidate/validator).
    function epochsToClaimRewardFrom(
        address _poolStakingAddress,
        address _staker
    )


    function epochsPoolGotRewardFor(address _miningAddress)
    public
    view
    returns(uint256[] memory) {
        return _epochsPoolGotRewardFor[_miningAddress];
    }


  1: get epochsPoolGotRewardFor.
  2: figure out all delegators