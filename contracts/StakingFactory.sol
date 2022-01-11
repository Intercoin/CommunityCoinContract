// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IStakingFactory.sol";
import "./interfaces/IStakingContract.sol";
import "./interfaces/IStakingTransferRules.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./WalletTokensContract.sol";

import "./lib/PackedMapping32.sol";

contract StakingFactory is IStakingFactory, Ownable, WalletTokensContract {
    using Clones for address;
    using PackedMapping32 for PackedMapping32.Map;

    uint32 internal constant LOCKUP_INTERVAL = 24*60*60; // day in seconds
    uint64 internal constant FRACTION = 100000; // fractions are expressed as portions of this

    address internal implementation;
    address internal implementation2;

    mapping(address => mapping(
        address => mapping(
            uint256 => address
        )
    )) public override getInstance;

    mapping (address => PackedMapping32.Map) internal ratioBalances;

    address[] public override instances;
    mapping(address => uint256) private _instanceIndexes;
    mapping(address => address) private _instanceCreators;
    
    
    struct InstanceInfo {
        address reserveToken;
        uint64 duration;
        address tradedToken;
        uint64 reserveTokenClaimFraction;
        uint64 tradedTokenClaimFraction;
        uint64 lpClaimFraction;
        bool exists;
    }
    mapping(address => InstanceInfo) private _instanceInfos;
    
    constructor(
        address impl,
        address impl2
    ) 
        WalletTokensContract("Staking Tokens", "STAKE", LOCKUP_INTERVAL)
    {
        implementation = impl;
        implementation2 = impl2;
    }

    modifier onlyStaking() {
        require(_instanceInfos[msg.sender].exists == true);
        _;
    }

    function instancesCount()
        external 
        override 
        view 
        returns (uint) 
    {
        return instances.length;
    }

    function issueWalletTokens(
        address account, 
        uint256 amount, 
        uint256 duration, 
        uint256 priceBeforeStake
    ) 
        external 
        override
        onlyStaking
    {
        //_issueWalletTokens(msg.sender, account, amount, duration, priceBeforeStake);
        _addToRatioBalance(_instanceIndexes[msg.sender], account, amount);
        _stake(_instanceIndexes[msg.sender], account, amount, duration, priceBeforeStake);
    }
    

    function produce(
        address reserveToken, 
        address tradedToken, 
        uint64 duration
    ) public returns (address instance) {
         // 1% from LP tokens should move to owner while user try to redeem
        return _produce(reserveToken, tradedToken, duration, 0, 0, 1000);
    }
    
    function produce(
        address reserveToken, 
        address tradedToken, 
        uint64 duration, 
        uint64 reserveTokenClaimFraction, 
        uint64 tradedTokenClaimFraction, 
        uint64 lpClaimFraction
    ) public onlyOwner() returns (address instance) {
        return _produce(reserveToken, tradedToken, duration, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction);
    }
    
    function getInstanceInfo(
        address reserveToken, 
        address tradedToken, 
        uint64 duration
    ) public view returns(InstanceInfo memory) {
        address instance = getInstance[reserveToken][tradedToken][duration];
        return _instanceInfos[instance];
    }
    
    function _produce(
        address reserveToken,
        address tradedToken,
        uint64 duration,
        uint64 reserveTokenClaimFraction,
        uint64 tradedTokenClaimFraction,
        uint64 lpClaimFraction
    ) internal returns (address instance) {
        _createInstanceValidate(
            reserveToken, tradedToken, duration, 
            reserveTokenClaimFraction, tradedTokenClaimFraction
        );

        address instanceCreated = _createInstance(reserveToken, tradedToken, duration, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction);    

        require(instanceCreated != address(0), "StakingFactory: INSTANCE_CREATION_FAILED");

        if (duration == 0) {
            IStakingTransferRules(instanceCreated).initialize(
                reserveToken,  tradedToken, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
            );
        } else {
            IStakingContract(instanceCreated).initialize(
                reserveToken,  tradedToken,  LOCKUP_INTERVAL, duration, 
                reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
            );
        }
        
        Ownable(instanceCreated).transferOwnership(_msgSender());
        instance = instanceCreated;        
    }
    
    function _createInstanceValidate(
        address reserveToken, 
        address tradedToken, 
        uint64 duration, 
        uint64 tradedClaimFraction, 
        uint64 reserveClaimFraction
    ) internal view {
        require(reserveToken != tradedToken, "StakingFactory: IDENTICAL_ADDRESSES");
        require(reserveToken != address(0) && tradedToken != address(0), "StakingFactory: ZERO_ADDRESS");
        require(tradedClaimFraction <= FRACTION && reserveClaimFraction <= FRACTION, "StakingFactory: WRONG_CLAIM_FRACTION");
        address instance = getInstance[reserveToken][tradedToken][duration];
        require(instance == address(0), "StakingFactory: PAIR_ALREADY_EXISTS");
    }
        
    function _createInstance(
        address reserveToken, 
        address tradedToken, 
        uint64 duration, 
        uint64 reserveTokenClaimFraction, 
        uint64 tradedTokenClaimFraction, 
        uint64 lpClaimFraction
    ) internal returns (address instance) {
        if (duration == 0) {
            instance = implementation2.clone();
        } else {
            instance = implementation.clone();
        }
        
        
        getInstance[reserveToken][tradedToken][duration] = instance;
        
        _instanceIndexes[instance] = instances.length;
        instances.push(instance);

        _instanceCreators[instance] = msg.sender;
        _instanceInfos[instance] = InstanceInfo(
            reserveToken,
            duration, 
            tradedToken,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction,
            true
        );
        emit InstanceCreated(reserveToken, tradedToken, instance, instances.length);
    }

    /////////////////////////////////////
    /**
    * @notice way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens
    * @param amount The number of shares that will be redeemed.
    */
    function redeem(
        uint256 amount
    ) 
        public 
    {
        _redeem(amount, new address[](0));
    }
    /**
    * @notice way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens
    * @param amount The number of shares that will be redeemed.
    * @param preferredInstances preferred instances for redeem first
    */
    function redeem(
        uint256 amount,
        address[] memory preferredInstances
    ) 
        public 
    {
        _redeem(amount, preferredInstances);
    }

    /**
    * @notice way to redeem and remove liquidity via approve/transferFrom shares. User will obtain reserve and traded tokens back
    * @param amount The number of shares that will be redeemed.
    */
    function redeemAndRemoveLiquidity(
        uint256 amount
    ) 
        public 
    {
        _redeemAndRemoveLiquidity(amount, new address[](0));
    }

    /**
    * @notice way to redeem and remove liquidity via approve/transferFrom shares. User will obtain reserve and traded tokens back
    * @param amount The number of shares that will be redeemed.
    * @param preferredInstances preferred instances for redeem first
    */
    function redeemAndRemoveLiquidity(
        uint256 amount,
        address[] memory preferredInstances
    ) 
        public 
    {
        _redeemAndRemoveLiquidity(amount, preferredInstances);
    }

    function _beforeRedeem(
        address account,
        uint256 amount
    ) 
        internal 
        returns(uint256 totalSharesBalanceBefore)
    {
        totalSharesBalanceBefore = totalSupply();
        require(allowance(account, address(this))  >= amount, "Redeem amount exceeds allowance");
        _burn(account, amount, "", "");
    }

    function _redeem(
        uint256 amount,
        address[] memory preferredInstances
    ) 
        internal 
    {
        uint256 totalSharesBalanceBefore = _beforeRedeem(msg.sender, amount);
        
        if (preferredInstances.length == 0) {
            preferredInstances = instances;
        }

        uint256 amountLeft = amount;
        uint256 amountToRedeem;
        for (uint256 i = 0; i < preferredInstances.length; i++) {
            amountToRedeem = amount*(ratioBalances[msg.sender].get(i))/FRACTION;
            if (amountToRedeem> 0) {
                try IStakingContract(preferredInstances[i]).redeem(
                    msg.sender, 
                    amountToRedeem,
                    totalSharesBalanceBefore
                ) {
                    
                }
                catch {
                    revert("Error when redeem in an instance");
                }
            }

            amountLeft -= amountToRedeem;
        }
        
        require(amountLeft == 0, "insufficient amount to redeem");

    }

    function _redeemAndRemoveLiquidity(
        uint256 amount,
        address[] memory preferredInstances
    ) 
        internal 
    {
        uint256 totalSharesBalanceBefore = _beforeRedeem(msg.sender, amount);
        if (preferredInstances.length == 0) {
            preferredInstances = instances;
        }

        uint256 amountLeft = amount;
        uint256 amountToRedeem;
        for (uint256 i = 0; i < preferredInstances.length; i++) {
            amountToRedeem = amount*ratioBalances[msg.sender].get(i)/FRACTION;
            if (amountToRedeem> 0) {
                try IStakingContract(preferredInstances[i]).redeemAndRemoveLiquidity(
                    msg.sender, 
                    amountToRedeem,
                    totalSharesBalanceBefore
                ) {
                    
                }
                catch {
                    revert("Error when redeem in an instance");
                }
            }

            amountLeft -= amountToRedeem;
        }
        
        require(amountLeft == 0, "insufficient amount to redeem");
    }

        


    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256 amount
    ) 
        internal 
        virtual 
        override 
    {
        if (from !=address(0)) { // otherwise minted

            // main goals are
            // - prevent transfer amount if locked more then available FOR REDEEM only (then to == address(this))
            // - transfer minimums applicable only for minimums. (in transfer first of all consume free `token`, then if enough using `locked`)
            // - also prevent burn locked token
            // so example
            //  total=100; locked=40;(for 1 year) amount2send=70
            //  if it's redeem - revert
            //  if usual transfer from user1 to user2 - we will tranfer 70 and 10 will lockup
            //  so tokens balance 
            //          was                         will be
            //  user1(total=100;locked=40)      user1(total=30;locked=30)
            //  user2(total=0;locked=0)         user2(total=70;locked=10)


            // // upd
            // while transfer we transfer by equal part FROM each user pool and by 50% from locked/unlocked IN each pool
            // for example
            // user1 have 200WT(WalletTokens) in 2 pools
            // 40%(pool#1) 50 locked and 30 unlocked   = total 80
            // 60%(pool#2) 20 locked and 100 unlocked  = total 120
            // user2 have 50WT(WalletTokens) in 1 pool
            // 100%(pool#3) 50 locked and 0 unlocked    = total 50
            ////
            // user1 try to send 100WT to user2
            // user2 will obtain 100wt in equvalent (100%/User1PoolsCount) from each user1 pools. 
            // here it will be 50%(from pool1)/50%(from pool2), so 40WT from pool1 and 60WT from pool2
            // then works minimumTransfer as usuall(trying to send unlocked first and then left) (in each pool, not in total!!!)
            // so 
            //  40WT from pool1 - it's 25 unlocked and 15 locked
            //  60WT from pool2 - it's 50 unlocked and 10 locked
            //// Finally 
            // user1 will have 100WT(WalletTokens) in 2 pools
            // 40%(pool#1) 40 locked and 0 unlocked     = total 40
            // 60%(pool#2) 20 locked and 40 unlocked    = total 60
            // user2 will have 150WT(WalletTokens) in 3 pools
            // 26.6(6)%(pool#1) 15 locked and 25 unlocked    = total 40
            // 40%(pool#2) 10 locked and 50 unlocked     = total 60
            // 33.3(3)%(pool#3) 50 locked and 0 unlocked    = total 50

            uint256 balance = balanceOf(from);
//_getMinimumByPool

            if (balance >= amount) {
                uint256[] memory minimumsBefore = _getMinimumByPools(from, instances.length);
                
                uint256 locked;// = _getMinimum(from);

                for (uint256 i = 0; i< instances.length; i++) {
                    locked += minimumsBefore[i];
                }

                uint256 remainingAmount = balance - amount;


                if (
                    to == address(0) || // if burnt
                    to == address(this) // if send directly to contract
                ) {
                    //it's try to redeem
                    if (locked > remainingAmount) {
                        revert("STAKE_NOT_UNLOCKED_YET");
                    //} else {
                        
                    }
                    // SYNCFREE balance ratio
                    // TODO 0: loop through free tokens only and recalculate ratioBalances

                } else if (locked > remainingAmount) {
                    uint256 lockedAmountToTransfer = (locked - remainingAmount);
                    minimumsTransfer(from, to, lockedAmountToTransfer);
                    // SYNC FREE and locked
                    // TODO 0: loop through locked tokens that left
                    // here we will remove all free tokens from all pools. and reduce locked from beginner
                    // and recalculate ratioBalances
                }
            
                // if (locked > remainingAmount) {
                //     uint256 lockedAmountToTransfer = (locked - remainingAmount);
                //     if (
                //         (/*from == address(this) && */to == address(0)) || // burnt
                //         to == address(this) // if send directly to contract
                //     )  {
                //         revert("STAKE_NOT_UNLOCKED_YET");
                //     }
                    
                    
                //     minimumsTransfer(from, to, lockedAmountToTransfer);

                //     uint256[] memory minimumsAfter = _getMinimumByPools(from, instances.length);


                // }
            } else {
                // insufficient balance error would be in {ERC777::_move}
            }
        }
        super._beforeTokenTransfer(operator, from, to, amount);
    }
    
    function _addToRatioBalance(
        uint256 poolIndex,
        address account,
        uint256 amount
    )
        internal 
    {
        // sync new ratio
        uint256[] memory instanceValues = new uint256[](instances.length);
        uint256 balanceAccount = balanceOf(account);
        for(uint256 i = 0; i < instances.length; i++) {
            instanceValues[i] = balanceAccount * ratioBalances[account].get(i) / FRACTION;
        }
        balanceAccount += amount;

        for(uint256 i = 0; i < instances.length; i++) {
            instanceValues[i] = balanceAccount * ratioBalances[account].get(i) / FRACTION;
            ratioBalances[account].set(
                i,
                uint32(
                    (
                        (i == poolIndex) ? instanceValues[i]+amount : instanceValues[i]
                    )
                     * FRACTION / balanceAccount
                )
            );
        }
    }

    totalBefore
    totalAfter
    pool[i] = x%  
    function _syncRatioBalance(
        uint256 poolIndex,
        address account,
        uint256 amount
    )
        internal 
    {
        }



}
