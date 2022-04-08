// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./IStructs.sol";

interface ICommunityStakingPool {
    
    function initialize(
        address stakingProducedBy_,
        address reserveToken_,
        address tradedToken_, 
        IStructs.StructAddrUint256[] memory donations_,
        uint64 tradedTokenClaimFraction_, 
        uint64 reserveTokenClaimFraction_,
        uint64 lpClaimFraction_
    ) external;
    /*
    function stake(address addr, uint256 amount) external;
    function getMinimum(address addr) external view returns(uint256);
    */
    function redeem(address account, uint256 amount) external;
    function redeemAndRemoveLiquidity(address account, uint256 amount) external;
}
