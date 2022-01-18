// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IHook {
    function bonusCalculation(address instance, address account, uint64 duration, uint256 amount) external returns(uint256);
}