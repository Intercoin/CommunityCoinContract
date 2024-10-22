
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

interface IStructs {
    struct StructAddrUint256 {
        address account;
        uint256 amount;
    }

    // CommunityCoin 
    struct FactorySettings{
        address poolImpl;
        address stakingPoolFactory;
        address costManager;
        address producedBy;
        address linkedContract;
        address liquidityLib;
        address[] whitelistedTokens;
    }

    struct CommunitySettings {
        uint256 invitedByFraction;
        address addr;
        uint8 redeemRoleId;
        uint8 circulationRoleId;
        uint8 tariffRoleId;
    }

    struct Total {
        uint256 totalUnstakeable;
        uint256 totalRedeemable;
        // it's how tokens will store in pools. without bonuses.
        // means totalReserves = SUM(pools.totalSupply)
        uint256 totalReserves;
    }
    struct StructGroup {
        uint64 duration;
        uint64 bonusTokenFraction;
        uint64 rewardsRateFraction;
        uint64 numerator;
        uint64 denominator;
    }
    enum InstanceType{ USUAL, ERC20, NONE }

}