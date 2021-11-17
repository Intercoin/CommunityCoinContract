// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStakingFactory {
    
    event PairCreated(address indexed tokenA, address indexed tokenB, address pair, uint);

    function getPair(address tokenA, address tokenB, uint256 lockupDuration) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    // function createPair(address tokenA, address tokenB, uint256 lockupDuration) external returns (address pair);
    
    // function stake(address, address, uint256) external;
    // function tokensByPair(address pair) external view returns(address, address);

}
