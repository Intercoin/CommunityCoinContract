
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
//import "./IStructs.sol";
interface ICoinGateway {
    
    struct GatewayLimits {
        uint16 fraction; 
        uint16 duration;
        uint256 globalAmount; 
        uint16 globalDuration;
    }

    function initialize(address fromCommunityCoin, GatewayLimits calldata gatewayLimits) external;

    // It will have a method which will receive an amount of NYC Coin and an address of the destination community.
    // ==== Case ====
    // user: 
    //  approve coins#1 to gateway and call pay
    //  gateway will call fromCommunityCoin->redeem(amount)
    //  gateway will recieve reserveToken
    // then calling toCommunityCoin.stake(to)
    //  to(user#2) will receive coins#2(toCommunityCoin)
    function pay(address to, uint256 amount, address toCommunityCoin, address toStakePool) external;
    
    // a method which can be used to specify both the outgoing and incoming pool, or at least one of them. 
    // Otherwise, pay() will try all the pools in order of increasing stake duration, until it finds one that has enough redeemable INTER to withdraw. 
    // And by default it would can use any pool in the other community, since it doesn’t plan to unstake. 
    // Those INTER tokens can only be redeemed, not unstaked, by a vendor in the Paris community.
    // ==== Case ====
    // user: 
    //  approve coins#1 to gateway and call pay
    //  gateway will call fromCommunityCoin->redeem(amount, fromRedeemPool)
    //  gateway will recieve reserveToken
    //  then calling toCommunityCoin.stake(to, toStakePool)
    //  to(user#2) will receive coins#2(toCommunityCoin)
    function payUsingPools(address to, uint256 amount, address toCommunityCoin, address toStakePool, address fromRedeemPool) external;
}