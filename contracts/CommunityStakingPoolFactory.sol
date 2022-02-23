// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

// import "./interfaces/IHook.sol";
// import "./interfaces/ICommunityCoin.sol";



// import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

// import "./interfaces/IERC20Dpl.sol";

// import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";

import "./interfaces/ICommunityStakingPool.sol";
import "./interfaces/ICommunityStakingPoolFactory.sol";

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

//import "hardhat/console.sol";

contract CommunityStakingPoolFactory is Initializable, ICommunityStakingPoolFactory {
    using ClonesUpgradeable for address;

    uint64 internal constant FRACTION = 100000; // fractions are expressed as portions of this

    mapping(address => mapping(
        address => mapping(
            uint256 => address
        )
    )) public override getInstance;


    address public implementation;
    address public creator;

    address[] private _instances;
    mapping(address => uint256) private _instanceIndexes;
    mapping(address => address) private _instanceCreators;

    mapping(address => InstanceInfo) public _instanceInfos;

    function initialize(
        address impl
    ) 
        initializer 
        external 
    {
        implementation = impl;
        creator = msg.sender;
    }

    function instancesByIndex(uint index) external view returns (address instance_) {
        return _instances[index];
    }
    function instances() external view returns (address[] memory instances_) {
        return _instances;
    }
    /**
    * @dev view amount of created instances
    * @return amount amount instances
    * @custom:shortd view amount of created instances
    */
    function instancesCount(
    )
        external 
        override 
        view 
        returns (uint256 amount) 
    {
        amount = _instances.length;
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

    function getInstanceInfoByPoolAddress(
        address addr
    ) 
        external
        view 
        returns(InstanceInfo memory) 
    {
        return _instanceInfos[addr];
    }

    
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
        external 
        returns (address instance) 
    {
        require (msg.sender == creator);

        _createInstanceValidate(
            reserveToken, tradedToken, duration, 
            reserveTokenClaimFraction, tradedTokenClaimFraction
        );

        address instanceCreated = _createInstance(
            reserveToken, 
            tradedToken, 
            duration, 
            reserveTokenClaimFraction, 
            tradedTokenClaimFraction, 
            lpClaimFraction, 
            numerator, 
            denominator
        );

        require(instanceCreated != address(0), "CommunityCoin: INSTANCE_CREATION_FAILED");
        require(duration != 0, "cant be zero duration");
        // if (duration == 0) {
        //     IStakingTransferRules(instanceCreated).initialize(
        //         reserveToken,  tradedToken, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
        //     );
        // } else {
            ICommunityStakingPool(instanceCreated).initialize(
                creator, reserveToken,  tradedToken, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
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
        require(reserveToken != tradedToken, "CommunityCoin: IDENTICAL_ADDRESSES");
        require(reserveToken != address(0) && tradedToken != address(0), "CommunityCoin: ZERO_ADDRESS");
        require(tradedClaimFraction <= FRACTION && reserveClaimFraction <= FRACTION, "CommunityCoin: WRONG_CLAIM_FRACTION");
        address instance = getInstance[reserveToken][tradedToken][duration];
        require(instance == address(0), "CommunityCoin: PAIR_ALREADY_EXISTS");
    }
        
    function _createInstance(
        address reserveToken, 
        address tradedToken, 
        uint64 duration, 
        uint64 reserveTokenClaimFraction, 
        uint64 tradedTokenClaimFraction, 
        uint64 lpClaimFraction,
        uint64 numerator,
        uint64 denominator
    ) internal returns (address instance) {

        instance = implementation.clone();
        
        getInstance[reserveToken][tradedToken][duration] = instance;
        
        _instanceIndexes[instance] = _instances.length;
        _instances.push(instance);

        _instanceCreators[instance] = msg.sender; // real sender or trusted forwarder need to store?
        _instanceInfos[instance] = InstanceInfo(
            reserveToken,
            duration, 
            tradedToken,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction,
            numerator,
            denominator,
            true
        );
        emit InstanceCreated(reserveToken, tradedToken, instance, _instances.length);
    }
}
