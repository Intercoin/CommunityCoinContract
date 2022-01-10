// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IStakingFactory.sol";
import "./interfaces/IStakingContract.sol";
import "./interfaces/IStakingTransferRules.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./WalletTokensContract.sol";

contract StakingFactory is IStakingFactory, Ownable, WalletTokensContract {
    using Clones for address;
    uint32 internal constant LOCKUP_INTERVAL = 24*60*60; // day in seconds
    uint64 internal constant FRACTION = 100000; // fractions are expressed as portions of this

    address internal implementation;
    address internal implementation2;

    mapping(address => mapping(
        address => mapping(
            uint256 => address
        )
    )) public override getInstance;

    address[] public override instances;

    //      wallet address     instance   ratioBalanceValue
    mapping(address => mapping(address => uint256 )) internal ratioBalances;
    
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
        _stake(account, amount, duration, priceBeforeStake);
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
            amountToRedeem = amount*ratioBalances[msg.sender][preferredInstances[i]]/FRACTION;
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
            amountToRedeem = amount*ratioBalances[msg.sender][preferredInstances[i]]/FRACTION;
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
    
    // redeem logic
    // loop from instances and redeem available tokens.
    // if is it enough  ==> revert
    
    function _stake(
        address account, 
        uint256 amount, 
        uint256 duration, 
        uint256 priceBeforeStake
    ) 
        internal 
        virtual 
        override
    {

        //sync new ratio
        uint256[] memory instanceValues = new uint256[](instances.length);
        uint256 balanceAccount = balanceOf(account);
        for(uint256 i = 0; i < instances.length; i++) {
            instanceValues[i] = balanceAccount*ratioBalances[account][instances[i]]/FRACTION;
        }
        balanceAccount+=amount;
        for(uint256 i = 0; i < instances.length; i++) {
            instanceValues[i] = balanceAccount*ratioBalances[account][instances[i]]/FRACTION;
            ratioBalances[account][instances[i]] = 
                (
                    (instanceValues[i]) + (msg.sender == instances[i] ? amount: 0)
                ) * FRACTION / balanceAccount;
        }

        super._stake(account, amount, duration, priceBeforeStake);
    }
        


}
