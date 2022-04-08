// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

interface ICommunityRolesManagement {
    struct CommunitySettings {
        address addr;
        string adminRole;
        string redeemRole;
        string circulationRole;
    }

    function initialize(
        CommunitySettings calldata communitySettings,
        address admin
    ) external;   

    function checkRedeemRole(address account) external view;
    function checkCirculationRole(address account) external view;

    
}
