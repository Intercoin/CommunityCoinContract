// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommunitySettings {
    
    struct CommunitySettings {
        address addr;
        string adminRole;
        string redeemRole;
        string circulationRole;
    }

}
