
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStakingTransferRules {
    
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint256 tradedTokenClaimFraction_, 
        uint256 reserveTokenClaimFraction_,
        uint256 lpClaimFraction_
        ) external;
    
}
