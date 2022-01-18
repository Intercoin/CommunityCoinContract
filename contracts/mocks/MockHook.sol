// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IHook.sol";
contract MockHook is IHook {
    function bonusCalculation(
        address /*instance*/, 
        address /*account*/, 
        uint64 /*duration*/,
        uint256 amount
    )
        external
        pure
        override
        returns(uint256)
        
    {
        return amount * 10 / 100;
    }
}