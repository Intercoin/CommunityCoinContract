// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IStakingTransferRules.sol";

import "./StakingBase.sol";

contract StakingTransferRules is StakingBase, IStakingTransferRules {

    // called once by the factory at time of deployment
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint256 tradedTokenClaimFraction_, 
        uint256 reserveTokenClaimFraction_,
        uint256 lpClaimFraction_
    ) initializer external override {

        StakingBase_init(
            reserveToken_,
            tradedToken_, 
            tradedTokenClaimFraction_, 
            reserveTokenClaimFraction_,
            lpClaimFraction_
        );

    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require (
            (
                from == address(0) || // if minting
                from == address(this) || // burning to dead address or any contract do
                to == address(this) // redeem
            ),
            "TRANSFER STAKES DISABLED"
        );
        super._beforeTokenTransfer(operator, from, to, amount);
    }


}