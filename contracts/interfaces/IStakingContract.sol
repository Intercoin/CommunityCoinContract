// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStakingContract {
    
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint64 lockupInterval_, //  interval 
        uint64 duration_, 
        uint64 tradedTokenClaimFraction_, 
        uint64 reserveTokenClaimFraction_,
        uint64 lpClaimFraction_
        ) external;
    /*
    function stake(address addr, uint256 amount) external;
    function getMinimum(address addr) external view returns(uint256);
    */
}
