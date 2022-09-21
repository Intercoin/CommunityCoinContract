// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

interface ICommunityRolesManagement {
    struct CommunitySettings {
        address addr;
        uint8 adminRole;
        uint8 redeemRole;
        uint8 circulationRole;
    }

    function initialize(
        CommunitySettings calldata communitySettings
    ) external;   

    function getRedeemRole() external view returns(uint8);
    
    function checkRedeemRole(address account) external view;
    function checkCirculationRole(address account) external view;

    
}
