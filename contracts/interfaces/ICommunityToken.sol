// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommunityToken {
    
    function initialize(
        address poolImpl,
        address hook,
        uint256 discountSensitivity
    ) external;

    event InstanceCreated(address indexed tokenA, address indexed tokenB, address instance, uint instancesCount);

    function getInstance(address reserveToken, address tradedToken, uint256 lockupIntervalCount) external view returns (address instance);
    function instances(uint index) external view returns (address instance);
    function instancesCount() external view returns (uint);

    function issueWalletTokens(address account, uint256 amount, uint256 priceBeforeStake) external;

}