// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IHook.sol";
contract MockHook is IHook {

    bool internal hTransferFlag;
    uint256 internal hAmount;

    function setupVars(
        uint256 amount,
        bool boolFlag
    )
        public 
    {
        hTransferFlag = boolFlag;
        hAmount = amount;
    }

    function bonusCalculation(
        address /*instance*/, 
        address /*account*/, 
        uint64 /*duration*/,
        uint256 /*amount*/
    )
        external
        view
        override
        returns(uint256)
        
    {
        return hAmount;
    }

    
    function transferHook(
        address /*operator*/, 
        address /*from*/, 
        address /*to*/, 
        uint256 /*amount*/
    ) 
        external 
        override
        returns(bool)
    {
        return hTransferFlag;
    }
}