// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;
//import "./interfaces/IHook.sol"; exists in PoolStakesLib
// import "./interfaces/ITaxes.sol";
// import "./interfaces/IDonationRewards.sol";

// import "./interfaces/ICommunityCoin.sol";
// import "./interfaces/ICommunityStakingPool.sol";

// import "./interfaces/ICommunityStakingPoolFactory.sol";
// //import "./interfaces/IStructs.sol"; exists in ICommunityCoin
// import "./RolesManagement.sol";

// //import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// import "@intercoin/community/contracts/interfaces/ICommunity.sol";
// import "@intercoin/releasemanager/contracts/CostManagerHelperERC2771Support.sol";

// import "@intercoin/liquidity/contracts/interfaces/ILiquidityLib.sol";

// import "./libs/PoolStakesLib.sol";

//import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./interfaces/ICoinGateway.sol";
import "./CommunityCoin.sol";
import "./CommunityStakingPool.sol";


contract CoinGateway is Initializable, ReentrancyGuardUpgradeable, ICoinGateway {
    address public fromCommunityCoin;
    
    uint16 public fraction; 
    uint16 public duration;
    uint256 public globalAmount; 
    uint16 public globalDuration;

    event Pay(address from, uint256 sent, address to, uint256 toAmount);

    function initialize(address fromCommunityCoin_, GatewayLimits calldata gatewayLimits) external initializer {
        __ReentrancyGuard_init();

        fromCommunityCoin = fromCommunityCoin_;
        fraction = gatewayLimits.fraction;
        duration = gatewayLimits.fraction;
        globalAmount = gatewayLimits.fraction;
        globalDuration = gatewayLimits.fraction;
     }

    // It will have a method which will receive an amount of NYC Coin and an address of the destination community.
    // ==== Case ====
    // user: 
    //  approve coins#1 to gateway and call pay
    //  gateway will call fromCommunityCoin->redeem(amount)
    //  gateway will recieve reserveToken
    // then calling toCommunityCoin.stake(to)
    //  to(user#2) will receive coins#2(toCommunityCoin)
    function pay(address to, uint256 amount, address toCommunityCoin, address toStakePool) external nonReentrant {
        _pay(to, amount, toCommunityCoin, toStakePool, address(0));

    }
    
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
    function payUsingPools(address to, uint256 amount, address toCommunityCoin, address toStakePool, address fromRedeemPool) external nonReentrant {
        _pay(to, amount, toCommunityCoin, toStakePool, fromRedeemPool);
    }

    function _pay(address to, uint256 amount, address toCommunityCoin, address toStakePool, address fromRedeemPool) internal {
        bool success = ERC777Upgradeable(fromCommunityCoin).transferFrom(msg.sender, address(this), amount);
        require(success);
        uint256 balanceBefore;
        uint256 balanceAfter;

        balanceBefore = ERC777Upgradeable(fromCommunityCoin).balanceOf(address(this));
        if (fromRedeemPool == address(0)) {
            CommunityCoin(fromCommunityCoin).redeem(amount);
        } else {
            address[] memory preferredInstances = new address[](1);
            preferredInstances[0] = fromRedeemPool;
            CommunityCoin(fromCommunityCoin).redeem(amount, preferredInstances);
        }
        
        balanceAfter = ERC777Upgradeable(fromCommunityCoin).balanceOf(address(this));
        uint256 wasRedeemed = balanceAfter - balanceBefore;
        require(wasRedeemed > 0);

        balanceBefore = ERC777Upgradeable(toCommunityCoin).balanceOf(address(this)); 
        CommunityStakingPool(payable(toStakePool)).stake(wasRedeemed, to);
        balanceAfter = ERC777Upgradeable(toCommunityCoin).balanceOf(address(this));
        uint256 wasReceived = balanceAfter - balanceBefore;
        require(wasReceived > 0);

        emit Pay(msg.sender, wasRedeemed, to, wasReceived);
    }
}