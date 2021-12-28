// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStakingContract {
    
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint256 lockupInterval_, //  interval 
        uint256 duration_, 
        uint256 tradedTokenClaimFraction_, 
        uint256 reserveTokenClaimFraction_,
        uint256 lpClaimFraction_
        ) external;
    /*
    function stake(address addr, uint256 amount) external;
    function getMinimum(address addr) external view returns(uint256);
    */
}
