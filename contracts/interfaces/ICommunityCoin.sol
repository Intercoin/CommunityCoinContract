// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommunityCoin {
    
    function initialize(
        address poolImpl,
        address hook,
        address instancesImpl,
        uint256 discountSensitivity
    ) external;

    event InstanceCreated(address indexed tokenA, address indexed tokenB, address instance);

    function issueWalletTokens(address account, uint256 amount, uint256 priceBeforeStake) external;

}
