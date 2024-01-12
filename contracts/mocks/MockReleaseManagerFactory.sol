// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@intercoin/releasemanager/contracts/ReleaseManagerFactory.sol";

contract MockReleaseManagerFactory is ReleaseManagerFactory {
    constructor(address _implementation) ReleaseManagerFactory(_implementation) {
        
    }
}