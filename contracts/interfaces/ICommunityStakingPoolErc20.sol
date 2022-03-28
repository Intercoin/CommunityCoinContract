// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommunityStakingPoolErc20 {
    
    function initialize(
        address stakingProducedBy_,
        address token_
    ) external;

    function redeem(address account, uint256 amount) external;
    
}
