// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./IStructs.sol";

interface ICommunityStakingPool {
    
    function initialize(
        address stakingProducedBy_,
        address reserveToken_,
        address tradedToken_, 
        IStructs.StructAddrUint256[] memory donations_,
        uint64 lpFraction_,
        address lpFractionBeneficiary_
    ) external;
    /*
    function stake(address addr, uint256 amount) external;
    function getMinimum(address addr) external view returns(uint256);
    */
    function redeem(address account, uint256 amount) external returns(uint256 affectedLPAmount);
    function redeemAndRemoveLiquidity(address account, uint256 amount) external returns(uint256 affectedReservedAmount, uint256 affectedTradedAmount);
}
