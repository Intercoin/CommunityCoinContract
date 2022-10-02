// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IHook.sol";
contract MockHook is IHook {
    uint64 internal constant FRACTION = 100000; // fractions are expressed as portions of this

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

    function onClaim(
        address /*account*/
    )
        external
        override
        
    {
        
    }

    function onUnstake(
        address /*instance*/, 
        address /*account*/, 
        uint64 /*duration*/,
        uint256 /*amount*/,
        uint64 /*rewardsFraction*/
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
        uint256 amount
    ) 
        external 
        override
        returns(bool, uint256)
    {
        
        return (hTransferFlag, amount);
    }

}