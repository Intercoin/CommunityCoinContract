// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

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
import "./interfaces/IStructs.sol";

//------------------------------------------------------------------------------
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/ICommunityStakingPoolFactory.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777Upgradeable.sol";

//------------------------------------------------------------------------------

// import "hardhat/console.sol";

contract CommunityStakingPoolFactory is Initializable, ICommunityStakingPoolFactory, IStructs {
    using ClonesUpgradeable for address;

    uint64 internal constant FRACTION = 10000; // fractions are expressed as portions of this

    mapping(address => mapping(uint256 => address)) public override getInstance;

    address public implementation;

    address public creator;

    address internal communityCoinFactory;

    address[] private _instances;
    InstanceType[] private _instanceTypes;
    InstanceType internal typeProducedByFactory;
    mapping(address => uint256) private _instanceIndexes;
    mapping(address => address) private _instanceCreators;

    mapping(address => InstanceInfo) public _instanceInfos;

    error InstanceCreationFailed();
    error ShouldBeFullDonations();
    error InvalidDonationAddress();
    error ZeroDuration();
    

    function initialize(address impl,address communityCoinFactory_) external initializer {
        
        implementation = impl;
        creator = msg.sender;
        communityCoinFactory = communityCoinFactory_;

        typeProducedByFactory = InstanceType.NONE;
    }

    function instancesByIndex(uint256 index) external view returns (address instance_) {
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
    function instancesCount() external view override returns (uint256 amount) {
        amount = _instances.length;
    }

    function getInstanceInfoByPoolAddress(address addr) external view returns (InstanceInfo memory) {
        return _instanceInfos[addr];
    }

    function getInstancesInfo() external view returns (InstanceInfo[] memory) {
        InstanceInfo[] memory ret = new InstanceInfo[](_instances.length);
        for (uint256 i = 0; i < _instances.length; i++) {
            ret[i] = _instanceInfos[_instances[i]];
        }
        return ret;
    }

    function getInstanceInfo(
        address reserveToken,
        uint64 duration
    ) public view returns (InstanceInfo memory) {
        address instance = getInstance[reserveToken][duration];
        return _instanceInfos[instance];
    }
    
    function produce(
        address reserveToken,
        address popularToken,
        IStructs.StructAddrUint256[] calldata donations,
        IStructs.StructGroup calldata structGroup,
        IStructs.FactorySettings calldata factorySettings,
        address uniswapRouter,
        address uniswapRouterFactory
    ) external returns (address instance) {
        require(msg.sender == creator);

        _createInstanceValidate(reserveToken, structGroup.duration, donations, factorySettings);

        address instanceCreated = _createInstance(
            reserveToken,
            popularToken,
            // duration,
            // bonusTokenFraction,
            // rewardsRateFraction,
            // numerator,
            // denominator
            structGroup
        );

        if (instanceCreated == address(0)) {
            revert InstanceCreationFailed();
        }

        // if (duration == 0) {
        //     IStakingTransferRules(instanceCreated).initialize(
        //         reserveToken,  tradedToken, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
        //     );
        // } else {
        ICommunityStakingPool(instanceCreated).initialize(
            creator,
            reserveToken,
            popularToken,
            donations,
            structGroup.rewardsRateFraction,
            uniswapRouter,
            uniswapRouterFactory,
            communityCoinFactory
        );
        // }

        //Ownable(instanceCreated).transferOwnership(_msgSender());
        instance = instanceCreated;
    }

    function _createInstanceValidate(
        address reserveToken,
        uint64 duration,
        IStructs.StructAddrUint256[] calldata donations,
        IStructs.FactorySettings calldata factorySettings
    ) internal view {
        if (duration == 0) {
            revert ZeroDuration();
        }
        address instance = getInstance[reserveToken][duration];
        require(instance == address(0), "CommunityCoin: PAIR_ALREADY_EXISTS");
        require(
            typeProducedByFactory == InstanceType.NONE || typeProducedByFactory == InstanceType.ERC20,
            "CommunityCoin: INVALID_INSTANCE_TYPE"
        );

        
        uint256 totalDonationsAmount = 0;
        for(uint256 i = 0; i < donations.length; i++) {

            //simple unsafe checking isContract 
            if (donations[i].account.code.length > 0) {
                revert InvalidDonationAddress();
            }

            totalDonationsAmount += donations[i].amount;
        }

        if (reserveToken != factorySettings.linkedContract) {
            if (totalDonationsAmount != FRACTION) {
                revert ShouldBeFullDonations();
            }
        }

    }

    function _createInstance(
        address reserveToken,
        address popularToken,
        // uint64 duration,
        // uint64 bonusTokenFraction,
        // uint64 rewardsRateFraction,
        // uint64 numerator,
        // uint64 denominator
        IStructs.StructGroup calldata structGroup
    ) internal returns (address instance) {
        instance = implementation.clone();

        getInstance[reserveToken][structGroup.duration] = instance;

        _instanceIndexes[instance] = _instances.length;
        _instances.push(instance);

        _instanceTypes.push(InstanceType.ERC20);

        _instanceCreators[instance] = msg.sender; // real sender or trusted forwarder need to store?
        _instanceInfos[instance] = InstanceInfo(
            reserveToken,
            structGroup.duration,
            true,
            structGroup.bonusTokenFraction,
            popularToken,
            structGroup.rewardsRateFraction,
            structGroup.numerator,
            structGroup.denominator
        );
        if (typeProducedByFactory == InstanceType.NONE) {
            typeProducedByFactory = InstanceType.ERC20;
        }
        emit InstanceCreated(reserveToken, instance, _instances.length);
    }
}
