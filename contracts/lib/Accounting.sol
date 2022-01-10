// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/**
 * @dev Tooling for timepoints, timers and delays
 */
library Accounting {
    struct AccountData {
        
        uint160 minimum;
        uint64 timestamp;
        uint16 instanceIndex;
    }

}

contract T {
    using Accounting for Accounting.AccountData;

    Accounting.AccountData x;
}