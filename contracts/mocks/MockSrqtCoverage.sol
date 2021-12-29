// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../StakingBase.sol";

contract MockSrqtCoverage is StakingBase {
    
    function calculateSqrt(
        uint256 x
    ) 
        public
        view
        returns(uint256) 
    {
        return sqrt(x);
    }
}