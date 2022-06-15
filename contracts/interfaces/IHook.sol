// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IHook {
    function setupCaller() external;
    function claim(address account) external;
    function bonus(address instance, address account, uint64 duration, uint256 amount) external;
    function transferHook(address operator, address from, address to, uint256 amount) external returns(bool);


    
}