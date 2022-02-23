// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommunityStakingPoolFactory {
    
    
    struct InstanceInfo {
        address reserveToken;
        uint64 duration;
        address tradedToken;
        uint64 reserveTokenClaimFraction;
        uint64 tradedTokenClaimFraction;
        uint64 lpClaimFraction;
        uint64 numerator;
        uint64 denominator;
        bool exists;
    }

    event InstanceCreated(address indexed tokenA, address indexed tokenB, address instance, uint instancesCount);

    function initialize(address impl) external;
    function getInstance(address reserveToken, address tradedToken, uint256 lockupIntervalCount) external view returns (address instance);
    function instancesByIndex(uint index) external view returns (address instance);
    function instances() external view returns (address[] memory instances);
    function instancesCount() external view returns (uint);
    function produce(address reserveToken, address tradedToken, uint64 duration, uint64 reserveTokenClaimFraction, uint64 tradedTokenClaimFraction, uint64 lpClaimFraction, uint64 numerator, uint64 denominator) external returns (address instance);
    function getInstanceInfoByPoolAddress(address addr) external view returns(InstanceInfo memory);
}
