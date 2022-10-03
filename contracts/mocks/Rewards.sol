// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./RewardsBase.sol";
import "../interfaces/IHook.sol";

contract Rewards is RewardsBase, IHook {
    // caller which can call methods `bonus`
    address internal caller;

    function initialize(
        address sellingToken,
        uint256[] memory timestamps,
        uint256[] memory prices,
        uint256[] memory thresholds,
        uint256[] memory bonuses
    ) external initializer {
        __Rewards_init(sellingToken, timestamps, prices, thresholds, bonuses);
    }

    modifier onlyCaller() {
        require(_msgSender() == caller, "access denied");
        _;
    }

    function setupCaller() external override {
        require(caller == address(0), "already setup");
        caller = _msgSender();
    }

    function onClaim(address account) external onlyCaller {}

    function onUnstake(
        address, /*instance*/
        address account,
        uint64, /*duration*/
        uint256 amount,
        uint64 rewardsFraction
    ) external onlyCaller {
        _addBonus(account, amount);
    }
}
