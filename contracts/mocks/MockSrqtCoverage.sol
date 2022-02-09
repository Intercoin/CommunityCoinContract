// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "../StakingPool.sol";

contract MockSrqtCoverage is StakingPool {

    function calculateSqrt(
        uint256 x
    ) 
        public
        pure
        returns(uint256) 
    {
        return sqrt(x);
    }

}