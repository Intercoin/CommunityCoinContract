// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../StakingContract.sol";

contract MockSrqtCoverage is StakingContract {

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