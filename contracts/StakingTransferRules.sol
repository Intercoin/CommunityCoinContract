// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IStakingTransferRules.sol";
import "./StakingBase.sol";

contract StakingTransferRules is StakingBase, IStakingTransferRules {

    /**
    * @notice initialize method. Called once by the factory at time of deployment
    * @param reserveToken_ address of reserve token. ie WETH,USDC,USDT,etc
    * @param tradedToken_ address of traded token. ie investor token - ITR
    * @param tradedTokenClaimFraction_ fraction of traded token multiplied by `MULTIPLIER`. 
    * @param reserveTokenClaimFraction_ fraction of reserved token multiplied by `MULTIPLIER`. 
    * @param lpClaimFraction_ fraction of LP token multiplied by `MULTIPLIER`. 
    */
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint64 tradedTokenClaimFraction_, 
        uint64 reserveTokenClaimFraction_,
        uint64 lpClaimFraction_
    ) 
        initializer 
        external 
        override 
    {

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
            "TRANSFER_STAKES_DISABLED"
        );
        super._beforeTokenTransfer(operator, from, to, amount);
    }


}