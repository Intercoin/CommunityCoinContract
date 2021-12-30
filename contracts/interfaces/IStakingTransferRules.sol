
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStakingTransferRules {
    
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint64 tradedTokenClaimFraction_, 
        uint64 reserveTokenClaimFraction_,
        uint64 lpClaimFraction_
        ) external;
    
}
