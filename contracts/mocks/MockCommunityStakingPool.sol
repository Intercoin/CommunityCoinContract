// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "../CommunityStakingPool.sol";
    
contract MockCommunityStakingPool is CommunityStakingPool {

    //IUniswapV2Pair public uniswapV2Pair;

    function setUniswapPair(address addr) public {
        uniswapV2Pair = IUniswapV2Pair(addr);
    }
}