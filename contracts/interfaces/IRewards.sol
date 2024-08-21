// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./IHook.sol";
interface IRewards is IHook {

    function initialize(
        address _sellingToken,
        uint64[] memory _timestamps,
        uint256[] memory _prices,
        uint256[] memory _amountRaised,
        uint64 _endTs,
        uint256[] memory _thresholds,
        uint256[] memory _bonuses,
        address costManager,
        address producedBy
    ) external;

    function onClaim(address account) external;

    function onUnstake(address instance, address account, uint64 duration, uint256 amount, uint64 rewardsFraction) external;
}