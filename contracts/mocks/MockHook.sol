// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IHook.sol";
contract MockHook is IHook {

    // caller which can call methods `bonus`
    address internal caller;


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

    
    modifier onlyCaller() {
        require(msg.sender == caller, "access denied");
        _;
    }

    
    function setupCaller() external override {
        require(caller == address(0), "already setup");
        caller = msg.sender;
    }

    function claim(
        address /*account*/
    )
        external
        override
        
    {
        
    }

    function bonus(
        address /*instance*/, 
        address /*account*/, 
        uint64 /*duration*/,
        uint256 /*amount*/
    )
        external
        override
        
    {
        // return hAmount;
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