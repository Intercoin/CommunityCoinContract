// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommunityCoin {
    
    function initialize(
        address poolImpl,
        address poolErc20Impl,
        address hook,
        address instancesImpl,
        uint256 discountSensitivity,
        address rolesManagementClone,
        address reserveToken,
        address tradedToken,
        address costManager
    ) external;

    event InstanceCreated(address indexed tokenA, address indexed tokenB, address instance);
    event InstanceErc20Created(address indexed erc20token, address instance);

    function issueWalletTokens(address account, uint256 amount, uint256 priceBeforeStake) external;

}
