// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

import "./interfaces/IHook.sol";
import "./interfaces/ICommunityCoin.sol";
import "./interfaces/ICommunityStakingPool.sol";
//import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./access/TrustedForwarder.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
//import "./lib/PackedMapping32.sol";

//import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./interfaces/IERC20Dpl.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "./minimums/upgradeable/MinimumsBaseUpgradeable.sol";

import "./interfaces/ICommunityStakingPoolFactory.sol";
//import "hardhat/console.sol";

contract CommunityCoin is 
    //OwnableUpgradeable, 
    TrustedForwarder,
    ICommunityCoin, 
    AccessControlEnumerableUpgradeable, 
    ERC777Upgradeable, 
    MinimumsBaseUpgradeable, 
    IERC777RecipientUpgradeable, 
    ReentrancyGuardUpgradeable
{
    

    /**
    * strategy ENUM VARS used in calculation algos
    */
    enum Strategy{ UNSTAKE, REDEEM, REDEEM_AND_REMOVE_LIQUIDITY } 
    
    uint32 internal constant LOCKUP_INTERVAL = 24*60*60; // day in seconds
    uint64 internal constant FRACTION = 100000; // fractions are expressed as portions of this

    bytes32 internal constant ADMIN_ROLE = "admin";
    bytes32 internal constant REDEEM_ROLE = "redeem";
    bytes32 internal constant CIRCULATION_ROLE = "circulate";

    //uint64 public constant CIRCULATION_DURATION = 365*24*60*60; //year by default. will be used if circulation added to minimums

    IHook public hook; // hook used to bonus calculation

    ICommunityStakingPoolFactory public instanceManagment; // ICommunityStakingPoolFactory

    uint256 public discountSensitivity;

    uint256 totalUnstakeable;
    uint256 totalRedeemable;
    //uint256 totalExtra;         // extra tokens minted by factory when staked

    

    // staked balance in instances. increase when stakes, descrease when unstake/redeem
    mapping(address => uint256) private _instanceStaked;

    //bytes32 private constant TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    //EnumerableSet.AddressSet private rewardTokensList;
    //mapping(address => uint256) public rewardTokenRatios;
    mapping(address => uint256) internal unstakeable;

    event RewardGranted(address indexed token, address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 amount, uint256 priceBeforeStake);
    event Redeemed(address indexed account, uint256 amount);

    // modifier onlyStakingPool() {
    //     // here need to know that is definetely StakingPool. because with EIP-2771 forwarder can call methods as StakingPool. 
    //     require(ICommunityStakingPoolFactory(instanceManagment)._instanceInfos[msg.sender].exists == true);
    //     _;
    // }

    modifier onlyRoleWithAccount(bytes32 role, address account) {
        _checkRole(role, account);
        _;
    }


    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @param impl address of StakingPool implementation
    * @param hook_ address of contract implemented IHook interface and used to calculation bonus tokens amount
    * @param communityCoinInstanceAddr address of contract that managed and cloned pools
    * @param discountSensitivity_ discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default)
    * @custom:calledby StakingFactory contract 
    * @custom:shortd initializing contract. called by StakingFactory contract
    */
    function initialize(
        address impl,
        address hook_,
        address communityCoinInstanceAddr,
        uint256 discountSensitivity_
    ) 
        initializer 
        external 
        override 
    {
        //__Ownable_init();
        __TrustedForwarder_init();
        __ERC777_init("Staking Tokens", "STAKE", (new address[](0)));
        __MinimumsBaseUpgradeable_init(LOCKUP_INTERVAL);
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();

        instanceManagment = ICommunityStakingPoolFactory(communityCoinInstanceAddr);//new ICommunityStakingPoolFactory(impl);
        instanceManagment.initialize(impl);

        hook = IHook(hook_);

        discountSensitivity = discountSensitivity_;
        
        _grantRole(ADMIN_ROLE, _msgSender());
        _setRoleAdmin(REDEEM_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CIRCULATION_ROLE, ADMIN_ROLE);
        // register interfaces
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    /**
    * @notice method to distribute tokens after user stake. called externally only by pool contract
    * @param account address of user that tokens will mint for
    * @param amount token's amount
    * @param priceBeforeStake price that was before adding liquidity in pool
    * @custom:calledby staking-pool
    * @custom:shortd distribute wallet tokens
    */
    function issueWalletTokens(
        address account, 
        uint256 amount, 
        uint256 priceBeforeStake
    ) 
        external 
        override
        //onlyStakingPool
    {

        address instance = msg.sender; //here need a msg.sender as a real sender.

        // here need to know that is definetely StakingPool. because with EIP-2771 forwarder can call methods as StakingPool. 
        ICommunityStakingPoolFactory.InstanceInfo memory instanceInfo = instanceManagment.getInstanceInfoByPoolAddress(instance);
  
        require(instanceInfo.exists == true);
     
        
        _instanceStaked[instance] += amount;

        // logic "how much bonus user will obtain"
        uint256 bonusAmount = 0; 
        if (address(hook) != address(0)) {
            bonusAmount = hook.bonusCalculation(instance, account, instanceInfo.duration, amount);
        }
        
        //totalExtra += bonusAmount;
        
        unstakeable[account] += amount;
        totalUnstakeable += amount;
        
        // means extra tokens should not to include into unstakeable and totalUnstakeable, but part of them will be increase totalRedeemable
        // also keep in mind that user can unstake only unstakeable[account] which saved w/o bonusTokens, but minimums and mint with it.
        // it's provide to use such tokens like transfer but prevent unstake bonus in 1to1 after minimums expiring
        amount += bonusAmount;

        //forward conversion( LP -> СС)
        amount = amount * (10**instanceInfo.numerator) / (10**instanceInfo.denominator);

        _mint(account, amount, "", "");
        emit Staked(account, amount, priceBeforeStake);
        _minimumsAdd(account, amount, instanceInfo.duration, false);

    }
    
    /**
    * @notice method to adding tokens to circulation. called externally only by `CIRCULATION_ROLE`
    * @param amount token's amount
    * @custom:calledby `CIRCULATION_ROLE`
    * @custom:shortd distribute tokens
    */
    function addToCirculation(
        uint256 amount
    ) 
        external 
        nonReentrant
        onlyRole(CIRCULATION_ROLE)
    {
        address account = _msgSender();

        _mint(account, amount, "", "");
        //_minimumsAdd(account, amount, CIRCULATION_DEFAULT, false);
    }

    /**
    * @notice method to removing tokens from circulation. called externally only by `CIRCULATION_ROLE`
    * @param amount token's amount
    * @custom:calledby `CIRCULATION_ROLE`
    * @custom:shortd remove tokens
    */
    function removeFromCirculation(
        uint256 amount
    ) 
        external 
        nonReentrant
        onlyRole(CIRCULATION_ROLE)
    {
        address account = _msgSender();

        _burn(account, amount, "", "");
        //or
        //__redeem(account, account, amount, new address[](0), totalSupplyBefore, Strategy.REDEEM);
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

        require((_msgSender() == address(this) && to == address(this)), "own tokens permitted only");
        
        _checkRole(REDEEM_ROLE, from);
        __redeem(address(this), from, amount, new address[](0), Strategy.REDEEM);
        
    }


    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev function has overloaded. it's simple version for create instance pool.
    * @param reserveToken address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken address of traded token. usual it intercoin investor token
    * @param duration duration represented in amount of `LOCKUP_INTERVAL`
    * @return instance address of created instance pool `CommunityStakingPool`
    * @custom:shortd creation instance with simple options
    */
    function produce(
        address reserveToken, 
        address tradedToken, 
        uint64 duration
    ) 
        public 
        returns (address instance) 
    {
        // 1% from LP tokens should move to owner while user try to redeem
        uint64 numerator = uint64(10**(IERC20Dpl(reserveToken).decimals()));
        uint64 denominator = uint64(10**(IERC20Dpl(tradedToken).decimals()));
        instance = instanceManagment.produce(
            reserveToken, 
            tradedToken, 
            duration, 
            0, 
            0, 
            1000,
            numerator,
            denominator
        );
        emit InstanceCreated(reserveToken, tradedToken, instance);
    }
    
    /**
    * @dev function has overloaded. it's simple version for create instance pool.
    * @param reserveToken address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken address of traded token. usual it intercoin investor token
    * @param duration duration represented in amount of `LOCKUP_INTERVAL`
    * @param reserveTokenClaimFraction fraction of reserved token multiplied by {CommunityStakingPool::FRACTION}. See more in {CommunityStakingPool::initialize}
    * @param tradedTokenClaimFraction fraction of traded token multiplied by {CommunityStakingPool::FRACTION}. See more in {CommunityStakingPool::initialize}
    * @param lpClaimFraction fraction of LP token multiplied by {CommunityStakingPool::FRACTION}. See more in {CommunityStakingPool::initialize}
    * @param numerator used in conversion LP/CC
    * @param denominator used in conversion LP/CC
    * @return instance address of created instance pool `CommunityStakingPool`
    * @custom:calledby owner
    * @custom:shortd creation instance with extended options
    */
    function produce(
        address reserveToken, 
        address tradedToken, 
        uint64 duration, 
        uint64 reserveTokenClaimFraction, 
        uint64 tradedTokenClaimFraction, 
        uint64 lpClaimFraction,
        uint64 numerator,
        uint64 denominator
    ) 
        public 
        onlyOwner() 
        returns (address instance) 
    {
        instance = instanceManagment.produce(
            reserveToken, 
            tradedToken, 
            duration, 
            reserveTokenClaimFraction, 
            tradedTokenClaimFraction, 
            lpClaimFraction, 
            numerator, 
            denominator
        );
        emit InstanceCreated(reserveToken, tradedToken, instance);
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
        nonReentrant
    {
        address account = _msgSender();

        uint256 balance = balanceOf(account);
        
        require (amount <= balance, "INSUFFICIENT_BALANCE");
        
        uint256 locked = _getMinimum(account);
        uint256 remainingAmount = balance - amount;
        require(locked <= remainingAmount, "STAKE_NOT_UNLOCKED_YET");

        _unstake(account, amount);
        
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
        nonReentrant
    {
        _redeem(_msgSender(), amount, new address[](0), Strategy.REDEEM);
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
        nonReentrant
    {
        _redeem(_msgSender(), amount, preferredInstances, Strategy.REDEEM);
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
        nonReentrant
    {
        _redeem(_msgSender(), amount, new address[](0), Strategy.REDEEM_AND_REMOVE_LIQUIDITY);
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
        nonReentrant
    {
        _redeem(_msgSender(), amount, preferredInstances, Strategy.REDEEM_AND_REMOVE_LIQUIDITY);
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
    
    /**
    * @dev function has overloaded. 
    * @custom:shortd transfers ownership of the contract to a new account
    */
    function transferOwnership(
        address newOwner
    ) public 
        virtual 
        override 
        onlyOwner 
    {
        super.transferOwnership(newOwner);
        _revokeRole(ADMIN_ROLE, _msgSender());
        _grantRole(ADMIN_ROLE, newOwner);
    }


    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    
    
    function _unstake(
        address account,
        uint256 amount
    ) 
        internal 
    {
        uint256 totalSupplyBefore = _burn(account, amount);

        (address[] memory instancesList, uint256[] memory values, uint256 len) = _poolStakesAvailable(account, amount, new address[](0), Strategy.UNSTAKE, totalSupplyBefore);
        for (uint256 i = 0; i < len; i++) {
            try ICommunityStakingPool(instancesList[i]).redeemAndRemoveLiquidity(
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


    // create map of instance->amount or LP tokens that need to redeem
    function _poolStakesAvailable(
        address account,
        uint256 amount,
        address[] memory preferredInstances,
        Strategy strategy,
        uint256 totalSupplyBefore
    ) 
        internal 
        view
        returns(
            address[] memory instancesAddress, 
            uint256[] memory values,
            uint256 len
        ) 
    {
        ICommunityStakingPoolFactory.InstanceInfo memory instanceInfo;

        if (preferredInstances.length == 0) {
            preferredInstances = instanceManagment.instances();
        }

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

            // --- proposal from audit to keep precision after division
            // amountLeft = amount * A / (A + B * discountSensitivity / FRACTION);
            amountLeft = amount * A * FRACTION;
            amountLeft = amountLeft / (A + B * discountSensitivity / FRACTION);
            amountLeft = amountLeft / FRACTION;
            //----
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
                    //values[len] = amountToRedeem;

                    instanceInfo =  instanceManagment.getInstanceInfoByPoolAddress(preferredInstances[i]); // todo is exist there?

                    //backward conversion( СС -> LP)
                    values[len]  = amountToRedeem * (10**instanceInfo.denominator) / (10**instanceInfo.numerator);
                    
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
        Strategy strategy
    ) 
        internal 
        onlyRoleWithAccount(REDEEM_ROLE, account)
    {
        __redeem(account, account, amount, preferredInstances, strategy);
    }

    function _burn(
        address account,
        uint256 amount
    ) 
        internal 
        returns(uint256 totalSupplyBefore)
    {
        totalSupplyBefore = totalSupply();
        if (account != address(this)) {
            require(allowance(account, address(this))  >= amount, "Amount exceeds allowance");
        }
        _burn(account, amount, "", "");
    }
    
    function __redeem(
        address account2Burn,
        address account2Redeem,
        uint256 amount,
        address[] memory preferredInstances,
        Strategy strategy
    ) 
        internal 
    {

        uint256 totalSupplyBefore = _burn(account2Burn, amount);

        require (amount <= totalRedeemable, "INSUFFICIENT_BALANCE");
        
        (address[] memory instancesToRedeem, uint256[] memory valuesToRedeem, uint256 len) = _poolStakesAvailable(account2Redeem, amount, preferredInstances, strategy/*Strategy.REDEEM*/, totalSupplyBefore);
        

        for (uint256 i = 0; i < len; i++) {
            if (_instanceStaked[instancesToRedeem[i]] > 0) {

                if (strategy == Strategy.REDEEM) {


                    try ICommunityStakingPool(instancesToRedeem[i]).redeem(
                        account2Redeem, 
                        valuesToRedeem[i]
                    ) {
                        _instanceStaked[instancesToRedeem[i]] -= valuesToRedeem[i];
                        totalRedeemable -= valuesToRedeem[i];
                    }
                    catch {
                        revert("Error when redeem in an instance");
                    }
                } else if (strategy == Strategy.REDEEM_AND_REMOVE_LIQUIDITY) {
                    try ICommunityStakingPool(instancesToRedeem[i]).redeemAndRemoveLiquidity(
                        account2Redeem, 
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

    /**
    * @dev implemented EIP-2771
    * @return signer return address of msg.sender. but consider EIP-2771 for trusted forwarder will return from msg.data payload
    */
    function _msgSender(
    ) 
        internal 
        view 
        virtual
        override(ContextUpgradeable, TrustedForwarder)
        returns (address signer) 
    {
        return TrustedForwarder._msgSender();
    }



}
