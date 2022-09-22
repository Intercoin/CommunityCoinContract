
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

interface IStructs {
    struct StructAddrUint256 {
        address account;
        uint256 amount;
    }

    struct CommunitySettings {
        uint256 invitedByFraction;
        address addr;
        uint8 adminRoleId;
        uint8 redeemRoleId;
        uint8 circulationRoleId;
        uint8 tariffRoleId;
    }
}