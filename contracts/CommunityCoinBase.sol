// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;
import "./interfaces/IHook.sol";
import "./interfaces/ICommunityCoin.sol";
import "./interfaces/ICommunityStakingPool.sol";
import "./RolesManagement.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
//import "./minimums/libs/MinimumsLib.sol";
import "./interfaces/ICommunityStakingPoolFactory.sol";
import "@artman325/community/contracts/interfaces/ICommunity.sol";
import "./interfaces/IStructs.sol";

//import "./access/TrustedForwarderUpgradeable.sol";
import "@artman325/releasemanager/contracts/CostManagerHelperERC2771Support.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "hardhat/console.sol";
import "./libs/PoolStakesLib.sol";

abstract contract CommunityCoinBase is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, //TrustedForwarderUpgradeable, 
    CostManagerHelperERC2771Support,
    ICommunityCoin,
    RolesManagement,
    ERC777Upgradeable, 
    IERC777RecipientUpgradeable 
{
    using MinimumsLib for MinimumsLib.UserStruct;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
    * strategy ENUM VARS used in calculation algos
    */ 
    // moved to ICommunityCoin
    //enum Strategy{ UNSTAKE, UNSTAKE_AND_REMOVE_LIQUIDITY, REDEEM, REDEEM_AND_REMOVE_LIQUIDITY } 
    
    uint64 internal constant LOCKUP_INTERVAL = 24*60*60; // day in seconds
    uint64 internal constant LOCKUP_BONUS_INTERVAL = 1000*365*24*60*60; // 300 years in seconds
    uint64 internal constant FRACTION = 100000; // fractions are expressed as portions of this

    uint64 internal constant MAX_REDEEM_TARIFF = 10000; //10%*FRACTION = 0.1 * 100000 = 10000
    uint64 internal constant MAX_UNSTAKE_TARIFF = 10000; //10%*FRACTION = 0.1 * 100000 = 10000

    uint64 public redeemTariff;
    uint64 public unstakeTariff;

    //uint64 public constant CIRCULATION_DURATION = 365*24*60*60; //year by default. will be used if circulation added to minimums

    IHook public hook; // hook used to bonus calculation

    ICommunityStakingPoolFactory public instanceManagment; // ICommunityStakingPoolFactory
    
    uint256 internal discountSensitivity;
    
    uint256 internal totalUnstakeable;
    uint256 internal totalRedeemable;
    // it's how tokens will store in pools. without bonuses. 
    // means totalReserves = SUM(pools.totalSupply)
    uint256 internal totalReserves;
    //uint256 totalExtra;         // extra tokens minted by factory when staked

    address internal reserveToken;
    address internal tradedToken;

    //      instance
    mapping(address => InstanceStruct) private _instances;

    // // staked balance in instances. increase when stakes, descrease when unstake/redeem
    // mapping(address => uint256) private _instanceStaked;

    //bytes32 private constant TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    // Constants for shifts
    uint8 internal constant OPERATION_SHIFT_BITS = 240;  // 256 - 16
    
    // // Constants representing operations
    uint8 internal constant OPERATION_INITIALIZE = 0x0;
    uint8 internal constant OPERATION_ISSUE_WALLET_TOKENS = 0x1;
    uint8 internal constant OPERATION_ISSUE_WALLET_TOKENS_BONUS = 0x2;
    uint8 internal constant OPERATION_ISSUE_WALLET_TOKENS_BY_INVITE = 0x3;
    uint8 internal constant OPERATION_ADD_TO_CIRCULATION = 0x4;
    uint8 internal constant OPERATION_REMOVE_FROM_CIRCULATION = 0x5;
    uint8 internal constant OPERATION_PRODUCE = 0x6;
    uint8 internal constant OPERATION_PRODUCE_ERC20 = 0x7;
    uint8 internal constant OPERATION_UNSTAKE = 0x8;
    uint8 internal constant OPERATION_UNSTAKE_AND_REMOVE_LIQUIDITY = 0x9;
    uint8 internal constant OPERATION_REDEEM = 0xA;
    uint8 internal constant OPERATION_REDEEM_AND_REMOVE_LIQUIDITY = 0xB;
    uint8 internal constant OPERATION_REDEEM_AND_REMOVE_LIQUIDITY_PREF_INST = 0xC;
    uint8 internal constant OPERATION_GRANT_ROLE = 0xD;
    uint8 internal constant OPERATION_REVOKE_ROLE = 0xE;
    uint8 internal constant OPERATION_CLAIM = 0xF;
    uint8 internal constant OPERATION_SET_TRUSTEDFORWARDER = 0x10;
    uint8 internal constant OPERATION_SET_TRANSFER_OWNERSHIP = 0x11;
    uint8 internal constant OPERATION_TRANSFER_HOOK = 0x12;

    //EnumerableSet.AddressSet private rewardTokensList;
    //mapping(address => uint256) public rewardTokenRatios;

    // struct UnstakeableStruct {
    //     uint256 total;
    //     EnumerableSetUpgradeable.AddressSet instancesList;
    //     //      instanceAddr
    //     mapping(address => uint256) instances;
    // }
    // //      users
    // mapping(address => UnstakeableStruct) internal unstakeable;

    // //      users
    // mapping(address => MinimumsLib.UserStruct) internal tokensLocked;
    // //      users
    // mapping(address => MinimumsLib.UserStruct) internal tokensBonus;

    //      users
    mapping(address => UserData) internal users;

    bool flagBurnUnstakeRedeem;
    modifier proceedBurnUnstakeRedeem() {
        flagBurnUnstakeRedeem = true;
        _;
        flagBurnUnstakeRedeem = false;
    }
    event RewardGranted(address indexed token, address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 amount, uint256 priceBeforeStake);
    

    /**
    * @param impl address of StakingPool implementation
    * @param implErc20 address of StakingPoolErc20 implementation
    * @param hook_ address of contract implemented IHook interface and used to calculation bonus tokens amount
    * @param communityCoinInstanceAddr address of contract that managed and cloned pools
    * @param discountSensitivity_ discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default)
    * @param reserveToken_ address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken_ address of traded token. usual it intercoin investor token
    * [deprecated]param costManager_ costManager address
    * [deprecated]param producedBy_ address that produced instance by factory
    * @custom:calledby StakingFactory contract 
    * @custom:shortd initializing contract. called by StakingFactory contract
    */
    function CommunityCoinBase__init(
        string memory tokenName,
        string memory tokenSymbol,
        address impl,
        address implErc20,
        address hook_,
        address communityCoinInstanceAddr,
        uint256 discountSensitivity_,
        address reserveToken_,
        address tradedToken_,
        IStructs.CommunitySettings calldata communitySettings,
        address costManager_,
        address producedBy_
    ) 
        onlyInitializing 
        internal 
    {
        __CostManagerHelper_init(_msgSender());
        _setCostManager(costManager_);

        __Ownable_init();

        __ERC777_init(tokenName, tokenSymbol, (new address[](0)));

        __ReentrancyGuard_init();

        instanceManagment = ICommunityStakingPoolFactory(communityCoinInstanceAddr);//new ICommunityStakingPoolFactory(impl);
        instanceManagment.initialize(impl, implErc20);

        hook = IHook(hook_);

        discountSensitivity = discountSensitivity_;
        
        __RolesManagement_init(communitySettings);

        reserveToken = reserveToken_;
        tradedToken = tradedToken_;

        // register interfaces
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));

        _accountForOperation(
            OPERATION_INITIALIZE << OPERATION_SHIFT_BITS,
            uint256(uint160(producedBy_)),
            0
        );
    }

    
    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

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
    {

        address instance = msg.sender; //here need a msg.sender as a real sender.

        // here need to know that is definetely StakingPool. because with EIP-2771 forwarder can call methods as StakingPool. 
        ICommunityStakingPoolFactory.InstanceInfo memory instanceInfo = instanceManagment.getInstanceInfoByPoolAddress(instance);
  
        require(instanceInfo.exists == true);

        // calculate bonusAmount
        uint256 bonusAmount = amount * instanceInfo.bonusTokenFraction / FRACTION;

        // calculate invitedAmount
        address invitedBy = address(0);
        uint256 invitedAmount = 0;

        if (invitedByFraction != 0) {
            invitedBy = _invitedBy(account);
            if (invitedBy != address(0)) {
                //do invite comission calculation here
                invitedAmount = amount * invitedByFraction / FRACTION;
                
            }
        }

//        uint256 totalAmount = amount + bonusAmount;

        //forward conversion( LP -> СС)
        amount = amount * (instanceInfo.numerator) / (instanceInfo.denominator);
        bonusAmount = bonusAmount * (instanceInfo.numerator) / (instanceInfo.denominator);
        invitedAmount = invitedAmount * (instanceInfo.numerator) / (instanceInfo.denominator);
        

        // todo 0: remove it from here.
        // mb. create three methods onSTake/onUnstake/onREdeem
        if (address(hook) != address(0)) {
            hook.bonus(instance, account, instanceInfo.duration, amount);
        }

        // means extra tokens should not to include into unstakeable and totalUnstakeable, but part of them will be increase totalRedeemable
        // also keep in mind that user can unstake only unstakeable[account].total which saved w/o bonusTokens, but minimums and mint with it.
        // it's provide to use such tokens like transfer but prevent unstake bonus in 1to1 after minimums expiring
        // amount += bonusAmount;

        _instances[instance]._instanceStaked += amount;// + bonusAmount + invitedAmount;

        _instances[instance].unstakeable[account] += amount;
        users[account].unstakeable += amount;

        // _instances[instance].unstakeableBonuses[account] += bonusAmount;
        // users[account].unstakeableBonuses += bonusAmount;
        _insertBonus(instance, account, bonusAmount);

        totalUnstakeable += amount;
        totalReserves += amount;

        if (invitedBy != address(0)) {
            // _instances[instance].unstakeableBonuses[invitedBy] += invitedAmount;
            // users[invitedBy].unstakeableBonuses += invitedAmount;
            _insertBonus(instance, invitedBy, invitedAmount);
        }

        // mint main part + bonus (@dev here bonus can be zero )
        _mint(account, (amount + bonusAmount), "", "");
        emit Staked(account, (amount + bonusAmount), priceBeforeStake);
        // locked main 
        users[account].tokensLocked._minimumsAdd(amount, instanceInfo.duration, LOCKUP_INTERVAL, false);
        _accountForOperation(
            OPERATION_ISSUE_WALLET_TOKENS << OPERATION_SHIFT_BITS,
            uint256(uint160(account)),
            amount + bonusAmount
        );

        
        // locked main 
        if (bonusAmount > 0) {
            users[account].tokensBonus._minimumsAdd(bonusAmount, 1, LOCKUP_BONUS_INTERVAL, false);
            _accountForOperation(
                OPERATION_ISSUE_WALLET_TOKENS_BONUS << OPERATION_SHIFT_BITS,
                uint256(uint160(account)),
                bonusAmount
            );
        }

        if (invitedBy != address(0)) {
            _mint(invitedBy, invitedAmount, "", "");
            users[invitedBy].tokensBonus._minimumsAdd(invitedAmount, 1, LOCKUP_BONUS_INTERVAL, false);
            _accountForOperation(
                OPERATION_ISSUE_WALLET_TOKENS_BY_INVITE << OPERATION_SHIFT_BITS,
                uint256(uint160(invitedBy)),
                invitedAmount
            );
        }
        
    }
    
    /**
    * @notice method to adding tokens to circulation. called externally only by `CIRCULATION_ROLE`
    * @param amount token's amount
    * @custom:calledby `CIRCULATION_ROLE`
    * @custom:shortd distribute tokens
    */
    function addToCirculation(
        address account,
        uint256 amount
    ) 
        external 
        nonReentrant
        //onlyRole(roles.circulationRole)
    {

        _checkRole(circulationRoleId, _msgSender());
        
        _mint(account, amount, "", "");

        //users[account].tokensBonus._minimumsAdd(amount, 1, LOCKUP_BONUS_INTERVAL, false);
        
        _accountForOperation(
            OPERATION_ADD_TO_CIRCULATION << OPERATION_SHIFT_BITS,
            uint256(uint160(account)),
            amount
        );
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

        //require((_msgSender() == address(this) && to == address(this)), "own tokens permitted only");
        if (!(_msgSender() == address(this) && to == address(this))) {revert OwnTokensPermittedOnly();}
        
        _checkRole(redeemRoleId, from);

        __redeem(address(this), from, amount, new address[](0), Strategy.REDEEM);

        
    }

    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    
    /**
    * @dev it's extended version for create instance pool available for owners only.
    * @param duration duration represented in amount of `LOCKUP_INTERVAL`
    * @param bonusTokenFraction fraction of bonus tokens multiplied by {CommunityStakingPool::FRACTION} that additionally distributed when user stakes
    * @param donations array of tuples donations. address,uint256. if array empty when coins will obtain sender, overwise donation[i].account  will obtain proportionally by ration donation[i].amount
    * @param lpFraction fraction of LP token multiplied by {CommunityStakingPool::FRACTION}. See more in {CommunityStakingPool::initialize}
    * @param lpFractionBeneficiary beneficiary's address which obtain lpFraction of LP tokens. if address(0) then it would be owner()
    * @param numerator used in conversion LP/CC
    * @param denominator used in conversion LP/CC
    * @return instance address of created instance pool `CommunityStakingPool`
    * @custom:calledby owner
    * @custom:shortd creation instance with extended options
    */
    function produce(
        uint64 duration, 
        uint64 bonusTokenFraction, 
        IStructs.StructAddrUint256[] memory donations,
        uint64 lpFraction,
        address lpFractionBeneficiary,
        uint64 numerator,
        uint64 denominator
    ) 
        public 
        onlyOwner() 
        returns (address instance) 
    {
        return _produce(duration, bonusTokenFraction, donations, lpFraction, lpFractionBeneficiary, numerator, denominator);
    }

    /**
    * @dev function for creation erc20 instance pool.
    * @param tokenErc20 address of erc20 token.
    * @param duration duration represented in amount of `LOCKUP_INTERVAL`
    * @param bonusTokenFraction fraction of bonus tokens multiplied by {CommunityStakingPool::FRACTION} that additionally distributed when user stakes
    * @param donations array of tuples donations. address,uint256. if array empty when coins will obtain sender, overwise donation[i].account  will obtain proportionally by ration donation[i].amount
    * @param lpFraction fraction of LP token multiplied by {CommunityStakingPool::FRACTION}. See more in {CommunityStakingPool::initialize}
    * @param lpFractionBeneficiary beneficiary's address which obtain lpFraction of LP tokens. if address(0) then it would be owner()
    * @return instance address of created instance pool `CommunityStakingPoolErc20`
    * @custom:shortd creation erc20 instance with simple options
    */
    function produce(       
        address tokenErc20, 
        uint64 duration, 
        uint64 bonusTokenFraction, 
        IStructs.StructAddrUint256[] memory donations, 
        uint64 lpFraction,
        address lpFractionBeneficiary,
        uint64 numerator, 
        uint64 denominator
    ) 
        public 
        onlyOwner() 
        returns (address instance) 
    {
        return _produce(tokenErc20, duration, bonusTokenFraction, donations, lpFraction, lpFractionBeneficiary, numerator, denominator);
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
// console.log("unstake#1");
        _validateUnstake(account, amount);
// console.log("unstake#2");
        _unstake(account, amount, new address[](0), Strategy.UNSTAKE);
// console.log("unstake#3");
        _accountForOperation(
            OPERATION_UNSTAKE << OPERATION_SHIFT_BITS,
            uint256(uint160(account)),
            amount
        );   
    }

    function unstakeAndRemoveLiquidity(
        uint256 amount
    ) 
        public 
        nonReentrant
    {
        address account = _msgSender();

        _validateUnstake(account, amount);

        _unstake(account, amount, new address[](0), Strategy.UNSTAKE_AND_REMOVE_LIQUIDITY);

        _accountForOperation(
            OPERATION_UNSTAKE_AND_REMOVE_LIQUIDITY << OPERATION_SHIFT_BITS,
            uint256(uint160(account)),
            amount
        );   
    }

    function _validateUnstake(
        address account, 
        uint256 amount
    ) 
        internal 
        view
    {

        uint256 balance = balanceOf(account);
        
        //require (amount <= balance, "INSUFFICIENT_BALANCE");
        if (amount > balance) {revert InsufficientBalance(account, amount);}
        
        uint256 locked = users[account].tokensLocked._getMinimum();
        uint256 remainingAmount = balance - amount;
        //require(locked <= remainingAmount, "STAKE_NOT_UNLOCKED_YET");
        if (locked > remainingAmount) {revert StakeNotUnlockedYet(account, locked, remainingAmount);}

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

        _accountForOperation(
            OPERATION_REDEEM << OPERATION_SHIFT_BITS,
            uint256(uint160(_msgSender())),
            amount
        );   
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

        _accountForOperation(
            OPERATION_REDEEM << OPERATION_SHIFT_BITS,
            uint256(uint160(_msgSender())),
            amount
        );   
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

        _accountForOperation(
            OPERATION_REDEEM_AND_REMOVE_LIQUIDITY << OPERATION_SHIFT_BITS,
            uint256(uint160(_msgSender())),
            amount
        ); 
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

        _accountForOperation(
            OPERATION_REDEEM_AND_REMOVE_LIQUIDITY_PREF_INST << OPERATION_SHIFT_BITS,
            uint256(uint160(_msgSender())),
            amount
        ); 
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
        amount = users[account].tokensLocked._getMinimum()+users[account].tokensBonus._getMinimum();
    }   

    function viewLockedWalletTokensList(
        address account
    ) 
        public 
        view 
        returns (uint256[][] memory, uint256[][] memory) 
    {
        return(
            users[account].tokensLocked._getMinimumList(),
            users[account].tokensBonus._getMinimumList()
        );
    }   

    /**
    * @dev calculate how much token user will obtain if redeem and remove liquidity token. 
    * There are steps:
    * 1. LP tokens swap to Reserved and Traded Tokens
    * 2. TradedToken swap to Reverved
    * 3. All Reserved tokens try to swap in order of swapPaths
    * @param account address which will be redeem funds from
    * @param amount liquidity tokens amount 
    * @param preferredInstances array of preferred Stakingpool instances which will be redeem funds from
    * @param swapPaths array of arrays uniswap swapPath
    * @return address destination address
    * @return uint256 destination amount
    */
    function simulateRedeemAndRemoveLiquidity(
        address account,
        uint256 amount, //amountLP,
        address[] memory preferredInstances,
        address[][] memory swapPaths
    )
        public 
        view 
        returns(address, uint256)
    {
        
        (address[] memory instancesToRedeem, uint256[] memory valuesToRedeem, /*uint256[] memory amounts*/, /* uint256 len*/) = _poolStakesAvailable(
            account, 
            amount, 
            preferredInstances, 
            Strategy.REDEEM_AND_REMOVE_LIQUIDITY, 
            totalSupply()//totalSupplyBefore
        );

        return instanceManagment.amountAfterSwapLP(instancesToRedeem, valuesToRedeem, swapPaths);
    }

    function claim() public {
        _accountForOperation(
            OPERATION_CLAIM << OPERATION_SHIFT_BITS,
            uint256(uint160(_msgSender())),
            0
        ); 
        if (address(hook) != address(0)) {
            hook.claim(_msgSender());
        }
    
    }

     /**
    * @dev setup trusted forwarder address
    * @param forwarder trustedforwarder's address to set
    * @custom:shortd setup trusted forwarder
    * @custom:calledby owner
    */
    function setTrustedForwarder(
        address forwarder
    ) 
        public 
        override
        onlyOwner 
        //excludeTrustedForwarder 
    {
        //require(owner() != forwarder, "FORWARDER_CAN_NOT_BE_OWNER");
        if (owner() == forwarder) {revert TrustedForwarderCanNotBeOwner(forwarder);}

        _setTrustedForwarder(forwarder);
        _accountForOperation(
            OPERATION_SET_TRUSTEDFORWARDER << OPERATION_SHIFT_BITS,
            uint256(uint160(_msgSender())),
            uint256(uint160(forwarder))
        );
    }

    function transferOwnership(
        address newOwner
    ) public 
        virtual 
        override
        onlyOwner 
    {
        //require(!_isTrustedForwarder(msg.sender), "DENIED_FOR_FORWARDER");
        if (_isTrustedForwarder(msg.sender)) {revert DeniedForTrustedForwarder(msg.sender);}

        if (_isTrustedForwarder(newOwner)) {
            _setTrustedForwarder(address(0));
        }
        // _accountForOperation(
        //     OPERATION_SET_TRANSFER_OWNERSHIP << OPERATION_SHIFT_BITS,
        //     uint256(uint160(_msgSender())),
        //     uint256(uint160(newOwner))
        // );
        super.transferOwnership(newOwner);
        
    }

    /**
    * @param fraction fraction that will send to person which has invite person who staked
    */
    function setCommission(
        uint256 fraction
    )
        public
        onlyOwner
    {
        invitedByFraction = fraction;

    }

    
    function setTariff(
        uint64 redeemTariff_,
        uint64 unstakeTariff_
    )
        public
    {

        _checkRole(tariffRoleId, _msgSender());
        if (
            redeemTariff_ > MAX_REDEEM_TARIFF ||
            unstakeTariff_ > MAX_UNSTAKE_TARIFF
        ) {
            revert AmountExceedsMaxTariff();
        }
        redeemTariff = redeemTariff_;
        unstakeTariff = unstakeTariff_;
    }
  
    
    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    
    
    function _produce(
        uint64 duration, 
        uint64 bonusTokenFraction,
        IStructs.StructAddrUint256[] memory donations,
        uint64 lpFraction,
        address lpFractionBeneficiary,
        uint64 numerator,
        uint64 denominator
    ) 
        internal
        returns (address instance) 
    {
        instance = instanceManagment.produce(
            reserveToken, 
            tradedToken, 
            duration, 
            bonusTokenFraction,
            donations,
            lpFraction, 
            lpFractionBeneficiary,
            numerator, 
            denominator
        );
        emit InstanceCreated(reserveToken, tradedToken, instance);

        _accountForOperation(
            OPERATION_PRODUCE << OPERATION_SHIFT_BITS,
            (duration<<(256-64))+(bonusTokenFraction<<(256-128))+(numerator<<(256-192))+(denominator),
            (uint160(lpFractionBeneficiary)<<(256-160)) + lpFraction
        );
    }

    function _produce(
        address tokenErc20, 
        uint64 duration, 
        uint64 bonusTokenFraction,
        IStructs.StructAddrUint256[] memory donations,
        uint64 lpFraction,
        address lpFractionBeneficiary,
        uint64 numerator, 
        uint64 denominator
    ) 
        internal
        returns (address instance) 
    {
        instance = instanceManagment.produceErc20(
            tokenErc20, 
            duration, 
            bonusTokenFraction,
            donations, 
            lpFraction, 
            lpFractionBeneficiary,
            numerator,
            denominator
        );
        emit InstanceErc20Created(tokenErc20, instance);

        _accountForOperation(
            OPERATION_PRODUCE_ERC20 << OPERATION_SHIFT_BITS,
            (duration<<(256-64))+(bonusTokenFraction<<(256-128))+(numerator<<(256-192))+(denominator),
            (uint160(lpFractionBeneficiary)<<(256-160)) + lpFraction
        );
    }

    function _unstake(
        address account,
        uint256 amount,
        address[] memory preferredInstances,
        Strategy strategy
    ) 
        proceedBurnUnstakeRedeem
        internal 
    {
// console.log("_unstake#0");
        uint256 totalSupplyBefore = _burn(account, amount);

// console.log("_unstake#1");
        amount -= amount * unstakeTariff;

        (address[] memory instancesList, uint256[] memory values, uint256[] memory amounts, uint256 len) = _poolStakesAvailable(account, amount, preferredInstances, strategy, totalSupplyBefore);

// console.log("_unstake#2");
// console.log("len =",len);
        for (uint256 i = 0; i < len; i++) {
// console.log("i =",i);
// console.log("amounts[i] =",amounts[i]);
// console.log("users[account].unstakeable =",users[account].unstakeable);
// console.log("users[account].unstakeableBonuses =",users[account].unstakeableBonuses);
//console.log(1);

            

            _instances[instancesList[i]]._instanceStaked -= amounts[i];
//console.log(2);
            _instances[instancesList[i]].unstakeable[account] -= amounts[i];
//console.log(3);
            users[account].unstakeable -= amounts[i];
            
//console.log(4);

            proceedPool(
                account,
                instancesList[i],
                values[i],
                strategy
            );
//console.log(5);                                    
        }
//console.log(6);  
    }


/*
ICommunityStakingPoolFactory.InstanceInfo
instanceManagment
Strategy.
astrcut _instances storage
*/
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
            address[] memory instancesAddress,  // instance's addresses
            uint256[] memory values,            // amounts to redeem in instance
            uint256[] memory amounts,           // itrc amount equivalent(applied num/den)
            uint256 len
        ) 
    {
        amount = PoolStakesLib.getAmountLeft(account, amount, totalSupplyBefore, strategy, totalRedeemable, totalUnstakeable, totalReserves, discountSensitivity, users);
// console.log("_poolStakesAvailable::amountLeft=", amount);
        (instancesAddress, values, amounts, len) = PoolStakesLib.available(account, amount, preferredInstances, strategy, instanceManagment, _instances);
        

    }

    

    function _redeem(
        address account,
        uint256 amount,
        address[] memory preferredInstances,
        Strategy strategy
    ) 
        internal 
    {

        _checkRole(redeemRoleId, account);

        __redeem(account, account, amount, preferredInstances, strategy);
    }

    function _burn(
        address account,
        uint256 amount
    ) 
        proceedBurnUnstakeRedeem()
        internal 
        returns(uint256 totalSupplyBefore)
    {
        totalSupplyBefore = totalSupply();
        if (account != address(this)) {
            //require(allowance(account, address(this))  >= amount, "Amount exceeds allowance");
            if (allowance(account, address(this))  < amount) {revert AmountExceedsAllowance(account, amount);}
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
        proceedBurnUnstakeRedeem
        internal 
    {

        uint256 totalSupplyBefore = _burn(account2Burn, amount);

        

        //require (amount <= totalRedeemable, "INSUFFICIENT_BALANCE");

// console.log("amount = ",amount);
// console.log("totalRedeemable = ",totalRedeemable);

        if (amount > totalRedeemable) {revert InsufficientBalance(account2Redeem, amount);}

        
        amount -= amount * redeemTariff;

        (address[] memory instancesToRedeem, uint256[] memory valuesToRedeem, uint256[] memory amounts, uint256 len) = _poolStakesAvailable(account2Redeem, amount, preferredInstances, strategy/*Strategy.REDEEM*/, totalSupplyBefore);

        for (uint256 i = 0; i < len; i++) {
            
            if (_instances[instancesToRedeem[i]].redeemable > 0) {
                //_instances[instancesToRedeem[i]]._instanceStaked -= amounts[i];
                _instances[instancesToRedeem[i]].redeemable -= amounts[i];
                totalRedeemable -= amounts[i];

                //if (strategy == Strategy.REDEEM || strategy == Strategy.REDEEM_AND_REMOVE_LIQUIDITY) {
                    totalReserves -= amounts[i];
                //}
                proceedPool(
                    account2Redeem,
                    instancesToRedeem[i],
                    valuesToRedeem[i],
                    strategy
                );
            }
        }
    }

    /**
    * @param amount already converted amount
    */
    function proceedPool(address account,address pool, uint256 amount, Strategy strategy/*, string memory errmsg*/) internal {
        
        if (strategy == Strategy.REDEEM || strategy == Strategy.UNSTAKE) {

            try ICommunityStakingPool(pool).redeem(
                account, 
                amount
            ) {
                // _instanceStaked[pool] -= amount;
                // totalRedeemable -= amount;
            }
            catch {
                if (strategy == Strategy.REDEEM) {
                    revert REDEEM_ERROR();
                } else if (strategy == Strategy.UNSTAKE){
                    revert UNSTAKE_ERROR();
                }
                //revert(errmsg);
            }
        } else if (strategy == Strategy.UNSTAKE_AND_REMOVE_LIQUIDITY || strategy == Strategy.REDEEM_AND_REMOVE_LIQUIDITY) {
            try ICommunityStakingPool(pool).redeemAndRemoveLiquidity(
                account, 
                amount
            ) {
                // _instanceStaked[pool] -= valuesToRedeem[i];
                // totalRedeemable -= valuesToRedeem[i];
            }
            catch {
                if (strategy == Strategy.REDEEM_AND_REMOVE_LIQUIDITY) {
                    revert REDEEM_ERROR();
                } else if (strategy == Strategy.UNSTAKE_AND_REMOVE_LIQUIDITY){
                    revert UNSTAKE_ERROR();
                }
                //revert(errmsg);
            }
        // } else {
        //     revert("unknown strategy");
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
                    _accountForOperation(
                        OPERATION_TRANSFER_HOOK << OPERATION_SHIFT_BITS,
                        uint256(uint160(from)),
                        uint256(uint160(to))
                    );
                    //require(hook.transferHook(operator, from, to, amount), "HOOK: TRANSFER_PREVENT");
                    if (hook.transferHook(operator, from, to, amount) == false) { revert HookTransferPrevent(from, to, amount);}

                }

                uint256 balance = balanceOf(from);

                if (balance >= amount) {
               
                    uint256 remainingAmount = balance - amount;
                    
                    //-------------------
                    // locked sections
                    //-------------------   
                    
                    /*
                    balance = 100
                    amount = 40
                    locked = 50
                    minimumsTransfer - ? =  0
                    */
                    /*
                    balance = 100
                    amount = 60
                    locked = 50
                    minimumsTransfer - ? = [50 > (100-60)] locked-(balance-amount) = 50-(40)=10  
                    */
                    /*
                    balance = 100
                    amount = 100
                    locked = 100
                    minimumsTransfer - ? = [100 > (100-100)] 100-(100-100)=100  
                    */
                    uint256 locked = users[from].tokensLocked._getMinimum();
                    uint256 lockedBonus = users[from].tokensBonus._getMinimum();
                    //else drop locked minimum, but remove minimums even if remaining was enough
                    //minimumsTransfer(account, ZERO_ADDRESS, (locked - remainingAmount))
// console.log("locked---start");
// console.log("balance        = ",balance);
// console.log("amount         = ",amount);
// console.log("remainingAmount= ",remainingAmount);
// console.log("locked         = ",locked);
// console.log("lockedBonus    = ",lockedBonus);
                    if (locked+lockedBonus > 0 && locked+lockedBonus >= remainingAmount ) {
// console.log("#1");
                        uint256 locked2Transfer = locked+lockedBonus-remainingAmount;
                        if (lockedBonus >= locked2Transfer) {
// console.log("#2.1");
                            users[from].tokensBonus.minimumsTransfer(users[address(0)].tokensBonus, true, (lockedBonus - locked2Transfer));
                        } else {
// console.log("#2.2");
                            
// console.log("locked2Transfer = ", locked2Transfer);                            
                            //uint256 left = (remainingAmount - lockedBonus);
                            if (lockedBonus > 0) {
                                users[from].tokensBonus.minimumsTransfer(users[address(0)].tokensBonus, true, lockedBonus);
                                locked2Transfer-= lockedBonus;
                            }
                            users[from].tokensLocked.minimumsTransfer(users[address(0)].tokensLocked, true, locked2Transfer);

                        }
                        
                    }
// console.log("locked         = ",locked);
// console.log("lockedBonus    = ",lockedBonus);                    
// console.log("locked---end");
                    //-------------------

                    if (
                        // not calculate if
                        flagBurnUnstakeRedeem || // - burn or unstake or redeem
                        to == address(this)      // - send directly to contract
                    ) { 
                    
                    } else {
// console.log("amount                         =",amount);
// console.log("remainingAmount                =",remainingAmount);
// console.log("users[from].unstakeable        =",users[from].unstakeable);
// console.log("users[from].unstakeableBonuses =",users[from].unstakeableBonuses);
// console.log("users[to].unstakeable          =",users[to].unstakeable);
// console.log("users[to].unstakeableBonuses   =",users[to].unstakeableBonuses);
                        // else it's just transfer

                        // so while transfer user will user free tokens at first
                        // then try to use locked. when using locked we should descrease

                        //users[from].unstakeableBonuses;
                        //try to get from bonuses
                        //  here just increase redeemable
                        //then try to get from main unstakeable
                        //  here decrease any unstakeable vars
                        //              increase redeemable
                        uint256 r;
                        uint256 left = amount;
                        if (users[from].unstakeableBonuses > 0) {
// console.log("#1");
                            if (users[from].unstakeableBonuses >= left) {
                                r = left;
                            } else {
                                r = users[from].unstakeableBonuses;
                            }

                            if (to == address(0)) {
                                // it's simple burn and tokens can not be redeemable
                            } else {
                                totalRedeemable += r;
                            }

                            _removeBonusThroughInstances(from, r);
                            users[from].unstakeableBonuses -= r;
                            left -= r;
                        
                        }



                        if ((left > 0) && (users[from].unstakeable >= left)) {
// console.log("#2");                            
                            if (users[from].unstakeable >= left) {
                                r = left;
                            } else {
                                r = users[from].unstakeable;
                            }

                         //   r = users[from].unstakeable - left;
                            // if (totalUnstakeable >= r) {
                            users[from].unstakeable -= r;
                            totalUnstakeable -= r;
                            

                            if (to == address(0)) {
                                // it's simple burn and tokens can not be redeemable
                            } else {
                                totalRedeemable += r;
                            }
                            
                            _removeMainThroughInstances(from, r);

                            //left -= r;
                            
                            // }
                        }


                        // if (users[from].unstakeable >= remainingAmount) {
                        //     uint256 r = users[from].unstakeable - remainingAmount;
                        //     // if (totalUnstakeable >= r) {
                        //     users[from].unstakeable -= r;
                        //     totalUnstakeable -= r;
                        //     if (to == address(0)) {
                        //         // it's simple burn and tokens can not be redeemable
                        //     } else {
                        //         totalRedeemable += r;
                        //     }
                        //     // }
                        // }
// console.log("----------------------------");
// console.log("users[from].unstakeable        =",users[from].unstakeable);
// console.log("users[from].unstakeableBonuses =",users[from].unstakeableBonuses);
// console.log("users[to].unstakeable          =",users[to].unstakeable);
// console.log("users[to].unstakeableBonuses   =",users[to].unstakeableBonuses);
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

    function _insertBonus(
        address instance,
        address account,
        uint256 amount
    ) internal {

        if (!users[account].instancesList.contains(instance)) {
            users[account].instancesList.add(instance);
        }
        _instances[instance].unstakeableBonuses[account] += amount;
        users[account].unstakeableBonuses += amount;
    }

    function _removeBonus(
        address instance,
        address account,
        uint256 amount
    ) internal {
        // todo 0: 
        //  check `instance` exists in list.
        //  check `amount` should be less or equal `_instances[instance].unstakeableBonuses[account]`

        _instances[instance].unstakeableBonuses[account] -= amount;
        users[account].unstakeableBonuses -= amount;

        if (_instances[instance].unstakeable[account] >= amount) {
            _instances[instance].unstakeable[account] -= amount;
        } else if (_instances[instance].unstakeable[account] > 0) {
            _instances[instance].unstakeable[account] = 0;
            amount -= _instances[instance].unstakeable[account];
            
        }
        _cleanInstance(
                account, 
                instance
            );


        
    }

    function _removeBonusThroughInstances(
        address account,
        uint256 amount
    ) internal {
//console.log("START::_removeBonusThroughInstances");        
        uint256 len = users[account].instancesList.length();
        address[] memory instances2Delete = new address[](len) ;
        uint256 j = 0;
//console.log("_removeBonusThroughInstances::len", len);        
        address instance;
        for (uint256 i = 0; i < len; i++) {
            instance = users[account].instancesList.at(i);
            if (_instances[instance].unstakeableBonuses[account] >= amount) {
//console.log("_removeBonusThroughInstances::#1");
                _instances[instance].unstakeableBonuses[account] -= amount;
            } else if (_instances[instance].unstakeableBonuses[account] > 0) {
//console.log("_removeBonusThroughInstances::#2");
                _instances[instance].unstakeableBonuses[account] = 0;
                instances2Delete[i] = instance;
                j+=1;
                amount -= _instances[instance].unstakeableBonuses[account];
            }
        }

        // do deletion out of loop above. because catch out of array 
        cleanInstancesList(account, instances2Delete, j);
//console.log("END::_removeBonusThroughInstances");                
    }

    function _removeMainThroughInstances(
        address account,
        uint256 amount
    ) internal {
        uint256 len = users[account].instancesList.length();
        address[] memory instances2Delete = new address[](len) ;
        uint256 j=0;
        address instance;
        for (uint256 i = 0; i < len; i++) {
            instance = users[account].instancesList.at(i);
            if (_instances[instance].unstakeable[account] >= amount) {
                _instances[instance].unstakeable[account] -= amount;
                _instances[instance].redeemable += amount;
            } else if (_instances[instance].unstakeable[account] > 0) {
                _instances[instance].unstakeable[account] = 0;
                instances2Delete[j] = instance;
                j+=1;
                amount -= _instances[instance].unstakeable[account];
            }
        }

        // do deletion out of loop above. because catch out of array 
        cleanInstancesList(account, instances2Delete, j);

    }

    function cleanInstancesList(
        address account,
        address[] memory instances2Delete,
        uint256 indexUntil
    ) 
        internal
    {
        // console.log("start::cleanInstancesList");
        // console.log("cleanInstancesList::indexUntil=",indexUntil);
        //uint256 len = instances2Delete.length;
        if (indexUntil > 0) {
            for (uint256 i = 0; i < indexUntil; i++) {
                console.log("cleanInstancesList::i=",i);
                _cleanInstance(
                    account, 
                    instances2Delete[i]
                );
            }
        }
        // console.log("end::cleanInstancesList");

    }

    function _cleanInstance(
        address account,
        address instance
    ) 
        internal
    {
//console.log("start::_cleanInstance");
        if (
            _instances[instance].unstakeableBonuses[account] == 0 &&
            _instances[instance].unstakeable[account] == 0
        ) {
            users[account].instancesList.remove(instance);
        }
        
// console.log("end::_cleanInstance");

    }

}
