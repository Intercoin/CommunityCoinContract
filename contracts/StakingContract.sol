// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IHook.sol";
import "./interfaces/IStakingContract.sol";
import "./interfaces/IStakingPool.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

//import "./lib/PackedMapping32.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
//import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "./minimums/upgradeable/MinimumsBaseUpgradeable.sol";


//import "hardhat/console.sol";

contract StakingContract is IStakingContract, OwnableUpgradeable,  AccessControlEnumerableUpgradeable, ERC777Upgradeable, MinimumsBaseUpgradeable, IERC777RecipientUpgradeable {
    using ClonesUpgradeable for address;
    // using PackedMapping32 for PackedMapping32.Map;
    //using EnumerableSet for EnumerableSet.AddressSet;

    /**
    * strategy ENUM VARS used in calculation algos
    */
    enum Strategy{ UNSTAKE, REDEEM, REDEEM_AND_REMOVE_LIQUIDITY } 
    
    uint32 internal constant LOCKUP_INTERVAL = 24*60*60; // day in seconds
    uint64 internal constant FRACTION = 100000; // fractions are expressed as portions of this

    bytes32 public constant ADMIN_ROLE = "admin";
    bytes32 public constant REDEEM_ROLE = "redeem";

    address public implementation;

    IHook public hook; // hook used to bonus calculation

    uint256 public discountSensitivity;

    uint256 totalUnstakeable;
    uint256 totalRedeemable;
    //uint256 totalExtra;         // extra tokens minted by factory when staked

    mapping(address => mapping(
        address => mapping(
            uint256 => address
        )
    )) public override getInstance;

    address[] public override instances;
    mapping(address => uint256) private _instanceIndexes;
    mapping(address => address) private _instanceCreators;

    // staked balance in instances. increase when stakes, descrease when unstake/redeem
    mapping(address => uint256) private _instanceStaked;
    
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

    //bytes32 private constant TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    //EnumerableSet.AddressSet private rewardTokensList;
    //mapping(address => uint256) public rewardTokenRatios;
    mapping(address => uint256) internal unstakeable;


    event RewardGranted(address indexed token, address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 amount, uint256 priceBeforeStake);
    event Redeemed(address indexed account, uint256 amount);

    modifier onlyStakingPool() {
        require(_instanceInfos[msg.sender].exists == true);
        _;
    }

    modifier onlyRoleWithAccount(bytes32 role, address account) {
        _checkRole(role, account);
        _;
    }

    /**
    * @param impl address of StakingPool implementation
    * @param hook_ address of contract implemented IHook interface and used to calculation bonus tokens amount
    * @param discountSensitivity_ discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default)
    * @custom:calledby StakingFactory contract 
    * @custom:shortd initializing contract. called by StakingFactory contract
    */
    function initialize(
        address impl,
        address hook_,
        uint256 discountSensitivity_
    ) 
        initializer 
        external 
        override 
    {
        __Ownable_init();
        __ERC777_init("Staking Tokens", "STAKE", (new address[](0)));
        __MinimumsBaseUpgradeable_init(LOCKUP_INTERVAL);
        __AccessControlEnumerable_init();

        implementation = impl;

        hook = IHook(hook_);

        discountSensitivity = discountSensitivity_;
        
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(REDEEM_ROLE, ADMIN_ROLE);
        // register interfaces
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    function transferOwnership(address newOwner) public virtual override onlyOwner {
        super.transferOwnership(newOwner);
        _revokeRole(ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, newOwner);
    }


    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev view amount of created instances
    * @return amount amount instances
    * @custom:shortd view amount of created instances
    */
    function instancesCount()
        external 
        override 
        view 
        returns (uint256 amount) 
    {
        amount = instances.length;
    }

    /**
    * @notice method to distribute tokens after user stake. called externally onle by pool contract
    * @param account address of user that tokens will mint for
    * @param amount token's amount
    * @param priceBeforeStake price that was before adding liquidity in pool
    * @custom:calledby staking-pool
    * @custom:shortd distibute wallet tokens
    */
    function issueWalletTokens(
        address account, 
        uint256 amount, 
        uint256 priceBeforeStake
    ) 
        external 
        override
        onlyStakingPool
    {
        //_issueWalletTokens(msg.sender, account, amount, duration, priceBeforeStake);
        //_addToRatioBalance(_instanceIndexes[msg.sender], account, amount);

        address instance = msg.sender;
        _instanceStaked[instance] += amount;

        // logic "how much bonus user will obtain"
        uint256 bonusAmount = 0; 
        if (address(hook) != address(0)) {
            bonusAmount = hook.bonusCalculation(instance, account, _instanceInfos[instance].duration, amount);
        }
        
        //totalExtra += bonusAmount;
        
        unstakeable[account] += amount;
        totalUnstakeable += amount;
        
        // means extra tokens should not to include into unstakeable and totalUnstakeable, but part of them will be increase totalRedeemable
        // also keep in mind that user can unstake only unstakeable[account] which saved w/o bonusTokens, but minimums and mint with it.
        // it's provide to use such tokens like transfer but prevent unstake bonus in 1to1 after minimums expiring
        amount += bonusAmount;

        _mint(account, amount, "", "");
        emit Staked(account, amount, priceBeforeStake);
        _minimumsAdd(account, amount, _instanceInfos[instance].duration, false);

    }

    /**
    * @notice used to catch when used try to redeem by sending wallet tokens directly to contract
    * see more in {IERC777RecipientUpgradeable::tokensReceived}
    * @param operator address operator requesting the transfer
    * @param from address token holder address
    * @param to address recipient address
    * @param amount uint256 amount of tokens to transfer
    * @param userData bytes extra information provided by the token holder (if any)
    * @param operatorData bytes extra information provided by the operator (if any)
    * @custom:shortd part of {IERC777RecipientUpgradeable}
    */
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) 
        external 
        override
    {

        require((_msgSender() == address(this) && to == address(this)), "can't receive any other tokens except own");
        
        // here we will already receive token to address(this)
        uint256 totalSupplyBefore = totalSupply();
        // so burn it
        _burn(address(this), amount, "", "");
        // then redeem
        _redeem(from, amount, new address[](0), totalSupplyBefore);
        
    }


    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev function has overloaded. it's simple version for create instance pool.
    * @param reserveToken address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken address of traded token. usual it intercoin investor token
    * @param duration duration represented in amount of `LOCKUP_INTERVAL`
    * @return instance address of created instance pool `StakingContract`
    * @custom:shortd creation instance with simple options
    */
    function produce(
        address reserveToken, 
        address tradedToken, 
        uint64 duration
    ) public returns (address instance) {
         // 1% from LP tokens should move to owner while user try to redeem
        return _produce(reserveToken, tradedToken, duration, 0, 0, 1000);
    }
    
    /**
    * @dev function has overloaded. it's simple version for create instance pool.
    * @param reserveToken address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken address of traded token. usual it intercoin investor token
    * @param duration duration represented in amount of `LOCKUP_INTERVAL`
    * @param reserveTokenClaimFraction fraction of reserved token multiplied by {StakingContract::FRACTION}. See more in {StakingContract::initialize}
    * @param tradedTokenClaimFraction fraction of traded token multiplied by {StakingContract::FRACTION}. See more in {StakingContract::initialize}
    * @param lpClaimFraction fraction of LP token multiplied by {StakingContract::FRACTION}. See more in {StakingContract::initialize}
    * @return instance address of created instance pool `StakingContract`
    * @custom:calledby owner
    * @custom:shortd creation instance with extended options
    */
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
    
    /**
    * @dev note that `duration` is 365 and `LOCKUP_INTERVAL` is 86400 (seconds) means that tokens locked up for an year
    * @notice view instance info by reserved/traded tokens and duration
    * @param reserveToken address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken address of traded token. usual it intercoin investor token
    * @param duration duration represented in amount of `LOCKUP_INTERVAL`
    * @custom:shortd view instance info
    */
    function getInstanceInfo(
        address reserveToken, 
        address tradedToken, 
        uint64 duration
    ) 
        public 
        view 
        returns(InstanceInfo memory) 
    {
        address instance = getInstance[reserveToken][tradedToken][duration];
        return _instanceInfos[instance];
    }

    /**
    * @notice method like redeem but can applicable only for own staked tokens that haven't transfer yet. so no need to have redeem role for this
    * @param amount The number of wallet tokens that will be unstaked.
    * @custom:shortd unstake own tokens
    */
    function unstake(
        uint256 amount
    ) 
        public 
    {
        address account = msg.sender;

        uint256 balance = balanceOf(account);
        
        require (amount <= balance, "INSUFFICIENT_BALANCE");
        
        uint256 locked = _getMinimum(account);
        uint256 remainingAmount = balance - amount;
        require(locked <= remainingAmount, "STAKE_NOT_UNLOCKED_YET");

        uint256 totalSupplyBefore = totalSupply();
        require(allowance(account, address(this))  >= amount, "Amount exceeds allowance");
        _burn(account, amount, "", "");

        _unstake(account, amount, totalSupplyBefore);
        
    }

    /**
    * @dev function has overloaded. wallet tokens will be redeemed from pools in order from deployed
    * @notice way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens
    * @param amount The number of wallet tokens that will be redeemed.
    * @custom:shortd redeem tokens
    */
    function redeem(
        uint256 amount
    ) 
        public
    {
        address account = msg.sender;
        uint256 totalSupplyBefore = totalSupply();
        require(allowance(account, address(this))  >= amount, "Amount exceeds allowance");
        _burn(account, amount, "", "");

        _redeem(account, amount, new address[](0), totalSupplyBefore);
    }

    /**
    * @dev function has overloaded. wallet tokens will be redeemed from pools in order from `preferredInstances`. tx reverted if amoutn is unsufficient even if it is enough in other pools
    * @notice way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens
    * @param amount The number of wallet tokens that will be redeemed.
    * @param preferredInstances preferred instances for redeem first
    * @custom:shortd redeem tokens with preferredInstances
    */
    function redeem(
        uint256 amount,
        address[] memory preferredInstances
    ) 
        public
    {
        address account = msg.sender;
        uint256 totalSupplyBefore = totalSupply();
        require(allowance(account, address(this))  >= amount, "Amount exceeds allowance");
        _burn(account, amount, "", "");

        _redeem(account, amount, preferredInstances, totalSupplyBefore);
    }

    /**
    * @dev function has overloaded. wallet tokens will be redeemed from pools in order from deployed
    * @notice way to redeem and remove liquidity via approve/transferFrom wallet tokens. User will obtain reserve and traded tokens back
    * @param amount The number of wallet tokens that will be redeemed.
    * @custom:shortd redeem tokens and remove liquidity
    */
    function redeemAndRemoveLiquidity(
        uint256 amount
    ) 
        public
    {
        address account = msg.sender;
        uint256 totalSupplyBefore = totalSupply();
        require(allowance(account, address(this))  >= amount, "Amount exceeds allowance");
        _burn(account, amount, "", "");

        _redeemAndRemoveLiquidity(msg.sender, amount, new address[](0), totalSupplyBefore);
    }

    /**
    * @dev function has overloaded. wallet tokens will be redeemed from pools in order from `preferredInstances`. tx reverted if amoutn is unsufficient even if it is enough in other pools
    * @notice way to redeem and remove liquidity via approve/transferFrom wallet tokens. User will obtain reserve and traded tokens back
    * @param amount The number of wallet tokens that will be redeemed.
    * @param preferredInstances preferred instances for redeem first
    * @custom:shortd redeem tokens and remove liquidity with preferredInstances
    */
    function redeemAndRemoveLiquidity(
        uint256 amount,
        address[] memory preferredInstances
    ) 
        public
    {
        address account = msg.sender;
        uint256 totalSupplyBefore = totalSupply();
        require(allowance(account, address(this))  >= amount, "Amount exceeds allowance");
        _burn(account, amount, "", "");

        _redeemAndRemoveLiquidity(msg.sender, amount, preferredInstances, totalSupplyBefore);
    }

    /**
    * @notice way to view locked tokens that still can be unstakeable by user
    * @param account address
    * @custom:shortd view locked tokens
    */
    function viewLockedWalletTokens(
        address account
    ) 
        public 
        view 
        returns (uint256 amount) 
    {
        amount = _getMinimum(account);
    }   

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    
    
    function _unstake(
        address account,
        uint256 amount,
        uint256 totalSupplyBefore
    ) 
        internal 
    {
        (address[] memory instancesList, uint256[] memory values, uint256 len) = _poolStakesAvailable(account, amount, new address[](0), Strategy.UNSTAKE, totalSupplyBefore);
        for (uint256 i = 0; i < len; i++) {
            try IStakingPool(instancesList[i]).redeemAndRemoveLiquidity(
                account, 
                values[i]
            ) {
                _instanceStaked[instancesList[i]] -= values[i];
            }
            catch {
                revert("Error when unstake");
            }
        }
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

        require(instanceCreated != address(0), "StakingContract: INSTANCE_CREATION_FAILED");
        require(duration != 0, "cant be zero duration");
        // if (duration == 0) {
        //     IStakingTransferRules(instanceCreated).initialize(
        //         reserveToken,  tradedToken, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
        //     );
        // } else {
            IStakingPool(instanceCreated).initialize(
                reserveToken,  tradedToken, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
            );
        // }
        
        //Ownable(instanceCreated).transferOwnership(_msgSender());
        instance = instanceCreated;        
    }
    
    function _createInstanceValidate(
        address reserveToken, 
        address tradedToken, 
        uint64 duration, 
        uint64 tradedClaimFraction, 
        uint64 reserveClaimFraction
    ) internal view {
        require(reserveToken != tradedToken, "StakingContract: IDENTICAL_ADDRESSES");
        require(reserveToken != address(0) && tradedToken != address(0), "StakingContract: ZERO_ADDRESS");
        require(tradedClaimFraction <= FRACTION && reserveClaimFraction <= FRACTION, "StakingContract: WRONG_CLAIM_FRACTION");
        address instance = getInstance[reserveToken][tradedToken][duration];
        require(instance == address(0), "StakingContract: PAIR_ALREADY_EXISTS");
    }
        
    function _createInstance(
        address reserveToken, 
        address tradedToken, 
        uint64 duration, 
        uint64 reserveTokenClaimFraction, 
        uint64 tradedTokenClaimFraction, 
        uint64 lpClaimFraction
    ) internal returns (address instance) {

        instance = implementation.clone();
        
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

    // create map of instance->amount or LP tokens that need to redeem
    function _poolStakesAvailable(
        address account,
        uint256 amount,
        address[] memory preferredInstances,
        Strategy strategy,
        uint256 totalSupplyBefore
    ) 
        internal 
        returns(
            address[] memory instancesAddress, 
            uint256[] memory values,
            uint256 len
        ) 
    {

       

        if (preferredInstances.length == 0) {
            preferredInstances = instances;
        }
// console.log("preferredInstances.length=", preferredInstances.length);
        instancesAddress = new address[](preferredInstances.length);
        values = new uint256[](preferredInstances.length);
        len = 0;
        uint256 amountLeft = amount;
        uint256 amountToRedeem;
        

        if (
            strategy == Strategy.REDEEM || 
            strategy == Strategy.REDEEM_AND_REMOVE_LIQUIDITY 
        ) {
            
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
            amountLeft = amount * A / (A + B * discountSensitivity / FRACTION);
        } else {
            amountLeft = amount;
        }

        for (uint256 i = 0; i < preferredInstances.length; i++) {
            
            if (_instanceStaked[preferredInstances[i]] > 0) {
                if (strategy == Strategy.UNSTAKE) {
                    amountToRedeem = 
                        amountLeft > _instanceStaked[preferredInstances[i]]
                        ? 
                            _instanceStaked[preferredInstances[i]] > unstakeable[account]
                            ? 
                            unstakeable[account]
                            :
                            _instanceStaked[preferredInstances[i]]
                        : 
                        amountLeft;
                
                } else if (
                    strategy == Strategy.REDEEM || 
                    strategy == Strategy.REDEEM_AND_REMOVE_LIQUIDITY 
                ) {
                    amountToRedeem = 
                        amountLeft > _instanceStaked[preferredInstances[i]] 
                        ? 
                        _instanceStaked[preferredInstances[i]] 
                        : 
                        amountLeft
                        ;
                }
                
                if (amountToRedeem > 0) {
                    instancesAddress[len] = preferredInstances[i]; 
                    values[len] = amountToRedeem;
                    len += 1;

                    amountLeft -= amountToRedeem;
                }
            }

            
        }
        
        require(amountLeft == 0, "insufficient amount");

    }

    function _redeem(
        address account,
        uint256 amount,
        address[] memory preferredInstances,
        uint256 totalSupplyBefore
    ) 
        internal 
        onlyRoleWithAccount(REDEEM_ROLE, account)
    {
        require (amount <= totalRedeemable, "INSUFFICIENT_BALANCE");
        
        (address[] memory instancesToRedeem, uint256[] memory valuesToRedeem, uint256 len) = _poolStakesAvailable(account, amount, preferredInstances, Strategy.REDEEM, totalSupplyBefore);
        for (uint256 i = 0; i < len; i++) {
            if (_instanceStaked[instancesToRedeem[i]] > 0) {
                try IStakingPool(instancesToRedeem[i]).redeem(
                    account, 
                    valuesToRedeem[i]
                ) {
                    _instanceStaked[instancesToRedeem[i]] -= valuesToRedeem[i];
                    totalRedeemable -= valuesToRedeem[i];
                }
                catch {
                    revert("Error when redeem in an instance");
                }
            }
        }
    }

    function _redeemAndRemoveLiquidity(
        address account,
        uint256 amount,
        address[] memory preferredInstances,
        uint256 totalSupplyBefore
    ) 
        internal 
        onlyRoleWithAccount(REDEEM_ROLE, account)  
    {
        
        require (amount <= totalRedeemable, "INSUFFICIENT_BALANCE");

// console.log("!preferredInstances=",preferredInstances.length);
        (address[] memory instancesToRedeem, uint256[] memory valuesToRedeem, uint256 len) = _poolStakesAvailable(account, amount, preferredInstances, Strategy.REDEEM_AND_REMOVE_LIQUIDITY, totalSupplyBefore);
// console.log("instancesToRedeem=",instancesToRedeem.length);
// console.log("instancesToRedeem[0]=",instancesToRedeem[0]);
// console.log("instancesToRedeem[1]=",instancesToRedeem[1]);
// console.log("valuesToRedeem[0]=",valuesToRedeem[0]);
// console.log("valuesToRedeem[1]=",valuesToRedeem[1]);
// console.log("len=",len);


        for (uint256 i = 0; i < len; i++) {
// console.log("i=",i);
// console.log("instancesToRedeem[i]=",instancesToRedeem[i]);
// console.log("valuesToRedeem[i]=",valuesToRedeem[i]);
            if (_instanceStaked[instancesToRedeem[i]] > 0) {
                try IStakingPool(instancesToRedeem[i]).redeemAndRemoveLiquidity(
                    account, 
                    valuesToRedeem[i]
                ) {
                    _instanceStaked[instancesToRedeem[i]] -= valuesToRedeem[i];
                    totalRedeemable -= valuesToRedeem[i];
                }
                catch {
                    revert("Error when redeem");
                }
            }
        }
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
            if (from == address(this) && to == address(0)) { // burnt by contract itself

            } else { 
                // todo 0:   add transferhook
                //  can return true/false
                // true = revert ;  false -pass tx 
                
                if (address(hook) != address(0)) {
                    require(hook.transferHook(operator, from, to, amount), "HOOK: TRANSFER_PREVENT");
                }

                uint256 balance = balanceOf(from);

                if (balance >= amount) {
                    
                    // uint256 remainingAmount = balance - amount;

                    // if (
                    //     to == address(0) || // if burnt
                    //     to == address(this) // if send directly to contract
                    // ) {
                    //     //it's try to redeem
                    //     // if (locked > remainingAmount) {
                    //     //     revert("STAKE_NOT_UNLOCKED_YET");
                    //     // //} else {
                            
                    //     // }

                        
            
                    // } else if (locked > remainingAmount) {
                    //     // else it's just transfer
                    //     uint256 lockedAmountToTransfer = (locked - remainingAmount);
                    //     minimumsTransfer(from, to, lockedAmountToTransfer);
                    //     //?????

                    // }

                    uint256 remainingAmount = balance - amount;
                    
                    if (
                        to == address(0) || // if burnt
                        to == address(this) // if send directly to contract
                    ) {
                        //require(amount <= totalRedeemable, "STAKE_NOT_UNLOCKED_YET");
                    } else {
                        // else it's just transfer
                        // unstakeable[from] means as locked var. but not equal: locked can be less than unstakeable[from]
                        
                        
                        uint256 locked = _getMinimum(from);
                        //else drop locked minimum, but remove minimums even if remaining was enough
                        //minimumsTransfer(account, ZERO_ADDRESS, (locked - remainingAmount))
                        if (locked > 0 && locked >= amount ) {
                            minimumsTransfer(from, ZERO_ADDRESS, amount);
                        }

                        uint256 r = unstakeable[from] - remainingAmount;
                        unstakeable[from] -= r;
                        totalUnstakeable -= r;
                        totalRedeemable += r;
    
                    }
                    
                } else {
                    // insufficient balance error would be in {ERC777::_move}
                }
            }
        }
        super._beforeTokenTransfer(operator, from, to, amount);

    }


}
