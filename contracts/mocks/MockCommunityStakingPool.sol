// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../CommunityStakingPool.sol";
    
contract MockCommunityStakingPool is CommunityStakingPool {

    //IUniswapV2Pair public uniswapV2Pair;

    // function setUniswapPair(address addr) public {
    //     uniswapV2Pair = IUniswapV2Pair(addr);
    // }

    function setStakingToken(address stakingToken_) public {
        stakingToken = stakingToken_;
    }

    // function setupExternalAddresses() internal virtual override {
    //     // //attach deployed lib with uniswap addresses
    //     // ILiquidityLib liquidityLib = ILiquidityLib(0x1eA4C4613a4DfdAEEB95A261d11520c90D5d6252);
    //     // // setup swap addresses
    //     // (uniswapRouter, uniswapRouterFactory) = liquidityLib.uniswapSettings();
                                                             
    //     uniswapRouter = 0x10ED43C718714eb63d5aA57B78B54704E256024E; //uniswapRouter
    //     uniswapRouterFactory = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73; //uniswapRouterFactory                     
    //     UniswapV2Router02 = IUniswapV2Router02(uniswapRouter);
    // }

}