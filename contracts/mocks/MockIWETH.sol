// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
//import "@uniswap/v2-periphery/contracts/interfaces/IERC20.sol";

interface MockIWETH is IWETH {
    function approve(address spender, uint value) external returns (bool);
}