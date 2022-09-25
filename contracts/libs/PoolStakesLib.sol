// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import "../interfaces/ICommunityCoin.sol";
import "../interfaces/ICommunityStakingPoolFactory.sol";
library PoolStakesLib {
    using MinimumsLib for MinimumsLib.UserStruct;

    function getAmountLeft(
        address account,
        uint256 amount,
        uint256 totalSupplyBefore,
        ICommunityCoin.Strategy strategy,
        uint256 totalRedeemable,
        uint256 totalUnstakeable,
        uint256 totalReserves,
        uint256 discountSensitivity,
        mapping(address => ICommunityCoin.UserData) storage users

    ) external view returns(uint256 amountLeft) {
        if (strategy == ICommunityCoin.Strategy.REDEEM || strategy == ICommunityCoin.Strategy.REDEEM_AND_REMOVE_LIQUIDITY) {

            // LPTokens =  WalletTokens * ratio;
            // ratio = A / (A + B * discountSensitivity);
            // где 
            // discountSensitivity - constant set in constructor
            // A = totalRedeemable across all pools
            // B = totalSupply - A - totalUnstakeable
            uint256 A = totalRedeemable;
            uint256 B = totalSupplyBefore - A - totalUnstakeable;
            // uint256 ratio = A / (A + B * discountSensitivity);
            // amountLeft =  amount * ratio; // LPTokens =  WalletTokens * ratio;

            // --- proposal from audit to keep precision after division
            // amountLeft = amount * A / (A + B * discountSensitivity / 100000);
            amountLeft = amountLeft * A * 100000;
            amountLeft = amountLeft / (A + B * discountSensitivity / 100000);
            amountLeft = amountLeft / 100000;

            /////////////////////////////////////////////////////////////////////
            // Formula: #1
            // discount = mainTokens / (mainTokens + bonusTokens);
            // 
            // but what we have: 
            // - mainTokens     - tokens that user obtain after staked 
            // - bonusTokens    - any bonus tokens. 
            //   increase when:
            //   -- stakers was invited via community. so inviter will obtain amount * invitedByFraction
            //   -- calling addToCirculation
            //   decrease when:
            //   -- by applied tariff when redeem or unstake
            // so discount can be more then zero
            // We didn't create int256 bonusTokens variable. instead this we just use totalSupply() == (mainTokens + bonusTokens)
            // and provide uint256 totalReserves as tokens amount  without bonuses.
            // increasing than user stakes and decreasing when redeem
            // smth like this
            // discount = totalReserves / (totalSupply();
            // !!! keep in mind that we have burn tokens before it's operation and totalSupply() can be zero. use totalSupplyBefore instead 

            amountLeft = amountLeft * totalReserves / totalSupplyBefore;

            /////////////////////////////////////////////////////////////////////
        }

        if (strategy == ICommunityCoin.Strategy.UNSTAKE || strategy == ICommunityCoin.Strategy.UNSTAKE_AND_REMOVE_LIQUIDITY) {
            //require(totalSupplyBefore-users[account].tokensBonus._getMinimum() >= amountLeft, "insufficient amount");
            if (
               (totalSupplyBefore - users[account].tokensBonus._getMinimum() < amountLeft) || // insufficient amount
               (users[account].unstakeable < amount)  // check if user can unstake such amount across all instances
            ) {
                revert ICommunityCoin.InsufficientAmount(account, amount);
            }

            // users[account].tokensLocked._minimumsAdd(amount, instanceInfo.duration, LOCKUP_INTERVAL, false);
            // tokensBonus[account]._minimumsAdd(bonusAmount, instanceInfo.duration, LOCKUP_INTERVAL, false);
        }
        
    }
    
    // create map of instance->amount or LP tokens that need to redeem
    function available(
        address account,
        uint256 amount,
        address[] memory preferredInstances,
        ICommunityCoin.Strategy strategy,
        //uint256 totalSupplyBefore,
        ICommunityStakingPoolFactory instanceManagment,
        // uint256 totalRedeemable,
        // uint256 totalUnstakeable,
        // uint256 totalReserves,
        // uint256 discountSensitivity,
        //mapping(address => ICommunityCoin.UserData) storage users,
        mapping(address => ICommunityCoin.InstanceStruct) storage _instances
    ) 
        external 
        view
        returns(
            address[] memory instancesAddress,  // instance's addresses
            uint256[] memory values,            // amounts to redeem in instance
            uint256[] memory amounts,           // itrc amount equivalent(applied num/den)
            uint256 len
        ) 
    {
    
      //  uint256 FRACTION = 100000;


        if (preferredInstances.length == 0) {
            preferredInstances = instanceManagment.instances();
        }

        instancesAddress = new address[](preferredInstances.length);
        values = new uint256[](preferredInstances.length);
        amounts = new uint256[](preferredInstances.length);

        uint256 amountLeft = amount;
        

        len = 0;
        uint256 amountToRedeem;

        // now calculate from which instances we should reduce tokens
        for (uint256 i = 0; i < preferredInstances.length; i++) {

            if (
                (strategy == ICommunityCoin.Strategy.UNSTAKE || strategy == ICommunityCoin.Strategy.UNSTAKE_AND_REMOVE_LIQUIDITY ) &&
                (_instances[preferredInstances[i]].unstakeable[account] > 0)
            ) {
                amountToRedeem = 
                    amountLeft > _instances[preferredInstances[i]].unstakeable[account]
                    ?
                    _instances[preferredInstances[i]].unstakeable[account]
                        // _instances[preferredInstances[i]]._instanceStaked > users[account].unstakeable
                        // ? 
                        // users[account].unstakeable
                        // :
                        // _instances[preferredInstances[i]]._instanceStaked    
                    :
                    amountLeft;

            }  
            if (
                strategy == ICommunityCoin.Strategy.REDEEM || 
                strategy == ICommunityCoin.Strategy.REDEEM_AND_REMOVE_LIQUIDITY 
            ) {
                amountToRedeem = 
                    amountLeft > _instances[preferredInstances[i]]._instanceStaked
                    ? 
                    _instances[preferredInstances[i]]._instanceStaked
                    : 
                    amountLeft
                    ;
            }
                
            if (amountToRedeem > 0) {

                ICommunityStakingPoolFactory.InstanceInfo memory instanceInfo;
                instancesAddress[len] = preferredInstances[i]; 
                instanceInfo =  instanceManagment.getInstanceInfoByPoolAddress(preferredInstances[i]); // todo is exist there?
                amounts[len] = amountToRedeem;
                //backward conversion( СС -> LP)
                values[len] = amountToRedeem * (instanceInfo.denominator) / (instanceInfo.numerator);
                
                len += 1;

                amountLeft -= amountToRedeem;
            }
            

        }
        
        //require(amountLeft == 0, "insufficient amount");
        if(amountLeft > 0) {revert ICommunityCoin.InsufficientAmount(account, amount);}

    }
}